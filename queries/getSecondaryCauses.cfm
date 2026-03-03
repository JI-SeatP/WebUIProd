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

	<cfparam name="url.primaryId" default="0">

	<cfif Val(url.primaryId) EQ 0>
		<cfset response["success"] = true>
		<cfset response["data"] = []>
		<cfset response["message"] = "No primaryId provided">
		<cfoutput>#SerializeJSON(response)#</cfoutput>
		<cfabort>
	</cfif>

	<!--- Secondary stop causes from QA_CAUSES table, filtered by QA_CAUSEP foreign key
	      Source: operation.cfc — exact table/column names from legacy code --->
	<cfquery name="qCauses" datasource="AF_SEATPLY_TEST">
		SELECT QACSSEQ, QACSDESCRIPTION_P, QACSDESCRIPTION_S
		FROM QA_CAUSES
		WHERE QA_CAUSEP = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#Val(url.primaryId)#">
		ORDER BY QACSDESCRIPTION_P
	</cfquery>

	<cfset rows = []>
	<cfloop query="qCauses">
		<cfset row = StructNew("ordered")>
		<cfset row["id"] = qCauses.QACSSEQ>
		<cfset row["description_P"] = qCauses.QACSDESCRIPTION_P>
		<cfset row["description_S"] = qCauses.QACSDESCRIPTION_S>
		<cfset ArrayAppend(rows, row)>
	</cfloop>

	<cfset response["success"] = true>
	<cfset response["data"] = rows>
	<cfset response["message"] = "Retrieved " & ArrayLen(rows) & " secondary causes">

	<cfcatch type="any">
		<cfset response = StructNew()>
		<cfset response["success"] = false>
		<cfset response["data"] = []>
		<cfset response["error"] = cfcatch.message & " " & cfcatch.detail>
	</cfcatch>
</cftry>

<cfoutput>#SerializeJSON(response)#</cfoutput>
</cfsilent>
