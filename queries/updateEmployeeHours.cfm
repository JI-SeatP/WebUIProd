<cfsilent>
<cfsetting enablecfoutputonly="true" showdebugoutput="false">
<cfcontent type="application/json">
<cfheader name="Access-Control-Allow-Origin" value="*">
<cfheader name="Access-Control-Allow-Methods" value="POST,OPTIONS">
<cfheader name="Access-Control-Allow-Headers" value="Content-Type">

<cfif cgi.REQUEST_METHOD EQ "OPTIONS">
	<cfoutput>{}</cfoutput><cfabort>
</cfif>

<cftry>
	<cfset response = StructNew()>

	<!--- Set datasources based on environment --->
	<cfset isProduction = (GetEnvironmentVariable("CF_ENVIRONMENT", "test") EQ "production")>
	<cfif isProduction>
		<cfset datasourceExt = "AF_SEATPLY_EXT">
	<cfelse>
		<cfset datasourceExt = "TS_SEATPL_EXT">
	</cfif>

	<!--- Read JSON body --->
	<cfset requestBody = DeserializeJSON(GetHttpRequestData().content)>
	<cfset theEMPHSEQ = Val(requestBody["ehseq"])>
	<cfset theStartTime = requestBody["startTime"]>
	<cfset theEndTime = requestBody["endTime"]>
	<cfset theDepartment = Val(requestBody["department"])>
	<cfset theMachine = Val(requestBody["machine"])>
	<cfset theEffortRate = Val(requestBody["effortRate"])>

	<!--- Replicates operation.cfc:5791-5792 (ReplaceNoCase of T with space)
	      startTime/endTime may arrive as "2026-03-23T07:00" or "07:00"
	      Handle both cases --->
	<cfset theDateDebut = ReplaceNoCase(theStartTime, 'T', ' ')>
	<cfset theDateFin = ReplaceNoCase(theEndTime, 'T', ' ')>

	<!--- Exact replica of operation.cfc:5793 — duration in minutes --->
	<cfset LaDiff = DateDiff('n', theDateDebut, theDateFin)>

	<!--- Exact replica of operation.cfc:5794-5798
	      Check if EMPHSEQ exists (must exist for update) --->
	<cfquery name="trouveTempsHomme" datasource="#datasourceExt#">
		SELECT EMPHSEQ, EMPLOYE
		FROM EMPLOYE_HEURES
		WHERE EMPHSEQ = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#theEMPHSEQ#">
	</cfquery>

	<!--- Get EMPLOYE from existing row for duplicate check --->
	<cfset theEmploye = trouveTempsHomme.EMPLOYE>

	<!--- Exact replica of operation.cfc:5799-5808
	      Duplicate check: all fields must match exactly --->
	<cfquery name="ExisteTempsHomme" datasource="#datasourceExt#">
		SELECT EMPHSEQ
		FROM EMPLOYE_HEURES
		WHERE EMPHDATEDEBUT = <cfqueryparam cfsqltype="cf_sql_timestamp" value="#CreateODBCDateTime(theDateDebut)#">
		AND EMPHDATEFIN = <cfqueryparam cfsqltype="cf_sql_timestamp" value="#CreateODBCDateTime(theDateFin)#">
		AND DEPARTEMENT = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#theDepartment#">
		AND MACHINE = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#theMachine#">
		AND EMPLOYE = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#theEmploye#">
		AND EMPHEFFORT_HOMME = <cfqueryparam cfsqltype="cf_sql_float" value="#NumberFormat(Val(theEffortRate/100), '0.00')#">
	</cfquery>

	<cfif ExisteTempsHomme.RecordCount EQ 0 AND LaDiff GT 0>
		<!--- Exact replica of operation.cfc:5829-5841
		      Update existing entry --->
		<cfquery datasource="#datasourceExt#">
			UPDATE EMPLOYE_HEURES
			SET EMPHDATEDEBUT = <cfqueryparam cfsqltype="cf_sql_timestamp" value="#CreateODBCDateTime(theDateDebut)#">,
			EMPHDATEFIN = <cfqueryparam cfsqltype="cf_sql_timestamp" value="#CreateODBCDateTime(theDateFin)#">,
			EMPHEFFORT_HOMME = <cfqueryparam cfsqltype="cf_sql_float" value="#NumberFormat(Val(theEffortRate)/100, '0.00')#">,
			DEPARTEMENT = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#theDepartment#">,
			MACHINE = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#theMachine#">,
			EMPLOYE = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#theEmploye#">
			WHERE EMPHSEQ = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#theEMPHSEQ#">
		</cfquery>

		<cfset dataStruct = StructNew("ordered")>
		<cfset dataStruct["EHSEQ"] = theEMPHSEQ>

		<cfset response["success"] = true>
		<cfset response["data"] = dataStruct>
		<cfset response["message"] = "Hours updated">
	<cfelse>
		<!--- Exact replica of operation.cfc:5844-5846: return error on duplicate or negative duration --->
		<cfset response["success"] = false>
		<cfset response["data"] = "">
		<cfset response["error"] = "Duplicate entry or negative duration">
	</cfif>

	<cfcatch type="any">
		<cfset response = StructNew()>
		<cfset response["success"] = false>
		<cfset response["data"] = "">
		<cfset response["error"] = cfcatch.message & " " & cfcatch.detail>
	</cfcatch>
</cftry>

<cfoutput>#SerializeJSON(response)#</cfoutput>
</cfsilent>
