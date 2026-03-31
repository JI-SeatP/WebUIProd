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

	<cfparam name="url.transac" default="0">
	<cfparam name="url.orderno" default="">
	<cfparam name="url.item" default="0">
	<cfparam name="url.label" default="">

	<cfset transacId = Val(url.transac)>
	<cfset snapshotLabel = url.label>

	<!--- Lookup TRSEQ by order number + item if transac not provided --->
	<cfif transacId EQ 0 AND Len(Trim(url.orderno)) GT 0>
		<cfquery name="qLookup" datasource="#datasourcePrimary#">
			SELECT TOP 1 TRSEQ FROM TRANSAC
			WHERE TRNO LIKE <cfqueryparam cfsqltype="CF_SQL_VARCHAR" value="#Trim(url.orderno)#%">
			AND TRITEM = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#Val(url.item)#">
		</cfquery>
		<cfif qLookup.RecordCount GT 0>
			<cfset transacId = Val(qLookup.TRSEQ)>
		</cfif>
	</cfif>

	<cfif transacId EQ 0>
		<cfset response["success"] = false>
		<cfset response["error"] = "transac or orderno+item parameter is required">
		<cfoutput>#SerializeJSON(response)#</cfoutput><cfabort>
	</cfif>

	<!--- Server timestamp --->
	<cfquery name="qTime" datasource="#datasourcePrimary#">
		SELECT FORMAT(GETDATE(), 'yyyy-MM-dd HH:mm:ss') AS ts
	</cfquery>

	<!--- 1. TRANSAC --->
	<cfquery name="qTransac" datasource="#datasourcePrimary#">
		SELECT TRSEQ, TRNO, TRITEM, TRSTATUTITEM, CONTENANT_CON_NUMERO, INVENTAIRE, ENTREPOT
		FROM TRANSAC
		WHERE TRSEQ = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#transacId#">
	</cfquery>

	<!--- 2. TEMPSPROD --->
	<cfquery name="qTempsProd" datasource="#datasourcePrimary#">
		SELECT TJSEQ, EMPLOYE, EMPLOYE_EMNO, EMPLOYE_EMNOM,
			MODEPROD_MPCODE, TJQTEPROD, TJQTEDEFECT,
			TJDEBUTDATE, TJFINDATE, TJPROD_TERMINE,
			CNOMENCOP, cNomencOp_Machine, INVENTAIRE_C, cNOMENCLATURE,
			ENTRERPRODFINI_PFNOTRANS, SMNOTRANS, TJNOTE,
			TJEMTAUXHOR, TJOPTAUXHOR, TJMATAUXHOR,
			TJSYSTEMPSHOMME, TJTEMPSHOMME,
			TJEMCOUT, TJOPCOUT, TJMACOUT
		FROM TEMPSPROD
		WHERE TRANSAC = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#transacId#">
		ORDER BY TJSEQ
	</cfquery>

	<!--- Build TJSEQ list for sub-queries --->
	<cfset tjseqList = "">
	<cfset epfTrnoList = "">
	<cfset smTrnoList = "">
	<cfloop query="qTempsProd">
		<cfif Len(tjseqList) GT 0><cfset tjseqList = tjseqList & ","></cfif>
		<cfset tjseqList = tjseqList & qTempsProd.TJSEQ>

		<cfif Len(Trim(qTempsProd.ENTRERPRODFINI_PFNOTRANS)) GT 0>
			<cfset thisTrno = "'" & Replace(Trim(qTempsProd.ENTRERPRODFINI_PFNOTRANS), "'", "''", "ALL") & "'">
			<cfif NOT ListFind(epfTrnoList, thisTrno)>
				<cfif Len(epfTrnoList) GT 0><cfset epfTrnoList = epfTrnoList & ","></cfif>
				<cfset epfTrnoList = epfTrnoList & thisTrno>
			</cfif>
		</cfif>

		<cfif Len(Trim(qTempsProd.SMNOTRANS)) GT 0>
			<cfset thisSm = "'" & Replace(Trim(qTempsProd.SMNOTRANS), "'", "''", "ALL") & "'">
			<cfif NOT ListFind(smTrnoList, thisSm)>
				<cfif Len(smTrnoList) GT 0><cfset smTrnoList = smTrnoList & ","></cfif>
				<cfset smTrnoList = smTrnoList & thisSm>
			</cfif>
		</cfif>
	</cfloop>

	<!--- 3. TEMPSPRODEX --->
	<cfset tpexRows = []>
	<cfif Len(tjseqList) GT 0>
		<cfquery name="qTempsProdEx" datasource="#datasourcePrimary#">
			SELECT TEMPSPROD, QA_CAUSEP, QA_CAUSES, EXTPRD_NOTE
			FROM TEMPSPRODEX
			WHERE TEMPSPROD IN (<cfqueryparam cfsqltype="CF_SQL_INTEGER" list="true" value="#tjseqList#">)
		</cfquery>
		<cfloop query="qTempsProdEx">
			<cfset row = StructNew("ordered")>
			<cfset row["TEMPSPROD"] = qTempsProdEx.TEMPSPROD>
			<cfset row["QA_CAUSEP"] = qTempsProdEx.QA_CAUSEP>
			<cfset row["QA_CAUSES"] = qTempsProdEx.QA_CAUSES>
			<cfset row["EXTPRD_NOTE"] = qTempsProdEx.EXTPRD_NOTE>
			<cfset ArrayAppend(tpexRows, row)>
		</cfloop>
	</cfif>

	<!--- 4. ENTRERPRODFINI (EPF headers) --->
	<cfset epfRows = []>
	<cfif Len(epfTrnoList) GT 0>
		<cfquery name="qEpf" datasource="#datasourcePrimary#">
			SELECT PFSEQ, PFNOTRANS, PFDATE, PFHEURE, PFNOTE, PFEMPLOYE
			FROM ENTRERPRODFINI
			WHERE PFNOTRANS IN (#PreserveSingleQuotes(epfTrnoList)#)
			ORDER BY PFSEQ
		</cfquery>
		<cfloop query="qEpf">
			<cfset row = StructNew("ordered")>
			<cfset row["PFSEQ"] = qEpf.PFSEQ>
			<cfset row["PFNOTRANS"] = Trim(qEpf.PFNOTRANS)>
			<cfset row["PFDATE"] = qEpf.PFDATE>
			<cfset row["PFHEURE"] = qEpf.PFHEURE>
			<cfset row["PFNOTE"] = qEpf.PFNOTE>
			<cfset row["PFEMPLOYE"] = qEpf.PFEMPLOYE>
			<cfset ArrayAppend(epfRows, row)>
		</cfloop>
	</cfif>

	<!--- 5. DET_TRANS for EPFs --->
	<cfset detTransEpfRows = []>
	<cfif Len(epfTrnoList) GT 0>
		<cfquery name="qDetEpf" datasource="#datasourcePrimary#">
			SELECT dt.DTRSEQ, dt.TRANSAC, dt.INVENTAIRE, dt.DTRQTE, dt.ENTREPOT,
				t.TRNO, t.TRSEQ
			FROM DET_TRANS dt
			INNER JOIN TRANSAC t ON dt.TRANSAC = t.TRSEQ
			WHERE t.TRNO IN (#PreserveSingleQuotes(epfTrnoList)#)
			ORDER BY dt.DTRSEQ
		</cfquery>
		<cfloop query="qDetEpf">
			<cfset row = StructNew("ordered")>
			<cfset row["DTRSEQ"] = qDetEpf.DTRSEQ>
			<cfset row["TRANSAC"] = qDetEpf.TRANSAC>
			<cfset row["TRNO"] = Trim(qDetEpf.TRNO)>
			<cfset row["INVENTAIRE"] = qDetEpf.INVENTAIRE>
			<cfset row["DTRQTE"] = qDetEpf.DTRQTE>
			<cfset row["ENTREPOT"] = qDetEpf.ENTREPOT>
			<cfset ArrayAppend(detTransEpfRows, row)>
		</cfloop>
	</cfif>

	<!--- 6. SORTIEMATERIEL --->
	<cfset smRows = []>
	<cfif Len(smTrnoList) GT 0>
		<cfquery name="qSm" datasource="#datasourcePrimary#">
			SELECT SMSEQ, SMNOTRANS, SMDATE, SMHEURE, SMNOTE, SMEMPLOYE
			FROM SORTIEMATERIEL
			WHERE SMNOTRANS IN (#PreserveSingleQuotes(smTrnoList)#)
			ORDER BY SMSEQ
		</cfquery>
		<cfloop query="qSm">
			<cfset row = StructNew("ordered")>
			<cfset row["SMSEQ"] = qSm.SMSEQ>
			<cfset row["SMNOTRANS"] = Trim(qSm.SMNOTRANS)>
			<cfset row["SMDATE"] = qSm.SMDATE>
			<cfset row["SMHEURE"] = qSm.SMHEURE>
			<cfset row["SMNOTE"] = qSm.SMNOTE>
			<cfset row["SMEMPLOYE"] = qSm.SMEMPLOYE>
			<cfset ArrayAppend(smRows, row)>
		</cfloop>
	</cfif>

	<!--- 7. DET_TRANS for SMs --->
	<cfset detTransSmRows = []>
	<cfif Len(smTrnoList) GT 0>
		<cfquery name="qDetSm" datasource="#datasourcePrimary#">
			SELECT dt.DTRSEQ, dt.TRANSAC, dt.INVENTAIRE, dt.DTRQTE, dt.ENTREPOT,
				t.TRNO, t.TRSEQ
			FROM DET_TRANS dt
			INNER JOIN TRANSAC t ON dt.TRANSAC = t.TRSEQ
			WHERE t.TRNO IN (#PreserveSingleQuotes(smTrnoList)#)
			ORDER BY dt.DTRSEQ
		</cfquery>
		<cfloop query="qDetSm">
			<cfset row = StructNew("ordered")>
			<cfset row["DTRSEQ"] = qDetSm.DTRSEQ>
			<cfset row["TRANSAC"] = qDetSm.TRANSAC>
			<cfset row["TRNO"] = Trim(qDetSm.TRNO)>
			<cfset row["INVENTAIRE"] = qDetSm.INVENTAIRE>
			<cfset row["DTRQTE"] = qDetSm.DTRQTE>
			<cfset row["ENTREPOT"] = qDetSm.ENTREPOT>
			<cfset ArrayAppend(detTransSmRows, row)>
		</cfloop>
	</cfif>

	<!--- 8. cNOMENCOP --->
	<cfquery name="qCnomencop" datasource="#datasourcePrimary#">
		SELECT NOPSEQ, INVENTAIRE_P, NOPQTETERMINE, NOPQTESCRAP, NOPQTERESTE
		FROM cNOMENCOP
		WHERE TRANSAC = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#transacId#">
		ORDER BY NOPSEQ
	</cfquery>

	<!--- 9. PL_RESULTAT --->
	<cfquery name="qNopseqList" datasource="#datasourcePrimary#">
		SELECT NOPSEQ FROM cNOMENCOP
		WHERE TRANSAC = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#transacId#">
	</cfquery>
	<cfset nopseqListStr = "">
	<cfloop query="qNopseqList">
		<cfif Len(nopseqListStr) GT 0><cfset nopseqListStr = nopseqListStr & ","></cfif>
		<cfset nopseqListStr = nopseqListStr & qNopseqList.NOPSEQ>
	</cfloop>

	<cfset plRows = []>
	<cfif Len(nopseqListStr) GT 0>
		<cfquery name="qPl" datasource="#datasourcePrimary#">
			SELECT CNOMENCOP, PR_DEBUTE, PR_TERMINE, MODEPROD
			FROM PL_RESULTAT
			WHERE CNOMENCOP IN (<cfqueryparam cfsqltype="CF_SQL_INTEGER" list="true" value="#nopseqListStr#">)
			ORDER BY CNOMENCOP
		</cfquery>
		<cfloop query="qPl">
			<cfset row = StructNew("ordered")>
			<cfset row["CNOMENCOP"] = qPl.CNOMENCOP>
			<cfset row["PR_DEBUTE"] = qPl.PR_DEBUTE>
			<cfset row["PR_TERMINE"] = qPl.PR_TERMINE>
			<cfset row["MODEPROD"] = qPl.MODEPROD>
			<cfset ArrayAppend(plRows, row)>
		</cfloop>
	</cfif>

	<!--- Build TEMPSPROD array --->
	<cfset tpRows = []>
	<cfloop query="qTempsProd">
		<cfset row = StructNew("ordered")>
		<cfset row["TJSEQ"] = qTempsProd.TJSEQ>
		<cfset row["EMPLOYE"] = qTempsProd.EMPLOYE>
		<cfset row["EMPLOYE_EMNO"] = qTempsProd.EMPLOYE_EMNO>
		<cfset row["EMPLOYE_EMNOM"] = qTempsProd.EMPLOYE_EMNOM>
		<cfset row["MODEPROD_MPCODE"] = Trim(qTempsProd.MODEPROD_MPCODE)>
		<cfset row["TJQTEPROD"] = qTempsProd.TJQTEPROD>
		<cfset row["TJQTEDEFECT"] = qTempsProd.TJQTEDEFECT>
		<cfset row["TJDEBUTDATE"] = qTempsProd.TJDEBUTDATE>
		<cfset row["TJFINDATE"] = qTempsProd.TJFINDATE>
		<cfset row["TJPROD_TERMINE"] = qTempsProd.TJPROD_TERMINE>
		<cfset row["CNOMENCOP"] = qTempsProd.CNOMENCOP>
		<cfset row["cNomencOp_Machine"] = qTempsProd.cNomencOp_Machine>
		<cfset row["INVENTAIRE_C"] = qTempsProd.INVENTAIRE_C>
		<cfset row["cNOMENCLATURE"] = qTempsProd.cNOMENCLATURE>
		<cfset row["ENTRERPRODFINI_PFNOTRANS"] = Trim(qTempsProd.ENTRERPRODFINI_PFNOTRANS)>
		<cfset row["SMNOTRANS"] = Trim(qTempsProd.SMNOTRANS)>
		<cfset row["TJNOTE"] = qTempsProd.TJNOTE>
		<cfset row["TJEMTAUXHOR"] = qTempsProd.TJEMTAUXHOR>
		<cfset row["TJOPTAUXHOR"] = qTempsProd.TJOPTAUXHOR>
		<cfset row["TJMATAUXHOR"] = qTempsProd.TJMATAUXHOR>
		<cfset row["TJSYSTEMPSHOMME"] = qTempsProd.TJSYSTEMPSHOMME>
		<cfset row["TJTEMPSHOMME"] = qTempsProd.TJTEMPSHOMME>
		<cfset row["TJEMCOUT"] = qTempsProd.TJEMCOUT>
		<cfset row["TJOPCOUT"] = qTempsProd.TJOPCOUT>
		<cfset row["TJMACOUT"] = qTempsProd.TJMACOUT>
		<cfset ArrayAppend(tpRows, row)>
	</cfloop>

	<!--- Build TRANSAC array --->
	<cfset trRows = []>
	<cfloop query="qTransac">
		<cfset row = StructNew("ordered")>
		<cfset row["TRSEQ"] = qTransac.TRSEQ>
		<cfset row["TRNO"] = Trim(qTransac.TRNO)>
		<cfset row["TRITEM"] = qTransac.TRITEM>
		<cfset row["TRSTATUTITEM"] = qTransac.TRSTATUTITEM>
		<cfset row["CONTENANT_CON_NUMERO"] = qTransac.CONTENANT_CON_NUMERO>
		<cfset row["INVENTAIRE"] = qTransac.INVENTAIRE>
		<cfset row["ENTREPOT"] = qTransac.ENTREPOT>
		<cfset ArrayAppend(trRows, row)>
	</cfloop>

	<!--- Build cNOMENCOP array --->
	<cfset cnRows = []>
	<cfloop query="qCnomencop">
		<cfset row = StructNew("ordered")>
		<cfset row["NOPSEQ"] = qCnomencop.NOPSEQ>
		<cfset row["INVENTAIRE_P"] = qCnomencop.INVENTAIRE_P>
		<cfset row["NOPQTETERMINE"] = qCnomencop.NOPQTETERMINE>
		<cfset row["NOPQTESCRAP"] = qCnomencop.NOPQTESCRAP>
		<cfset row["NOPQTERESTE"] = qCnomencop.NOPQTERESTE>
		<cfset ArrayAppend(cnRows, row)>
	</cfloop>

	<!--- Build tables object --->
	<cfset tables = StructNew("ordered")>

	<cfset tpObj = StructNew("ordered")>
	<cfset tpObj["count"] = ArrayLen(tpRows)>
	<cfset tpObj["rows"] = tpRows>
	<cfset tables["TEMPSPROD"] = tpObj>

	<cfset tpexObj = StructNew("ordered")>
	<cfset tpexObj["count"] = ArrayLen(tpexRows)>
	<cfset tpexObj["rows"] = tpexRows>
	<cfset tables["TEMPSPRODEX"] = tpexObj>

	<cfset epfObj = StructNew("ordered")>
	<cfset epfObj["count"] = ArrayLen(epfRows)>
	<cfset epfObj["rows"] = epfRows>
	<cfset tables["ENTRERPRODFINI"] = epfObj>

	<cfset detEpfObj = StructNew("ordered")>
	<cfset detEpfObj["count"] = ArrayLen(detTransEpfRows)>
	<cfset detEpfObj["rows"] = detTransEpfRows>
	<cfset tables["DET_TRANS_EPF"] = detEpfObj>

	<cfset smObj = StructNew("ordered")>
	<cfset smObj["count"] = ArrayLen(smRows)>
	<cfset smObj["rows"] = smRows>
	<cfset tables["SORTIEMATERIEL"] = smObj>

	<cfset detSmObj = StructNew("ordered")>
	<cfset detSmObj["count"] = ArrayLen(detTransSmRows)>
	<cfset detSmObj["rows"] = detTransSmRows>
	<cfset tables["DET_TRANS_SM"] = detSmObj>

	<cfset cnObj = StructNew("ordered")>
	<cfset cnObj["count"] = ArrayLen(cnRows)>
	<cfset cnObj["rows"] = cnRows>
	<cfset tables["cNOMENCOP"] = cnObj>

	<cfset plObj = StructNew("ordered")>
	<cfset plObj["count"] = ArrayLen(plRows)>
	<cfset plObj["rows"] = plRows>
	<cfset tables["PL_RESULTAT"] = plObj>

	<cfset trObj = StructNew("ordered")>
	<cfset trObj["count"] = ArrayLen(trRows)>
	<cfset trObj["rows"] = trRows>
	<cfset tables["TRANSAC"] = trObj>

	<!--- Build response --->
	<cfset data = StructNew("ordered")>
	<cfset data["label"] = snapshotLabel>
	<cfset data["timestamp"] = qTime.ts>
	<cfset data["transac"] = transacId>
	<cfset data["tables"] = tables>

	<cfset response["success"] = true>
	<cfset response["data"] = data>

	<cfcatch type="any">
		<cfset response = StructNew()>
		<cfset response["success"] = false>
		<cfset response["data"] = StructNew()>
		<cfset response["error"] = cfcatch.message & " " & cfcatch.detail>
	</cfcatch>
</cftry>

<cfoutput>#SerializeJSON(response)#</cfoutput>
</cfsilent>
