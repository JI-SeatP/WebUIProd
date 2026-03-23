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
	<cfset theEmployeeCode = Val(requestBody["employeeCode"])>
	<cfset theDate = requestBody["date"]>
	<cfset theStartTime = requestBody["startTime"]>
	<cfset theEndTime = requestBody["endTime"]>
	<cfset theDepartment = Val(requestBody["department"])>
	<cfset theMachine = Val(requestBody["machine"])>
	<cfset theEffortRate = Val(requestBody["effortRate"])>

	<!--- Construct full datetime strings from date + time
	      Replicates operation.cfc:5791-5792 (ReplaceNoCase of T with space) --->
	<cfset theDateDebut = theDate & " " & theStartTime>
	<cfset theDateFin = theDate & " " & theEndTime>

	<!--- Handle overnight shifts: if endTime < startTime, add 1 day to end date
	      Replicates changeDateDebutFin() in sp_js.cfm:482-486 --->
	<cfif Val(Left(theEndTime, 2)) LT Val(Left(theStartTime, 2)) OR (Val(Left(theEndTime, 2)) EQ 0 AND Val(Left(theStartTime, 2)) GT 0)>
		<cfset endDateObj = DateAdd('d', 1, theDate)>
		<cfset theDateFin = DateFormat(endDateObj, 'yyyy-mm-dd') & " " & theEndTime>
	</cfif>

	<!--- Exact replica of ajouteModifieTempsHomme (operation.cfc:5793)
	      Calculate duration in minutes — must be > 0 --->
	<cfset LaDiff = DateDiff('n', theDateDebut, theDateFin)>

	<!--- Exact replica of operation.cfc:5794-5798
	      Check if EMPHSEQ exists (for new entry, EMPHSEQ=0 never exists) --->
	<cfquery name="trouveTempsHomme" datasource="#datasourceExt#">
		SELECT EMPHSEQ
		FROM EMPLOYE_HEURES
		WHERE EMPHSEQ = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="0">
	</cfquery>

	<!--- Exact replica of operation.cfc:5799-5808
	      Duplicate check: all fields must match exactly --->
	<cfquery name="ExisteTempsHomme" datasource="#datasourceExt#">
		SELECT EMPHSEQ
		FROM EMPLOYE_HEURES
		WHERE EMPHDATEDEBUT = <cfqueryparam cfsqltype="cf_sql_timestamp" value="#CreateODBCDateTime(theDateDebut)#">
		AND EMPHDATEFIN = <cfqueryparam cfsqltype="cf_sql_timestamp" value="#CreateODBCDateTime(theDateFin)#">
		AND DEPARTEMENT = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#theDepartment#">
		AND MACHINE = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#theMachine#">
		AND EMPLOYE = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#theEmployeeCode#">
		AND EMPHEFFORT_HOMME = <cfqueryparam cfsqltype="cf_sql_float" value="#NumberFormat(Val(theEffortRate/100), '0.00')#">
	</cfquery>

	<cfif ExisteTempsHomme.RecordCount EQ 0 AND LaDiff GT 0>
		<!--- Exact replica of operation.cfc:5810-5826
		      New entry: EMPHSEQ=0 means trouveTempsHomme.RecordCount is always 0 --->
		<cfquery name="ajouteTemps" datasource="#datasourceExt#">
			Set NoCount On
			INSERT INTO EMPLOYE_HEURES (EMPHDATEDEBUT, EMPHDATEFIN, EMPHEFFORT_HOMME, DEPARTEMENT, MACHINE, EMPLOYE)
			Values (
				<cfqueryparam cfsqltype="cf_sql_timestamp" value="#CreateODBCDateTime(theDateDebut)#">,
				<cfqueryparam cfsqltype="cf_sql_timestamp" value="#CreateODBCDateTime(theDateFin)#">,
				<cfqueryparam cfsqltype="cf_sql_float" value="#NumberFormat(Val(theEffortRate/100), '0.00')#">,
				<cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#theDepartment#">,
				<cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#theMachine#">,
				<cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#theEmployeeCode#">
			)
			Select NouvTempsID = @@Identity
			Set NoCount Off
		</cfquery>

		<cfset dataStruct = StructNew("ordered")>
		<cfset dataStruct["EHSEQ"] = ajouteTemps.NouvTempsID>

		<cfset response["success"] = true>
		<cfset response["data"] = dataStruct>
		<cfset response["message"] = "Hours added">
	<cfelse>
		<!--- Exact replica of operation.cfc:5844-5846: return -1 on duplicate or negative duration --->
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
