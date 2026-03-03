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

	<!--- Primary stop causes from QA_CAUSEP table
	      Source: operation.cfc — exact table/column names from legacy code --->
	<cfquery name="qCauses" datasource="AF_SEATPLY_TEST">
		SELECT QACPSEQ, QACPDESCRIPTION_P, QACPDESCRIPTION_S
		FROM QA_CAUSEP
		ORDER BY QACPDESCRIPTION_P
	</cfquery>

	<cfset rows = []>
	<cfloop query="qCauses">
		<cfset row = StructNew("ordered")>
		<cfset row["id"] = qCauses.QACPSEQ>
		<cfset row["description_P"] = qCauses.QACPDESCRIPTION_P>
		<cfset row["description_S"] = qCauses.QACPDESCRIPTION_S>
		<cfset ArrayAppend(rows, row)>
	</cfloop>

	<cfset response["success"] = true>
	<cfset response["data"] = rows>
	<cfset response["message"] = "Retrieved " & ArrayLen(rows) & " primary causes">

	<cfcatch type="any">
		<cfset response = StructNew()>
		<cfset response["success"] = false>
		<cfset response["data"] = []>
		<cfset response["error"] = cfcatch.message & " " & cfcatch.detail>
	</cfcatch>
</cftry>

<cfoutput>#SerializeJSON(response)#</cfoutput>
</cfsilent>
