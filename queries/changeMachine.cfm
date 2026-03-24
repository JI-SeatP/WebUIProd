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

	<cfparam name="url.machine" default="0">
	<cfparam name="url.copmachine" default="0">
	<cfparam name="url.nopseq" default="0">

	<cfset machineId = Val(url.machine)>
	<cfset copmachineId = Val(url.copmachine)>
	<cfset nopseqId = Val(url.nopseq)>

	<cfif machineId EQ 0>
		<cfset response["success"] = false>
		<cfset response["error"] = "machine parameter is required">
		<cfoutput>#SerializeJSON(response)#</cfoutput><cfabort>
	</cfif>

	<!--- Replicates operation.cfc:afficheMachineAttribuee (lines 1649-1684) --->

	<!--- 1. Get machine details --->
	<cfquery name="qMachine" datasource="#datasourcePrimary#">
		SELECT MASEQ, MACODE, MADESC_S, MADESC_P, FAMILLEMACHINE
		FROM MACHINE
		WHERE MASEQ = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#machineId#">
	</cfquery>

	<cfif qMachine.RecordCount EQ 0>
		<cfset response["success"] = false>
		<cfset response["error"] = "Machine not found">
		<cfoutput>#SerializeJSON(response)#</cfoutput><cfabort>
	</cfif>

	<!--- 2. Update nomenclature component machine table --->
	<cfif copmachineId NEQ 0>
		<cfquery datasource="#datasourcePrimary#">
			UPDATE cNomencOp_Machine
			SET MACHINE = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#machineId#">
			WHERE CNOM_SEQ = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#copmachineId#">
		</cfquery>
	</cfif>

	<!--- 3. Update production results --->
	<cfif nopseqId NEQ 0>
		<cfquery datasource="#datasourcePrimary#">
			UPDATE PL_RESULTAT
			SET MACHINE = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#machineId#">
			WHERE CNOMENCOP = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#nopseqId#">
			AND (CNOMENCOP_MACHINE = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#copmachineId#"> OR COPMACHINE = 0)
		</cfquery>
	</cfif>

	<cfset data = StructNew("ordered")>
	<cfset data["MASEQ"] = qMachine.MASEQ>
	<cfset data["MACODE"] = qMachine.MACODE>
	<cfset data["MADESC_P"] = qMachine.MADESC_P>
	<cfset data["MADESC_S"] = qMachine.MADESC_S>

	<cfset response["success"] = true>
	<cfset response["data"] = data>
	<cfset response["message"] = "Machine updated successfully">

	<cfcatch type="any">
		<cfset response = StructNew()>
		<cfset response["success"] = false>
		<cfset response["data"] = StructNew()>
		<cfset response["error"] = cfcatch.message & " " & cfcatch.detail>
	</cfcatch>
</cftry>

<cfoutput>#SerializeJSON(response)#</cfoutput>
</cfsilent>
