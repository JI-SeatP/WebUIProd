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

	<!--- Set datasources based on environment ----->
	<cfset isProduction = (GetEnvironmentVariable("CF_ENVIRONMENT", "test") EQ "production")>
	<cfif isProduction>
		<cfset datasourcePrimary = "AF_SEATPLY">
	<cfelse>
		<cfset datasourcePrimary = "TS_SEATPL">
	</cfif>

	<!--- Defect types from RAISON table, filtered by RRTYPE LIKE '%14%'
	      Source: QteDefect.cfc — exact table/column names from legacy code --->
	<cfquery name="qDefects" datasource="#datasourcePrimary#">
		SELECT RRSEQ, RRCODE, RRDESC_P, RRDESC_S, RRTYPE
		FROM RAISON
		WHERE RRTYPE LIKE '%14%'
		ORDER BY RRDESC_P
	</cfquery>

	<cfset rows = []>
	<cfloop query="qDefects">
		<cfset row = StructNew("ordered")>
		<cfset row["id"] = qDefects.RRSEQ>
		<cfset row["code"] = qDefects.RRCODE>
		<cfset row["description_P"] = qDefects.RRDESC_P>
		<cfset row["description_S"] = qDefects.RRDESC_S>
		<cfset row["type"] = qDefects.RRTYPE>
		<cfset ArrayAppend(rows, row)>
	</cfloop>

	<cfset response["success"] = true>
	<cfset response["data"] = rows>
	<cfset response["message"] = "Retrieved " & ArrayLen(rows) & " defect types">

	<cfcatch type="any">
		<cfset response = StructNew()>
		<cfset response["success"] = false>
		<cfset response["data"] = []>
		<cfset response["error"] = cfcatch.message & " " & cfcatch.detail>
	</cfcatch>
</cftry>

<cfoutput>#SerializeJSON(response)#</cfoutput>
</cfsilent>
