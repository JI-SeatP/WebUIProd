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

	<cfset requestBody = DeserializeJSON(GetHttpRequestData().content)>
	<cfset thePRSEQ = Val(requestBody["PRSEQ"])>

	<cfif thePRSEQ LTE 0>
		<cfset response["success"] = false>
		<cfset response["data"] = "">
		<cfset response["error"] = "PRSEQ required.">
		<cfoutput>#SerializeJSON(response)#</cfoutput>
		<cfabort>
	</cfif>

	<cfquery datasource="#datasourceExt#">
		UPDATE dbo.WUI_ProductionRuns
		SET PR_LastUpdate = SYSDATETIME()
		WHERE PRSEQ = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#thePRSEQ#">
		  AND PR_End IS NULL
	</cfquery>

	<cfset response["success"] = true>
	<cfset response["data"] = "">

	<cfcatch type="any">
		<cfset response = StructNew()>
		<cfset response["success"] = false>
		<cfset response["data"] = "">
		<cfset response["error"] = cfcatch.message & " " & cfcatch.detail>
	</cfcatch>
</cftry>

<cfoutput>#SerializeJSON(response)#</cfoutput>
</cfsilent>
