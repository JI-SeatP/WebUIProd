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

	<!--- Optional machine family code filter (e.g. PRESS, CNC, Sand, PACK, VENPR)
	      Source: QteDefect.cfc lines 51-74 — filters defect reasons by machine family --->
	<cfparam name="url.fmcode" default="">
	<cfparam name="url.lang" default="FR">

	<cfquery name="qDefects" datasource="#datasourcePrimary#">
		SELECT RRSEQ, RRCODE, RRDESC_P, RRDESC_S, RRTYPE
		FROM RAISON
		WHERE RRTYPE LIKE '%14%'
		AND (
			(RRDESC_S LIKE 'Raw-Material%' OR RRDESC_S LIKE 'Visual%')
			<cfif url.fmcode NEQ "">
				<cfif FindNoCase("PRESS", url.fmcode) NEQ 0>
					OR (RRCODE LIKE 'SCRAP-PRS%' OR RRDESC_P LIKE 'Presse%')
				<cfelseif FindNoCase("CNC", url.fmcode) NEQ 0>
					OR (RRCODE LIKE 'SCRAP-CNC%' OR RRDESC_P LIKE 'Usinage%')
				<cfelseif FindNoCase("Sand", url.fmcode) NEQ 0>
					OR (RRCODE LIKE 'SCRAP-SND%')
				<cfelseif FindNoCase("PACK", url.fmcode) NEQ 0>
					OR (RRCODE LIKE 'SCRAP-PKG%' OR RRDESC_P LIKE 'Emballage%')
				<cfelseif FindNoCase("VENPR", url.fmcode) NEQ 0>
					OR (RRTYPE LIKE '%3%' OR RRTYPE LIKE '%20%')
				</cfif>
			<cfelse>
				<!--- No family filter: return all RRTYPE 14 defects --->
				OR 1=1
			</cfif>
		)
		ORDER BY <cfif UCase(url.lang) EQ "EN">RRDESC_S<cfelse>RRDESC_P</cfif>
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
