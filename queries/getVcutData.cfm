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
		<cfset dbPrimary = "AF_SEATPLY">
	<cfelse>
		<cfset datasourcePrimary = "TS_SEATPL">
		<cfset datasourceExt = "TS_SEATPL_EXT">
		<cfset dbPrimary = "TS_SEATPL">
	</cfif>

	<cfparam name="url.transac" default="0">

	<cfif Val(url.transac) EQ 0>
		<cfset response["success"] = false>
		<cfset response["error"] = "transac parameter is required">
		<cfoutput>#SerializeJSON(response)#</cfoutput><cfabort>
	</cfif>

	<cfset transacId = Val(url.transac)>

	<!--- Query A: VCUT Info (QTE_FORCEE, VCUT descriptions) --->
	<cfquery name="qVcutInfo" datasource="#datasourceExt#">
		SELECT TOP 1 v.QTE_FORCEE, v.VCUT_INNOINV, v.VCUT_INDESC1, v.VCUT_INDESC2
		FROM vEcransProduction v
		WHERE v.OPERATION <> 'FINSH'
		AND v.TRANSAC = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#transacId#">
		AND v.NO_INVENTAIRE = 'VCUT'
		ORDER BY v.OrdreRecette
	</cfquery>

	<!--- Query B: BigSheet total used --->
	<cfquery name="qBigSheetTotal" datasource="#datasourcePrimary#">
		SELECT SUM(det.DTRQTE) AS TotalBigSheet
		FROM DET_TRANS det
		INNER JOIN TRANSAC t ON det.TRANSAC = t.TRSEQ
		WHERE t.TRANSAC = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#transacId#">
		AND t.TRNO_EQUATE = 7
	</cfquery>

	<!--- Query C: BigSheet inventory info --->
	<cfquery name="qBigSheetInfo" datasource="#datasourcePrimary#">
		SELECT TOP 1 INVENTAIRE, INVENTAIRE_INNOINV, INVENTAIRE_INDESC1, INVENTAIRE_INDESC2
		FROM cNOMENCOP
		WHERE TRANSAC = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#transacId#">
		AND INVENTAIRE_P NOT IN (SELECT INSEQ FROM INVENTAIRE WHERE INNOINV='VCUT')
	</cfquery>

	<!--- Query D: VCUT Components (replicates trouveUnTableauVCut from operation.cfc:4487) --->
	<cfquery name="qComponents" datasource="#datasourcePrimary#">
		SELECT CNOMENCLATURE.NISEQ, CNOMENCLATURE.NIQTE, CNOMENCLATURE.INVENTAIRE_M,
			CNOMENCLATURE.INVENTAIRE_M_INNOINV, INVENTAIRE.INDESC1, INVENTAIRE.INDESC2,
			CNOMENCLATURE.NIVALEUR_CHAR1, CEILING(VENEER.QTY_REQ) AS QTY_REQ,
			CNOMENCLATURE.NILONGUEUR, CNOMENCLATURE.NILARGEUR
		FROM CNOMENCLATURE
		LEFT OUTER JOIN INVENTAIRE ON (INVENTAIRE.INSEQ = cNOMENCLATURE.INVENTAIRE_M)
		OUTER APPLY (
			SELECT (CN_FILS.NIQTE * CNOMENCLATURE.NIQTE) QTY_REQ
			FROM cNOMENCLATURE CN_FILS
			WHERE CN_FILS.NISEQ_PERE = CNOMENCLATURE.NISEQ
		) VENEER
		WHERE CNOMENCLATURE.TRANSAC = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#transacId#">
		AND CNOMENCLATURE.NISEQ_PERE IS NULL
	</cfquery>

	<!--- Build components array with per-component quantities --->
	<cfset components = []>
	<cfloop query="qComponents">
		<cfset comp = StructNew("ordered")>
		<cfset comp["NISEQ"] = qComponents.NISEQ>
		<cfset comp["NIQTE"] = qComponents.NIQTE>
		<cfset comp["INVENTAIRE_M"] = qComponents.INVENTAIRE_M>
		<cfset comp["INVENTAIRE_M_INNOINV"] = qComponents.INVENTAIRE_M_INNOINV>
		<cfset comp["INDESC1"] = qComponents.INDESC1>
		<cfset comp["INDESC2"] = qComponents.INDESC2>
		<cfset comp["NIVALEUR_CHAR1"] = qComponents.NIVALEUR_CHAR1>
		<cfset comp["QTY_REQ"] = Val(qComponents.QTY_REQ)>
		<cfset comp["NILONGUEUR"] = qComponents.NILONGUEUR>
		<cfset comp["NILARGEUR"] = qComponents.NILARGEUR>

		<!--- Per-component: good & defect qty from TEMPSPROD --->
		<cfquery name="qQteDefect" datasource="#datasourcePrimary#">
			SELECT SUM(TJQTEPROD) AS TOTALPROD, SUM(TJQTEDEFECT) AS TOTALDEFECT
			FROM TEMPSPROD
			WHERE TRANSAC = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#transacId#">
			AND (INVENTAIRE_C = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#Val(qComponents.INVENTAIRE_M)#">
			OR cNOMENCLATURE = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#Val(qComponents.NISEQ)#">)
		</cfquery>

		<!--- Per-component: big sheets used --->
		<cfquery name="qBigSheetComp" datasource="#datasourcePrimary#">
			SELECT SUM(det.DTRQTE) AS TotalBigSheet
			FROM DET_TRANS det
			INNER JOIN TRANSAC t ON det.TRANSAC = t.TRSEQ
			WHERE t.TRANSAC = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#transacId#">
			AND t.TRNO_EQUATE = 7
			AND det.TRANSAC_TRNO IN (
				SELECT SMNOTRANS FROM TEMPSPROD
				WHERE cNOMENCLATURE = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#Val(qComponents.NISEQ)#">
			)
		</cfquery>

		<cfset comp["totalProd"] = Val(qQteDefect.TOTALPROD)>
		<cfset comp["totalDefect"] = Val(qQteDefect.TOTALDEFECT)>
		<cfset comp["totalBigSheet"] = Val(qBigSheetComp.TotalBigSheet)>
		<cfset ArrayAppend(components, comp)>
	</cfloop>

	<!--- Query E: Veneer Containers (replicates trouveContenantsVCut from tableau.cfc:45) --->
	<cfquery name="qContainers" datasource="#datasourceExt#">
		SELECT v.TRANSAC, v.INVENTAIRE_INNOINV, v.CONTENANT_CON_NUMERO, v.DTRQTE,
			v.ENTREPOT, v.ENTREPOT_ENCODE, v.UNITE, v.UNITE_UNCODE,
			v.SPECIE, v.GRADE, v.THICKNESS, v.CUT, v.MARQUE, v.CODE, v.COULEUR,
			v.LONGUEUR, v.LARGEUR,
			e.ENDESC_P, e.ENDESC_S
		FROM VSP_BonTravail_VeneerReserve v
		LEFT OUTER JOIN #dbPrimary#.dbo.ENTREPOT e ON v.ENTREPOT = e.ENSEQ
		WHERE v.TRANSAC = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#transacId#">
	</cfquery>

	<cfset containers = []>
	<cfloop query="qContainers">
		<cfset cont = StructNew("ordered")>
		<cfset cont["CONTENANT_CON_NUMERO"] = qContainers.CONTENANT_CON_NUMERO>
		<cfset cont["DTRQTE"] = qContainers.DTRQTE>
		<cfset cont["ENTREPOT_ENCODE"] = qContainers.ENTREPOT_ENCODE>
		<cfset cont["ENDESC_P"] = qContainers.ENDESC_P>
		<cfset cont["ENDESC_S"] = qContainers.ENDESC_S>
		<cfset cont["SPECIE"] = qContainers.SPECIE>
		<cfset cont["GRADE"] = qContainers.GRADE>
		<cfset cont["THICKNESS"] = qContainers.THICKNESS>
		<cfset cont["CUT"] = qContainers.CUT>
		<cfset cont["LONGUEUR"] = qContainers.LONGUEUR>
		<cfset cont["LARGEUR"] = qContainers.LARGEUR>
		<cfset ArrayAppend(containers, cont)>
	</cfloop>

	<!--- Build response --->
	<cfset data = StructNew("ordered")>
	<cfset data["components"] = components>
	<cfset data["containers"] = containers>
	<cfset data["qteForcee"] = Val(qVcutInfo.QTE_FORCEE)>
	<cfset data["qteUtilisee"] = Val(qBigSheetTotal.TotalBigSheet)>
	<cfif qBigSheetInfo.RecordCount GT 0>
		<cfset data["bigsheetDesc_P"] = qBigSheetInfo.INVENTAIRE_INDESC1>
		<cfset data["bigsheetDesc_S"] = qBigSheetInfo.INVENTAIRE_INDESC2>
		<cfset data["bigsheetCode"] = qBigSheetInfo.INVENTAIRE_INNOINV>
	<cfelse>
		<cfset data["bigsheetDesc_P"] = "">
		<cfset data["bigsheetDesc_S"] = "">
		<cfset data["bigsheetCode"] = "">
	</cfif>
	<cfif qVcutInfo.RecordCount GT 0>
		<cfset data["vcutDesc_P"] = qVcutInfo.VCUT_INDESC1>
		<cfset data["vcutDesc_S"] = qVcutInfo.VCUT_INDESC2>
	<cfelse>
		<cfset data["vcutDesc_P"] = "">
		<cfset data["vcutDesc_S"] = "">
	</cfif>

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
