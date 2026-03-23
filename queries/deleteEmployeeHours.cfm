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

	<!--- Exact replica of retireTempsHomme (operation.cfc:5741-5744)
	      First verify the record exists --->
	<cfquery name="trouveTempsHomme" datasource="#datasourceExt#">
		SELECT EMPHSEQ
		FROM EMPLOYE_HEURES
		WHERE EMPHSEQ = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#theEMPHSEQ#">
	</cfquery>

	<!--- Exact replica of retireTempsHomme (operation.cfc:5746-5749)
	      Delete the record --->
	<cfquery datasource="#datasourceExt#">
		DELETE
		FROM EMPLOYE_HEURES
		WHERE EMPHSEQ = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#theEMPHSEQ#">
	</cfquery>

	<cfset dataStruct = StructNew("ordered")>
	<cfset dataStruct["EHSEQ"] = trouveTempsHomme.EMPHSEQ>

	<cfset response["success"] = true>
	<cfset response["data"] = dataStruct>
	<cfset response["message"] = "Entry deleted">

	<cfcatch type="any">
		<cfset response = StructNew()>
		<cfset response["success"] = false>
		<cfset response["data"] = "">
		<cfset response["error"] = cfcatch.message & " " & cfcatch.detail>
	</cfcatch>
</cftry>

<cfoutput>#SerializeJSON(response)#</cfoutput>
</cfsilent>
