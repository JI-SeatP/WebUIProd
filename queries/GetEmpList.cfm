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

	<cfquery name="employees" datasource="#datasourcePrimary#">
		SELECT
			E.EMNOIDENT AS EMP_NUM,
			E.EMNOM     AS EMP_NOM
		FROM EMPLOYE AS E WITH (NOLOCK)
		WHERE E.EMACTIF = 1
		ORDER BY E.EMNOM
	</cfquery>

	<cfset rows = ArrayNew(1)>
	<cfloop query="employees">
		<cfset row = StructNew("ordered")>
		<cfset row["EMP_NUM"] = employees.EMP_NUM>
		<cfset row["EMP_NOM"] = employees.EMP_NOM>
		<cfset ArrayAppend(rows, row)>
	</cfloop>

	<cfset response["success"] = true>
	<cfset response["data"] = rows>
	<cfset response["message"] = "Retrieved " & ArrayLen(rows) & " employees">

	<cfcatch type="any">
		<cfset response = StructNew()>
		<cfset response["success"] = false>
		<cfset response["data"] = ArrayNew(1)>
		<cfset response["error"] = cfcatch.message & " " & cfcatch.detail>
	</cfcatch>
</cftry>

<cfoutput>#SerializeJSON(response)#</cfoutput>
</cfsilent>
