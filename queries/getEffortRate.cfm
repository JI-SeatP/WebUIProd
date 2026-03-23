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
	<cfelse>
		<cfset datasourcePrimary = "TS_SEATPL">
	</cfif>

	<!--- Read URL parameters --->
	<cfset theMachine = Val(url.machine)>

	<!--- Exact replica of trouveEffort (operation.cfc:6035-6038) --->
	<cfquery name="trouveMachine" datasource="#datasourcePrimary#">
		SELECT MAEFFORTHOMME
		FROM MACHINE
		WHERE MASEQ = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#theMachine#">
	</cfquery>

	<!--- Return effort rate as percentage (0-100)
	      Old code: val(trouveMachine.MAEFFORTHOMME) returned as decimal,
	      JavaScript multiplied by 100 (sp_js.cfm:586) --->
	<cfset effortValue = Val(trouveMachine.MAEFFORTHOMME) * 100>

	<cfset dataStruct = StructNew("ordered")>
	<cfset dataStruct["effortRate"] = effortValue>

	<cfset response["success"] = true>
	<cfset response["data"] = dataStruct>
	<cfset response["message"] = "Effort rate retrieved">

	<cfcatch type="any">
		<cfset response = StructNew()>
		<cfset response["success"] = false>
		<cfset response["data"] = "">
		<cfset response["error"] = cfcatch.message & " " & cfcatch.detail>
	</cfcatch>
</cftry>

<cfoutput>#SerializeJSON(response)#</cfoutput>
</cfsilent>
