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

	<cfparam name="url.famillemachine" default="0">
	<cfparam name="url.departement" default="0">

	<!--- Get available machines for the operation's family + department
	      Replicates old tableau.cfc:78 ListeMachines query --->
	<cfquery name="qMachines" datasource="#datasourcePrimary#">
		SELECT MASEQ, MACODE, MADESC_S, MADESC_P
		FROM MACHINE
		WHERE FamilleMachine = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#Val(url.famillemachine)#">
		AND DEPARTEMENT = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#Val(url.departement)#">
		ORDER BY MADESC_P
	</cfquery>

	<cfset rows = []>
	<cfloop query="qMachines">
		<cfset row = StructNew("ordered")>
		<cfset row["MASEQ"] = qMachines.MASEQ>
		<cfset row["MACODE"] = qMachines.MACODE>
		<cfset row["MADESC_P"] = qMachines.MADESC_P>
		<cfset row["MADESC_S"] = qMachines.MADESC_S>
		<cfset ArrayAppend(rows, row)>
	</cfloop>

	<cfset response["success"] = true>
	<cfset response["data"] = rows>

	<cfcatch type="any">
		<cfset response = StructNew()>
		<cfset response["success"] = false>
		<cfset response["data"] = []>
		<cfset response["error"] = cfcatch.message & " " & cfcatch.detail>
	</cfcatch>
</cftry>

<cfoutput>#SerializeJSON(response)#</cfoutput>
</cfsilent>
