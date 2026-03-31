<!---
	AutoFab SOAP Utility
	====================
	Replicates support.cfc::envoiXMLGet (lines 3329-3513).
	Usage: <cfinclude template="lib/autofabSoap.cfm"> at the top of your .cfm,
	       then call autofabExecuteTransaction() or autofabExecuteStoredProc().

	Requires: datasourcePrimary to be set before including this file
	          (for reading vPARAMETRE to get AutoFab server URL).
--->

<cffunction name="autofabGetConfig" access="public" returntype="struct" output="false"
	hint="Reads AutoFab server URL/port from vPARAMETRE. Caches in request scope.">
	<cfargument name="ds" type="string" required="true" hint="Primary datasource name">

	<!--- Cache within this request to avoid repeated DB hits --->
	<cfif StructKeyExists(request, "_autofabConfig")>
		<cfreturn request._autofabConfig>
	</cfif>

	<cfquery name="qParam" datasource="#arguments.ds#">
		SELECT TOP 1 v.PAWS_PORT, v.PAWS_IP
		FROM vPARAMETRE v
		ORDER BY PASEQ
	</cfquery>

	<cfset var cfg = StructNew()>
	<cfif qParam.RecordCount GT 0>
		<cfset cfg["port"] = qParam.PAWS_PORT>
		<cfset cfg["ip"] = qParam.PAWS_IP>
		<cfset cfg["baseUrl"] = "http://#qParam.PAWS_IP#:#qParam.PAWS_PORT#/AutofabAPI">
	<cfelse>
		<cfthrow type="AutoFabConfig" message="vPARAMETRE table returned no rows — cannot determine AutoFab server">
	</cfif>

	<cfset request._autofabConfig = cfg>
	<cfreturn cfg>
</cffunction>


<cffunction name="autofabSoapCall" access="public" returntype="struct" output="false"
	hint="Low-level SOAP call to AutoFab. Returns parsed struct from XML response.">
	<cfargument name="ds" type="string" required="true" hint="Primary datasource">
	<cfargument name="command" type="string" required="true" hint="SOAP command (EXECUTE_TRANSACTION, EXECUTE_STORED_PROC)">
	<cfargument name="soapBody" type="string" required="true" hint="Inner SOAP body XML">

	<cfset var cfg = autofabGetConfig(arguments.ds)>
	<cfset var soapUrl = cfg.baseUrl & ":" & cfg.port & "/" & arguments.command>

	<!--- Build full SOAP envelope --->
	<cfsavecontent variable="soapRequest">
		<cfoutput>
			<?xml version="1.0" encoding="utf-8"?>
			<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://www.w3.org/2003/05/soap-envelope">
			  <soap:Body>
				<#arguments.command# xmlns="AutofabAPI">
				  #arguments.soapBody#
				</#arguments.command#>
			  </soap:Body>
			</soap:Envelope>
		</cfoutput>
	</cfsavecontent>

	<!--- POST to AutoFab --->
	<cfhttp url="#cfg.baseUrl#:#cfg.port#/#arguments.command#"
		username="" password="" method="post" result="oClient" timeout="300" resolveurl="No">
		<cfhttpparam type="header" name="content-type" value="text/xml">
		<cfhttpparam type="Header" name="Accept-Encoding" value="deflate;q=0">
		<cfhttpparam type="header" name="charset" value="utf-8">
		<cfhttpparam type="header" name="SOAPAction" value="#cfg.baseUrl#:#cfg.port#/#arguments.command#">
		<cfhttpparam type="xml" name="parameter" value="#Trim(soapRequest)#">
	</cfhttp>

	<!--- Parse XML response --->
	<cfset var xmlResultat = XmlParse(REReplace(oClient.FileContent, "^[^<]*", "", "all"))>

	<!--- Convert XML to struct (simplified — extracts leaf text values) --->
	<cfset var result = StructNew()>
	<cfset result["success"] = true>
	<cfset result["raw"] = oClient.FileContent>

	<!--- Walk SOAP body children to extract return values --->
	<cftry>
		<cfset var body = xmlResultat.XmlRoot>
		<!--- Navigate: Envelope > Body > CommandResponse > CommandResult --->
		<cfset var soapBody2 = body.XmlChildren[1]><!--- Body --->
		<cfset var cmdResponse = soapBody2.XmlChildren[1]><!--- e.g. EXECUTE_TRANSACTIONResponse --->
		<cfset var cmdResult = cmdResponse.XmlChildren[1]><!--- e.g. EXECUTE_TRANSACTIONResult --->

		<cfset result["retval"] = Trim(cmdResult.XmlText)>

		<!--- If there are child elements (OutputValues), extract them --->
		<cfif ArrayLen(cmdResult.XmlChildren) GT 0>
			<cfset var outputs = StructNew()>
			<cfloop from="1" to="#ArrayLen(cmdResult.XmlChildren)#" index="i">
				<cfset var child = cmdResult.XmlChildren[i]>
				<cfset var nodeName = Replace(child.XmlName, child.XmlNsPrefix & ":", "")>
				<cfset outputs[nodeName] = Trim(child.XmlText)>
			</cfloop>
			<cfset result["outputs"] = outputs>
		</cfif>

		<cfcatch type="any">
			<!--- If parsing fails, still return the raw response for debugging --->
			<cfset result["parseError"] = cfcatch.message>
		</cfcatch>
	</cftry>

	<cfreturn result>
</cffunction>


<cffunction name="autofabExecuteTransaction" access="public" returntype="struct" output="false"
	hint="EXECUTE_TRANSACTION call. Used for EPF/INS, EPFDETAIL/INS, EPF/REPORT, SM/REPORT.">
	<cfargument name="ds" type="string" required="true" hint="Primary datasource">
	<cfargument name="traitement" type="string" required="true" hint="e.g. EPF, SM, EPFDETAIL">
	<cfargument name="operation" type="string" required="true" hint="e.g. INS, REPORT">
	<cfargument name="parametres" type="string" required="true" hint="Semicolon-delimited variable string">

	<cfset var soapBody = "">
	<cfsavecontent variable="soapBody">
		<cfoutput>
			<STRAITEMENT>#arguments.traitement#</STRAITEMENT>
			<SOPERATION>#arguments.operation#</SOPERATION>
			<SLESVARIABLES>#arguments.parametres#</SLESVARIABLES>
		</cfoutput>
	</cfsavecontent>

	<cfreturn autofabSoapCall(arguments.ds, "EXECUTE_TRANSACTION", soapBody)>
</cffunction>


<cffunction name="autofabExecuteStoredProc" access="public" returntype="struct" output="false"
	hint="EXECUTE_STORED_PROC call via SOAP. Used for SPs that must go through AutoFab (e.g. Nba_Sp_Insert_Sortie_Materiel).">
	<cfargument name="ds" type="string" required="true" hint="Primary datasource">
	<cfargument name="spName" type="string" required="true" hint="Stored procedure name">
	<cfargument name="spArgs" type="string" required="true" hint="Comma-separated SP arguments">
	<cfargument name="nExt" type="string" required="false" default="0" hint="nExt flag (0=primary, 1=ext)">

	<cfset var soapBody = "">
	<cfsavecontent variable="soapBody">
		<cfoutput>
			<sQuery>#arguments.spName# #arguments.spArgs#</sQuery>
			<nExt>#arguments.nExt#</nExt>
		</cfoutput>
	</cfsavecontent>

	<cfreturn autofabSoapCall(arguments.ds, "EXECUTE_STORED_PROC", soapBody)>
</cffunction>
