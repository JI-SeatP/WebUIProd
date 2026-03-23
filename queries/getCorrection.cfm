<cfsilent>
<cfsetting enablecfoutputonly="true" showdebugoutput="false">
<cfcontent type="application/json">
<cfheader name="Access-Control-Allow-Origin" value="*">
<cfheader name="Access-Control-Allow-Methods" value="GET,OPTIONS">
<cfheader name="Access-Control-Allow-Headers" value="Content-Type">

<cfif cgi.REQUEST_METHOD EQ "OPTIONS">
	<cfoutput>{}</cfoutput><cfabort>
</cfif>

<cftry>
	<cfset response = StructNew()>

	<!--- Set datasources based on environment --->
	<cfset isProduction = (GetEnvironmentVariable("CF_ENVIRONMENT", "test") EQ "production")>
	<cfif isProduction>
		<cfset datasourcePrimary = "AF_SEATPLY">
		<cfset datasourceExt = "AF_SEATPLY_EXT">
	<cfelse>
		<cfset datasourcePrimary = "TS_SEATPL">
		<cfset datasourceExt = "TS_SEATPL_EXT">
	</cfif>

	<!--- Required parameter --->
	<cfparam name="url.tjseq" default="0">

	<cfif Val(url.tjseq) EQ 0>
		<cfset response["success"] = false>
		<cfset response["error"] = "tjseq parameter is required">
		<cfoutput>#SerializeJSON(response)#</cfoutput>
		<cfabort>
	</cfif>

	<!--- 1. Get current TEMPSPROD row with all needed joins --->
	<cfquery name="qTempsProd" datasource="#datasourcePrimary#">
		SELECT TP.TJSEQ, TP.TRANSAC, TP.CNOMENCOP, TP.CNOMENCLATURE, TP.INVENTAIRE_C,
			TP.SMNOTRANS, TP.ENTRERPRODFINI_PFNOTRANS,
			TP.MODEPROD, TP.MODEPROD_MPCODE, TP.MODEPROD_MPDESC_P, TP.MODEPROD_MPDESC_S,
			TP.TJDEBUTDATE, TP.TJFINDATE, TP.TJDUREE,
			TP.TJQTEPROD, TP.TJQTEDEFECT,
			TP.EMPLOYE, TP.EMPLOYE_EMNO, TP.OPERATION, TP.MACHINE,
			TP.TRANSAC_TRNO, TP.TRANSAC_TRITEM,
			TP.INVENTAIRE_INDESC1, TP.INVENTAIRE_INDESC2,
			DBO.FctFormatNoProd(TP.TRANSAC_TRNO, TP.TRANSAC_TRITEM) AS NO_PROD,
			T.INVENTAIRE_INNOINV,
			E.EMNOM, E.EMNO AS EMNOIDENT,
			M.MASEQ, M.MACODE, M.MADESC_P AS MACHINE_P, M.MADESC_S AS MACHINE_S,
			M.FAMILLEMACHINE,
			FM.FMCODE,
			OP.OPSEQ, OP.OPCODE, OP.OPDESC_P AS OPERATION_P, OP.OPDESC_S AS OPERATION_S,
			CO.CLIENT_CLNOM AS NOM_CLIENT,
			CNOP.INVENTAIRE_P_INNOINV AS PRODUIT_CODE,
			CNOP.INVENTAIRE_P_INDESC1 AS PRODUIT_P,
			CNOP.INVENTAIRE_P_INDESC2 AS PRODUIT_S,
			CNOP.NOPSEQ,
			CASE WHEN CNOP.INVENTAIRE_P_INNOINV = 'VCUT' OR T.INVENTAIRE_INNOINV = 'VCUT' THEN 1 ELSE 0 END AS EST_VCUT
		FROM TEMPSPROD TP
		INNER JOIN TRANSAC T ON TP.TRANSAC = T.TRSEQ
		INNER JOIN COMMANDE CO ON T.TRNO = CO.CONOTRANS
		LEFT OUTER JOIN EMPLOYE E ON TP.EMPLOYE = E.EMSEQ
		LEFT OUTER JOIN MACHINE M ON TP.MACHINE = M.MASEQ
		LEFT OUTER JOIN FAMILLEMACHINE FM ON M.FAMILLEMACHINE = FM.FMSEQ
		LEFT OUTER JOIN OPERATION OP ON TP.OPERATION = OP.OPSEQ
		LEFT OUTER JOIN CNOMENCOP CNOP ON CNOP.NOPSEQ = TP.CNOMENCOP AND CNOP.TRANSAC = TP.TRANSAC
		WHERE TP.TJSEQ = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#Val(url.tjseq)#">
	</cfquery>

	<cfif qTempsProd.RecordCount EQ 0>
		<cfset response["success"] = false>
		<cfset response["error"] = "TEMPSPROD not found for TJSEQ=#url.tjseq#">
		<cfoutput>#SerializeJSON(response)#</cfoutput>
		<cfabort>
	</cfif>

	<!--- Check ENTREPF from CNOMENCOP operation --->
	<cfquery name="qEntrepf" datasource="#datasourcePrimary#">
		SELECT ISNULL(CNOP.ENTREPF, 0) AS ENTREPF
		FROM CNOMENCOP CNOP
		WHERE CNOP.NOPSEQ = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#Val(qTempsProd.CNOMENCOP)#">
	</cfquery>
	<cfset theENTREPF = 0>
	<cfif qEntrepf.RecordCount GT 0>
		<cfset theENTREPF = Val(qEntrepf.ENTREPF)>
	</cfif>

	<!--- 2. Get defects from DET_DEFECT --->
	<cfquery name="qDefects" datasource="#datasourcePrimary#">
		SELECT DD.DDSEQ, DD.DDQTEUNINV, DD.RAISON, DD.DDNOTE,
			R.RRSEQ, R.RRDESC_P, R.RRDESC_S
		FROM DET_DEFECT DD
		LEFT OUTER JOIN RAISON R ON DD.RAISON = R.RRSEQ
		WHERE DD.TEMPSPROD = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#Val(url.tjseq)#">
		AND DD.DDQTEUNINV <> 0
		ORDER BY DD.DDSEQ
	</cfquery>

	<!--- 3. Get finished products from DET_TRANS via ENTRERPRODFINI_PFNOTRANS
	      Exact query from CorrectionInventaire.cfc lines 72-81 --->
	<cfquery name="qFinishedProducts" datasource="#datasourcePrimary#">
		SELECT DT.DTRSEQ, DT.TRANSAC_TRNO, DT.CONTENANT_CON_NUMERO, DT.DTRQTE,
			T2.INVENTAIRE_INNOINV,
			ABS(DETTRANS.DTRQTE_TRANSACTION) AS QTECORRIGEE
		FROM DET_TRANS DT
		INNER JOIN TRANSAC T2 ON DT.TRANSAC = T2.TRSEQ
		INNER JOIN TEMPSPROD TP ON T2.TRNO = TP.ENTRERPRODFINI_PFNOTRANS
		OUTER APPLY (
			SELECT DT.DTRQTE_INV + ISNULL((
				SELECT SUM(DTCOR.DTRQTE_INV) QTE
				FROM DET_TRANS DTCOR
				INNER JOIN TRANSAC TR ON (TR.TRSEQ = DTCOR.TRANSAC AND TR.TRPOSTER = 1)
				WHERE DTCOR.DTRSEQ_PERE = DT.DTRSEQ AND DTCOR.TRANSAC_TRNO_EQUATE = 14
			), 0) DTRQTE_TRANSACTION
		) DETTRANS
		WHERE TP.TJSEQ = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#Val(url.tjseq)#">
	</cfquery>

	<!--- 4. Get material output from DET_TRANS via SMNOTRANS
	      Exact query from CorrectionInventaire.cfc lines 291-298 --->
	<cfquery name="qMaterials" datasource="#datasourcePrimary#">
		SELECT DT.DTRSEQ, DT.DTRQTE,
			T2.INVENTAIRE_INNOINV, T2.INVENTAIRE_INDESC1, T2.INVENTAIRE_INDESC2,
			T2.UNITE_INV_UNDESC1, T2.UNITE_INV_UNDESC2,
			DT.ENTREPOT_ENCODE, DT.ENTREPOT_ENDESC_P, DT.ENTREPOT_ENDESC_S
		FROM TEMPSPROD TP
		INNER JOIN DET_TRANS DT ON DT.TRANSAC_TRNO = TP.SMNOTRANS
		INNER JOIN TRANSAC T2 ON DT.TRANSAC = T2.TRSEQ
		WHERE TP.TJSEQ = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#Val(url.tjseq)#">
	</cfquery>

	<!--- 5. Get available operations for dropdown --->
	<cfquery name="qOperations" datasource="#datasourcePrimary#">
		SELECT OPSEQ, OPCODE, OPDESC_P, OPDESC_S, FAMILLEMACHINE
		FROM OPERATION
	</cfquery>

	<!--- 6. Get available machines for dropdown (filtered by family if available) --->
	<cfquery name="qMachines" datasource="#datasourcePrimary#">
		SELECT MASEQ, MACODE, MADESC_P, MADESC_S
		FROM MACHINE
		<cfif Val(qTempsProd.FAMILLEMACHINE) NEQ 0>
			WHERE FAMILLEMACHINE = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#Val(qTempsProd.FAMILLEMACHINE)#">
		</cfif>
	</cfquery>

	<!--- Build JSON response --->
	<cfset data = StructNew("ordered")>
	<cfset data["TJSEQ"] = Val(qTempsProd.TJSEQ)>
	<cfset data["TRANSAC"] = Val(qTempsProd.TRANSAC)>
	<cfset data["NO_PROD"] = qTempsProd.NO_PROD>
	<cfset data["NOM_CLIENT"] = qTempsProd.NOM_CLIENT>
	<cfset data["PRODUIT_P"] = qTempsProd.PRODUIT_P>
	<cfset data["PRODUIT_S"] = qTempsProd.PRODUIT_S>
	<cfset data["TJDEBUT"] = DateFormat(qTempsProd.TJDEBUTDATE, "yyyy-mm-dd") & "T" & TimeFormat(qTempsProd.TJDEBUTDATE, "HH:nn")>
	<cfset data["TJFIN"] = "">
	<cfif IsDate(qTempsProd.TJFINDATE)>
		<cfset data["TJFIN"] = DateFormat(qTempsProd.TJFINDATE, "yyyy-mm-dd") & "T" & TimeFormat(qTempsProd.TJFINDATE, "HH:nn")>
	</cfif>
	<cfset data["TJDUREE"] = Val(qTempsProd.TJDUREE)>
	<cfset data["EMNOM"] = qTempsProd.EMNOM>
	<cfset data["EMNOIDENT"] = Val(qTempsProd.EMNOIDENT)>
	<cfset data["MACODE"] = qTempsProd.MACODE>
	<cfset data["MACHINE_P"] = qTempsProd.MACHINE_P>
	<cfset data["MACHINE_S"] = qTempsProd.MACHINE_S>
	<cfset data["DECODE"] = qTempsProd.FMCODE>
	<cfset data["OPERATION_P"] = qTempsProd.OPERATION_P>
	<cfset data["OPERATION_S"] = qTempsProd.OPERATION_S>
	<cfset data["MODEPROD_MPCODE"] = qTempsProd.MODEPROD_MPCODE>
	<cfset data["MODEPROD"] = Val(qTempsProd.MODEPROD)>
	<cfset data["ENTREPF"] = theENTREPF>
	<cfset data["QTE_BONNE"] = Val(qTempsProd.TJQTEPROD)>
	<cfset data["QTE_DEFAUT"] = Val(qTempsProd.TJQTEDEFECT)>

	<!--- Fields needed for backend submit --->
	<cfset data["CNOMENCOP"] = Val(qTempsProd.CNOMENCOP)>
	<cfset data["CNOMENCLATURE"] = Val(qTempsProd.CNOMENCLATURE)>
	<cfset data["INVENTAIRE_C"] = Val(qTempsProd.INVENTAIRE_C)>
	<cfset data["SMNOTRANS"] = qTempsProd.SMNOTRANS>
	<cfset data["EMPLOYE_EMNO"] = qTempsProd.EMPLOYE_EMNO>
	<cfset data["OPERATION_SEQ"] = Val(qTempsProd.OPSEQ)>
	<cfset data["MACHINE_SEQ"] = Val(qTempsProd.MASEQ)>
	<cfset data["FMCODE"] = qTempsProd.FMCODE>
	<cfset data["EST_VCUT"] = Val(qTempsProd.EST_VCUT)>

	<!--- Defects --->
	<cfset defectsArr = []>
	<cfloop query="qDefects">
		<cfset d = StructNew("ordered")>
		<cfset d["id"] = Val(qDefects.DDSEQ)>
		<cfset d["typeId"] = Val(qDefects.RRSEQ)>
		<cfset d["type_P"] = qDefects.RRDESC_P>
		<cfset d["type_S"] = qDefects.RRDESC_S>
		<cfset d["originalQty"] = Val(qDefects.DDQTEUNINV)>
		<cfset d["correctedQty"] = Val(qDefects.DDQTEUNINV)>
		<cfset ArrayAppend(defectsArr, d)>
	</cfloop>
	<cfset data["defects"] = defectsArr>

	<!--- Finished products --->
	<cfset fpArr = []>
	<cfloop query="qFinishedProducts">
		<cfset fp = StructNew("ordered")>
		<cfset fp["id"] = Val(qFinishedProducts.DTRSEQ)>
		<cfset fp["product"] = qFinishedProducts.INVENTAIRE_INNOINV>
		<cfset fp["container"] = qFinishedProducts.CONTENANT_CON_NUMERO>
		<cfset fp["originalQty"] = Val(qFinishedProducts.DTRQTE)>
		<cfset fp["correctedQty"] = Val(qFinishedProducts.QTECORRIGEE)>
		<cfset ArrayAppend(fpArr, fp)>
	</cfloop>
	<cfset data["finishedProducts"] = fpArr>

	<!--- Materials --->
	<cfset matArr = []>
	<cfloop query="qMaterials">
		<cfset mat = StructNew("ordered")>
		<cfset mat["id"] = Val(qMaterials.DTRSEQ)>
		<cfset mat["code"] = qMaterials.INVENTAIRE_INNOINV>
		<cfset mat["description_P"] = qMaterials.INVENTAIRE_INDESC1>
		<cfset mat["description_S"] = qMaterials.INVENTAIRE_INDESC2>
		<cfset mat["unit_P"] = qMaterials.UNITE_INV_UNDESC1>
		<cfset mat["unit_S"] = qMaterials.UNITE_INV_UNDESC2>
		<cfset mat["warehouse"] = qMaterials.ENTREPOT_ENCODE>
		<cfset mat["warehouse_P"] = qMaterials.ENTREPOT_ENDESC_P>
		<cfset mat["warehouse_S"] = qMaterials.ENTREPOT_ENDESC_S>
		<cfset mat["originalQty"] = Val(qMaterials.DTRQTE)>
		<cfset mat["correctedQty"] = Val(qMaterials.DTRQTE)>
		<cfset ArrayAppend(matArr, mat)>
	</cfloop>
	<cfset data["materials"] = matArr>

	<!--- Operations list for dropdown --->
	<cfset opsArr = []>
	<cfloop query="qOperations">
		<cfset op = StructNew("ordered")>
		<cfset op["OPSEQ"] = Val(qOperations.OPSEQ)>
		<cfset op["OPCODE"] = qOperations.OPCODE>
		<cfset op["OPDESC_P"] = qOperations.OPDESC_P>
		<cfset op["OPDESC_S"] = qOperations.OPDESC_S>
		<cfset ArrayAppend(opsArr, op)>
	</cfloop>
	<cfset data["operations"] = opsArr>

	<!--- Machines list for dropdown --->
	<cfset machArr = []>
	<cfloop query="qMachines">
		<cfset ma = StructNew("ordered")>
		<cfset ma["MASEQ"] = Val(qMachines.MASEQ)>
		<cfset ma["MACODE"] = qMachines.MACODE>
		<cfset ma["MADESC_P"] = qMachines.MADESC_P>
		<cfset ma["MADESC_S"] = qMachines.MADESC_S>
		<cfset ArrayAppend(machArr, ma)>
	</cfloop>
	<cfset data["machines"] = machArr>

	<cfset response["success"] = true>
	<cfset response["data"] = data>
	<cfset response["message"] = "Correction data retrieved">

	<cfcatch type="any">
		<cfset response = StructNew()>
		<cfset response["success"] = false>
		<cfset response["data"] = StructNew()>
		<cfset response["error"] = cfcatch.message & " " & cfcatch.detail>
	</cfcatch>
</cftry>

<cfoutput>#SerializeJSON(response)#</cfoutput>
</cfsilent>
