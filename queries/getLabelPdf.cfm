<cfsilent>
<cfsetting enablecfoutputonly="true" showdebugoutput="false">
<cfcontent type="application/json">
<cfheader name="Access-Control-Allow-Origin" value="*">
<cfheader name="Access-Control-Allow-Methods" value="GET,OPTIONS">
<cfheader name="Access-Control-Allow-Headers" value="Content-Type">

<cfif cgi.REQUEST_METHOD EQ "OPTIONS">
	<cfoutput>{}</cfoutput><cfabort>
</cfif>

<cfset response = StructNew()>
<cfset response["success"] = false>
<cfset response["error"] = "Not initialized">

<cftry>
	<cfparam name="url.type" default="operation">
	<cfparam name="url.key"  default="0">
	<cfparam name="url.lang" default="fr">

	<cfif Val(url.key) EQ 0>
		<cfthrow message="key parameter is required">
	</cfif>

	<!--- ── 1. Resolve Crystal Report file name ───────────────────────────── --->
	<cfif url.type EQ "operation">

		<cfquery name="qOp" datasource="AF_SEATPLY_TEST">
			SELECT OPERATION_OPCODE
			FROM TEMPSPROD
			WHERE TJSEQ = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#Val(url.key)#">
		</cfquery>

		<cfif qOp.RecordCount EQ 0>
			<cfthrow message="TJSEQ #Val(url.key)# not found">
		</cfif>

		<cfswitch expression="#qOp.OPERATION_OPCODE#">
			<cfcase value="PRESS"><cfset sRapport = "stp-PressingLabel4x6_003.rpt"></cfcase>
			<cfcase value="CNC"><cfset sRapport = "STP-MachiningLabel4x6_002.rpt"></cfcase>
			<cfcase value="SAND"><cfset sRapport = "STP-SandingLabel4x6_001.rpt"></cfcase>
			<cfcase value="PACK"><cfset sRapport = "STP-PackagingtoAssemblyLabel4x6_SKID_002.rpt"></cfcase>
			<cfdefaultcase>
				<cfthrow message="Unsupported OPCODE: #qOp.OPERATION_OPCODE#">
			</cfdefaultcase>
		</cfswitch>

	<cfelseif url.type EQ "pack">
		<cfset sRapport = "STP-ProduitFiniListeContenantNew4x6Detail_002.rpt">
	<cfelse>
		<cfthrow message="Unknown type: #url.type#">
	</cfif>

	<!--- ── 2. Get AutoFAB service connection info from DB ────────────────── --->
	<cfquery name="qParam" datasource="AF_SEATPLY_TEST">
		SELECT TOP 1 PAWS_PORT, PAWS_IP FROM vPARAMETRE ORDER BY PASEQ
	</cfquery>

	<cfif qParam.RecordCount EQ 0>
		<cfthrow message="vPARAMETRE returned no rows — cannot reach AutoFAB service">
	</cfif>

	<cfset sAutoFabServeur = "http://#qParam.PAWS_IP#:#qParam.PAWS_PORT#/AutofabAPI">

	<!--- ── 3. Report file path and public URL base (test env) ────────────── --->
	<!--- These match InitialiseConstantes.cfm for isEnvTest = True           --->
	<cfset sCheminRapport = "D:\NBA\AUTOFABTEST\rapport\">
	<cfset sRacineRapports = "http://10.4.80.6/AUTOFAB_RAPPORTS_TEST">

	<cfset sRapportPath = "#sCheminRapport##sRapport#">
	<cfset sLangue = (url.lang EQ "EN") ? 2 : 1>

	<!--- ── 4. Build PRINT_REPORT SOAP request (mirrors envoiXMLGet) ─────── --->
	<cfsavecontent variable="soapRequest">
		<cfoutput><?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <PRINT_REPORT xmlns="AutofabAPI">
      <SRAPPORT>#sRapportPath#</SRAPPORT>
      <SCLE>#Val(url.key)#</SCLE>
      <SUNIQUE>#Val(url.key)#</SUNIQUE>
      <STRI></STRI>
      <SFILTRE></SFILTRE>
      <SLANGUE>#sLangue#</SLANGUE>
      <STITRE>LABEL</STITRE>
      <SORIENTATION>1</SORIENTATION>
      <SLARGEUR></SLARGEUR>
      <SHAUTEUR></SHAUTEUR>
      <SPARAMETRES></SPARAMETRES>
      <SCIBLE>4</SCIBLE>
      <SPARAMCIBLE>LABEL;PDF</SPARAMCIBLE>
    </PRINT_REPORT>
  </soap:Body>
</soap:Envelope></cfoutput>
	</cfsavecontent>

	<!--- ── 5. POST to AutoFAB service ──────────────────────────────────── --->
	<cfhttp url="#sAutoFabServeur#/PRINT_REPORT" method="post" result="oClient" timeout="60" resolveurl="No">
		<cfhttpparam type="header" name="content-type" value="text/xml">
		<cfhttpparam type="header" name="Accept-Encoding" value="deflate;q=0">
		<cfhttpparam type="header" name="charset" value="utf-8">
		<cfhttpparam type="header" name="SOAPAction" value="#sAutoFabServeur#/PRINT_REPORT">
		<cfhttpparam type="xml" name="parameter" value="#Trim(soapRequest)#">
	</cfhttp>

	<cfset sleep(2000)>

	<!--- ── 6. Parse XML response (plain XML, no SOAP wrapper) ──────────── --->
	<cfset xmlResultat = XmlParse(REReplace(oClient.FileContent, "^[^<]+", "", "one"))>
	<cfset xmlRoot = xmlResultat.XmlRoot>

	<cfset retJob = -1>
	<cfset leURL  = "">
	<cfif StructKeyExists(xmlRoot, "nRetJob")>
		<cfset retJob = Val(xmlRoot["nRetJob"].XmlText)>
	</cfif>
	<cfif StructKeyExists(xmlRoot, "URL")>
		<cfset leURL = Trim(xmlRoot["URL"].XmlText)>
	</cfif>

	<cfif retJob LT 0 OR leURL EQ "">
		<cfthrow message="Report service error — nRetJob=#retJob#, URL=#leURL#. FileContent: #Left(oClient.FileContent, 500)#">
	</cfif>

	<cfset response["success"] = true>
	<cfset response["data"]    = StructNew()>
	<cfset response["data"]["pdfUrl"] = "#sRacineRapports#/#leURL#">
	<cfset response["message"] = "Label PDF generated">

	<cfcatch type="any">
		<cfset response["success"] = false>
		<cfset response["error"]   = cfcatch.message & " | " & cfcatch.detail>
	</cfcatch>
</cftry>

</cfsilent><cfoutput>#SerializeJSON(response)#</cfoutput>
