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
	EXACT replica of legacy QteDefect.cfc -> retireDetailDEFECTQS (lines 569-612).
	Deletes the DET_DEFECT row, recalcs TEMPSPROD.TJQTEDEFECT, and (unlike ADD)
	syncs SORTIEMATERIEL.SMQTEPRODUIT = TJQTEPROD + TJQTEDEFECT when the row has an SM.
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
	<cfset ddseq = Val(requestBody["ddseq"])>

	<!--- Find the TEMPSPROD linked to this defect (old :575-580) --->
	<cfquery name="trouveDETDEFECT" datasource="#datasourcePrimary#">
		SELECT TEMPSPROD
		FROM DET_DEFECT
		WHERE DDSEQ = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#ddseq#">
	</cfquery>
	<cfif trouveDETDEFECT.RecordCount EQ 0>
		<cfset response["success"] = false>
		<cfset response["error"] = "Defect not found">
		<cfoutput>#SerializeJSON(response)#</cfoutput>
		<cfabort>
	</cfif>
	<cfset LeTJSEQ = Val(trouveDETDEFECT.TEMPSPROD)>

	<!--- Delete the defect (old :581-586) --->
	<cfquery datasource="#datasourcePrimary#">
		DELETE
		FROM DET_DEFECT
		WHERE DDSEQ = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#ddseq#">
	</cfquery>

	<!--- Recalculate total (old :587-596) --->
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

	<!--- Sync SM if the row has one (old :598-610) --->
	<cfquery name="trouveTEMPSPROD" datasource="#datasourcePrimary#">
		SELECT TJQTEPROD, TJQTEDEFECT, SMNOTRANS
		FROM TEMPSPROD
		WHERE TJSEQ = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#LeTJSEQ#">
	</cfquery>
	<cfif Len(Trim(trouveTEMPSPROD.SMNOTRANS)) GT 0>
		<cfset LeTotal = Val(trouveTEMPSPROD.TJQTEPROD) + Val(trouveTEMPSPROD.TJQTEDEFECT)>
		<cfquery datasource="#datasourcePrimary#">
			UPDATE SORTIEMATERIEL
			SET SMQTEPRODUIT = <cfqueryparam cfsqltype="CF_SQL_FLOAT" value="#LeTotal#">
			WHERE SMNOTRANS = <cfqueryparam cfsqltype="CF_SQL_VARCHAR" maxlength="9" value="#Left(trouveTEMPSPROD.SMNOTRANS, 9)#">
		</cfquery>
	</cfif>

	<!--- Return updated defects list --->
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
	<cfset data["tjseq"] = LeTJSEQ>
	<cfset data["totalDefect"] = Val(trouveTotal.Total)>
	<cfset data["smnotrans"] = Trim(trouveTEMPSPROD.SMNOTRANS)>
	<cfset data["defects"] = defectsArray>

	<cfset response["success"] = true>
	<cfset response["data"] = data>
	<cfset response["message"] = "Defect removed">

	<cfcatch type="any">
		<cfset response = StructNew()>
		<cfset response["success"] = false>
		<cfset response["data"] = StructNew()>
		<cfset response["error"] = cfcatch.message & " " & cfcatch.detail>
	</cfcatch>
</cftry>

<cfoutput>#SerializeJSON(response)#</cfoutput>
</cfsilent>
