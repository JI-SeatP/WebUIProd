<cfsilent>
<cfsetting enablecfoutputonly="true" showdebugoutput="false">
<cfcontent type="application/json">
<cfheader name="Access-Control-Allow-Origin" value="*">
<cfheader name="Access-Control-Allow-Methods" value="POST,OPTIONS">
<cfheader name="Access-Control-Allow-Headers" value="Content-Type">

<cfif cgi.REQUEST_METHOD EQ "OPTIONS">
	<cfoutput>{}</cfoutput><cfabort>
</cfif>

<!---
	EXACT replica of legacy QteDefect.cfc -> AjouteModifieDetailDEFECTQS (lines 743-847).
	Upserts DET_DEFECT (by DDSEQ when passed), recalcs TEMPSPROD.TJQTEDEFECT.
	NOTE: the legacy ADD path does NOT write SORTIEMATERIEL.SMQTEPRODUIT - the client
	re-runs the SM recalc (ajouteSM.cfm) afterwards and Nba_Sp_Sortie_Materiel syncs totals.
--->
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

	<!--- Parse JSON body --->
	<cfset requestBody = DeserializeJSON(GetHttpRequestData().content)>
	<cfset transac = Val(requestBody["transac"])>
	<cfset nopseq = Val(requestBody["nopseq"])>
	<cfset dQty = 0>
	<cfif StructKeyExists(requestBody, "qty")><cfset dQty = Val(requestBody["qty"])></cfif>
	<cfset raison = 0>
	<cfif StructKeyExists(requestBody, "typeId")><cfset raison = Val(requestBody["typeId"])></cfif>
	<cfset ddnote = "">
	<cfif StructKeyExists(requestBody, "notes")><cfset ddnote = requestBody["notes"]></cfif>
	<cfset ddseqArg = 0>
	<cfif StructKeyExists(requestBody, "ddseq")><cfset ddseqArg = Val(requestBody["ddseq"])></cfif>

	<!--- Upsert check: does the passed DDSEQ already exist? (old :757-761) --->
	<cfquery name="trouveDETDEFECT" datasource="#datasourcePrimary#">
		SELECT TEMPSPROD
		FROM DET_DEFECT
		WHERE DDSEQ = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#ddseqArg#">
	</cfquery>

	<!--- Target row: MODEPROD = 1 + TJNOTE filter, fallback without TJNOTE (old :761-779) --->
	<cfquery name="trouveTEMPSPRODSUIVANT" datasource="#datasourcePrimary#">
		SELECT TOP 1 TJSEQ
		FROM TEMPSPROD
		WHERE TRANSAC = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#transac#">
		AND CNOMENCOP = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#nopseq#">
		AND MODEPROD = 1
		AND TJNOTE LIKE 'Ecran de production pour Temps prod%'
		ORDER BY TJSEQ DESC
	</cfquery>
	<cfif trouveTEMPSPRODSUIVANT.RecordCount EQ 0>
		<cfquery name="trouveTEMPSPRODSUIVANT" datasource="#datasourcePrimary#">
			SELECT TOP 1 TJSEQ
			FROM TEMPSPROD
			WHERE TRANSAC = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#transac#">
			AND CNOMENCOP = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#nopseq#">
			AND MODEPROD = 1
			ORDER BY TJSEQ DESC
		</cfquery>
	</cfif>
	<cfif trouveTEMPSPRODSUIVANT.RecordCount EQ 0>
		<cfset response["success"] = false>
		<cfset response["error"] = "No PROD row">
		<cfoutput>#SerializeJSON(response)#</cfoutput>
		<cfabort>
	</cfif>
	<cfset LeTJSEQ = Val(trouveTEMPSPRODSUIVANT.TJSEQ)>

	<!--- INVENTAIRE/MACHINE/EMPLOYE + cost basis from the target row (old :783-794) --->
	<cfquery name="trouveTEMPSPROD" datasource="#datasourcePrimary#">
		SELECT T.TRSEQ, T.TRNO, T.TRITEM, T.INVENTAIRE, T.ENTREPOT, T.TRFACTEURCONV, T.TRNOORIGINE,
			TP.TJEMCOUT+TP.TJOPCOUT+TP.TJMACOUT AS CoutOperation, TP.TJQTEPROD, TP.EMPLOYE, TP.MACHINE
		FROM TEMPSPROD TP
		INNER JOIN TRANSAC T ON TP.TRANSAC = T.TRSEQ
		WHERE TP.TJSEQ = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#LeTJSEQ#">
	</cfquery>

	<!--- Material cost (old :796-801) --->
	<cfquery name="trouveCoutMatiere" datasource="#datasourcePrimary#">
		SELECT SUM(0-TRCOUTTRANS) AS LeCoutMatiere
		FROM TRANSAC
		WHERE TRSEQ = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#transac#">
	</cfquery>
	<cfset LaValeurEstimeeTotale = Val(trouveTEMPSPROD.CoutOperation) + Val(trouveCoutMatiere.LeCoutMatiere)>
	<cfif Val(trouveTEMPSPROD.TJQTEPROD) NEQ 0>
		<cfset LaValeurEstimeeUnitaire = LaValeurEstimeeTotale / trouveTEMPSPROD.TJQTEPROD>
	<cfelse>
		<cfset LaValeurEstimeeUnitaire = 0>
	</cfif>

	<cfset LeDDSEQ = ddseqArg>
	<cfif trouveDETDEFECT.RecordCount EQ 0>
		<!--- INSERT whenever Qte <> 0 - RAISON may legitimately be 0 (old :800-820) --->
		<cfif dQty NEQ 0>
			<cfquery name="qInsert" datasource="#datasourcePrimary#" result="insertResult">
				INSERT INTO DET_DEFECT (TRANSAC, INVENTAIRE, MACHINE, EMPLOYE, DDQTEUNINV, DDDATE, RAISON, DDNOTE, DDVALEUR_ESTIME_UNITAIRE,
					DDVALEUR_ESTIME_TOTALE, TEMPSPROD, TRANSAC_PERE)
				VALUES (
					<cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#transac#">,
					<cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#Val(trouveTEMPSPROD.INVENTAIRE)#">,
					<cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#Val(trouveTEMPSPROD.MACHINE)#">,
					<cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#Val(trouveTEMPSPROD.EMPLOYE)#">,
					<cfqueryparam cfsqltype="CF_SQL_FLOAT" value="#dQty#">,
					<cfqueryparam cfsqltype="CF_SQL_TIMESTAMP" value="#CreateODBCDateTime(Now())#">,
					<cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#raison#">,
					<cfqueryparam cfsqltype="CF_SQL_VARCHAR" maxlength="1000" value="#Left(ddnote, 1000)#">,
					<cfqueryparam cfsqltype="CF_SQL_FLOAT" value="#Val(LaValeurEstimeeUnitaire)#">,
					<cfqueryparam cfsqltype="CF_SQL_FLOAT" value="#Val(LaValeurEstimeeTotale)#">,
					<cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#LeTJSEQ#">,
					<cfqueryparam cfsqltype="CF_SQL_INTEGER" value="0">
				)
			</cfquery>
			<cfif StructKeyExists(insertResult, "IDENTITYCOL")>
				<cfset LeDDSEQ = Val(insertResult.IDENTITYCOL)>
			</cfif>
		</cfif>
	<cfelse>
		<!--- UPDATE branch - upsert by DDSEQ (old :822-833) --->
		<cfquery datasource="#datasourcePrimary#">
			UPDATE DET_DEFECT
			SET DDQTEUNINV = <cfqueryparam cfsqltype="CF_SQL_FLOAT" value="#dQty#">,
				RAISON = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#raison#">,
				DDNOTE = <cfqueryparam cfsqltype="CF_SQL_VARCHAR" maxlength="1000" value="#Left(ddnote, 1000)#">,
				DDDATE = <cfqueryparam cfsqltype="CF_SQL_TIMESTAMP" value="#CreateODBCDateTime(Now())#">,
				DDVALEUR_ESTIME_UNITAIRE = <cfqueryparam cfsqltype="CF_SQL_FLOAT" value="#Val(LaValeurEstimeeUnitaire)#">,
				DDVALEUR_ESTIME_TOTALE = <cfqueryparam cfsqltype="CF_SQL_FLOAT" value="#Val(LaValeurEstimeeTotale)#">
			WHERE DDSEQ = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#ddseqArg#">
		</cfquery>
	</cfif>

	<!--- Recalculate total defect qty on the target row (old :835-845) --->
	<cfquery name="trouveTotal" datasource="#datasourcePrimary#">
		SELECT SUM(DDQTEUNINV) AS Total
		FROM DET_DEFECT
		WHERE TEMPSPROD = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#LeTJSEQ#">
	</cfquery>
	<cfquery datasource="#datasourcePrimary#">
		UPDATE TEMPSPROD
		SET TJQTEDEFECT = <cfqueryparam cfsqltype="CF_SQL_FLOAT" value="#Val(trouveTotal.Total)#">
		WHERE TJSEQ = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#LeTJSEQ#">
	</cfquery>

	<!--- Read SMNOTRANS for the response only - NO SORTIEMATERIEL write here (legacy parity) --->
	<cfquery name="qSmno" datasource="#datasourcePrimary#">
		SELECT SMNOTRANS FROM TEMPSPROD
		WHERE TJSEQ = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#LeTJSEQ#">
	</cfquery>

	<!--- Fetch all defects for this TJSEQ to return to frontend --->
	<cfquery name="qDefects" datasource="#datasourcePrimary#">
		SELECT DD.DDSEQ, DD.DDQTEUNINV AS qty, DD.RAISON AS typeId, DD.DDNOTE AS notes,
			R.RRDESC_P AS type_P, R.RRDESC_S AS type_S
		FROM DET_DEFECT DD
		LEFT JOIN RAISON R ON DD.RAISON = R.RRSEQ
		WHERE DD.TEMPSPROD = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#LeTJSEQ#">
		ORDER BY DD.DDSEQ
	</cfquery>

	<cfset defectsArray = ArrayNew(1)>
	<cfloop query="qDefects">
		<cfset d = StructNew("ordered")>
		<cfset d["DDSEQ"] = qDefects.DDSEQ>
		<cfset d["qty"] = qDefects.qty>
		<cfset d["typeId"] = qDefects.typeId>
		<cfset d["notes"] = qDefects.notes>
		<cfset d["type_P"] = qDefects.type_P>
		<cfset d["type_S"] = qDefects.type_S>
		<cfset ArrayAppend(defectsArray, d)>
	</cfloop>

	<cfset data = StructNew("ordered")>
	<cfset data["ddseq"] = LeDDSEQ>
	<cfset data["tjseq"] = LeTJSEQ>
	<cfset data["totalDefect"] = Val(trouveTotal.Total)>
	<cfset data["smnotrans"] = Trim(qSmno.SMNOTRANS)>
	<cfset data["defects"] = defectsArray>

	<cfset response["success"] = true>
	<cfset response["data"] = data>
	<cfset response["message"] = "Defect recorded">

	<cfcatch type="any">
		<cfset response = StructNew()>
		<cfset response["success"] = false>
		<cfset response["data"] = StructNew()>
		<cfset response["error"] = cfcatch.message & " " & cfcatch.detail>
	</cfcatch>
</cftry>

<cfoutput>#SerializeJSON(response)#</cfoutput>
</cfsilent>
