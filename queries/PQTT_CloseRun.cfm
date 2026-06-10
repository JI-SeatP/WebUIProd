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

	<!--- Read JSON body. Accepts both fetch POSTs and navigator.sendBeacon
	      payloads (which arrive as text/plain or application/json blobs). --->
	<cfset rawBody = GetHttpRequestData().content>
	<cfif IsBinary(rawBody)>
		<cfset rawBody = CharsetEncode(rawBody, "utf-8")>
	</cfif>
	<cfset requestBody = DeserializeJSON(rawBody)>

	<cfset thePRSEQ    = Val(requestBody["PRSEQ"])>
	<cfset thePRDETSEQ = Val(requestBody["PRDETSEQ"])>

	<cfif thePRSEQ LTE 0>
		<cfset response["success"] = false>
		<cfset response["data"]    = "">
		<cfset response["error"]   = "PRSEQ required.">
		<cfoutput>#SerializeJSON(response)#</cfoutput>
		<cfabort>
	</cfif>

	<cftransaction action="begin">
		<!--- Close the supplied open detail row, if any. Idempotent. --->
		<cfif thePRDETSEQ GT 0>
			<cfquery datasource="#datasourceExt#">
				UPDATE dbo.WUI_ProductionRunDetails
				SET PR_DetEnd = SYSDATETIME(),
				    QtyGood   = 0,
				    QtyDef    = 0
				WHERE PRDETSEQ = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#thePRDETSEQ#">
				  AND PRSEQ    = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#thePRSEQ#">
				  AND PR_DetEnd IS NULL
			</cfquery>
		</cfif>

		<!--- Also close any other open detail row on the same PRSEQ as a safety net. --->
		<cfquery datasource="#datasourceExt#">
			UPDATE dbo.WUI_ProductionRunDetails
			SET PR_DetEnd = SYSDATETIME(),
			    QtyGood   = 0,
			    QtyDef    = 0
			WHERE PRSEQ = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#thePRSEQ#">
			  AND PR_DetEnd IS NULL
		</cfquery>

		<!--- Close the PRSEQ itself (idempotent). --->
		<cfquery datasource="#datasourceExt#">
			UPDATE dbo.WUI_ProductionRuns
			SET PR_End        = SYSDATETIME(),
			    PR_LastUpdate = SYSDATETIME()
			WHERE PRSEQ = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#thePRSEQ#">
			  AND PR_End IS NULL
		</cfquery>
	</cftransaction>

	<cfset response["success"] = true>
	<cfset response["data"]    = "">
	<cfset response["message"] = "Production run closed">

	<cfcatch type="any">
		<cfset response = StructNew()>
		<cfset response["success"] = false>
		<cfset response["data"] = "">
		<cfset response["error"] = cfcatch.message & " " & cfcatch.detail>
	</cfcatch>
</cftry>

<cfoutput>#SerializeJSON(response)#</cfoutput>
</cfsilent>
