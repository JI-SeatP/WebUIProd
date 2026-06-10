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
		<cfset datasourceExt = "AF_SEATPLY_EXT">
	<cfelse>
		<cfset datasourceExt = "TS_SEATPL_EXT">
	</cfif>

	<cfset theTRANSAC    = Val(url.TRANSAC ?: 0)>
	<cfset theNOPSEQ     = Val(url.NOPSEQ  ?: 0)>
	<cfset theOPSEQ      = Val(url.OPSEQ   ?: 0)>
	<cfset theMASEQ      = Val(url.MASEQ   ?: 0)>
	<cfset theINSEQ      = (StructKeyExists(url, "INSEQ")  AND IsNumeric(url.INSEQ))  ? Val(url.INSEQ)  : "">
	<cfset theNISEQ      = (StructKeyExists(url, "NISEQ")  AND IsNumeric(url.NISEQ))  ? Val(url.NISEQ)  : "">
	<cfset theEMP_NUM    = Left(Trim(url.EMP_NUM ?: ""), 5)>
	<cfset theShiftStart = url.shiftStart ?: "">
	<cfset theShiftEnd   = url.shiftEnd   ?: "">

	<cfif theTRANSAC LTE 0 OR theMASEQ LTE 0 OR Len(theEMP_NUM) EQ 0
	      OR Len(theShiftStart) EQ 0 OR Len(theShiftEnd) EQ 0>
		<cfset response["success"] = false>
		<cfset response["data"]    = "">
		<cfset response["error"]   = "Missing required query parameters.">
		<cfoutput>#SerializeJSON(response)#</cfoutput>
		<cfabort>
	</cfif>

	<cfquery name="stats" datasource="#datasourceExt#">
		SELECT
			ISNULL(SUM(TotalGood), 0) AS sumGood,
			ISNULL(SUM(TotalDef),  0) AS sumDef,
			ISNULL(SUM(DATEDIFF(SECOND, '00:00:00', PR_TotalTime)), 0) AS totalSeconds
		FROM dbo.WUI_ProductionRuns
		WHERE TRANSAC = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#theTRANSAC#">
		  AND NOPSEQ  = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#theNOPSEQ#">
		  AND OPSEQ   = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#theOPSEQ#">
		  AND MASEQ   = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#theMASEQ#">
		  AND (
		        (INSEQ = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#theINSEQ#" null="#NOT IsNumeric(theINSEQ)#">)
		        OR (INSEQ IS NULL AND <cfqueryparam cfsqltype="CF_SQL_BIT" value="#NOT IsNumeric(theINSEQ)#">)
		      )
		  AND (
		        (NISEQ = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#theNISEQ#" null="#NOT IsNumeric(theNISEQ)#">)
		        OR (NISEQ IS NULL AND <cfqueryparam cfsqltype="CF_SQL_BIT" value="#NOT IsNumeric(theNISEQ)#">)
		      )
		  AND EMP_NUM = <cfqueryparam cfsqltype="CF_SQL_VARCHAR" maxlength="5" value="#theEMP_NUM#">
		  AND COALESCE(PR_LastUpdate, PR_Start) >= <cfqueryparam cfsqltype="CF_SQL_TIMESTAMP" value="#theShiftStart#">
		  AND COALESCE(PR_LastUpdate, PR_Start) <  <cfqueryparam cfsqltype="CF_SQL_TIMESTAMP" value="#theShiftEnd#">
	</cfquery>

	<cfset data = StructNew("ordered")>
	<cfset data["sumGood"]      = Val(stats.sumGood)>
	<cfset data["sumDef"]       = Val(stats.sumDef)>
	<cfset data["totalSeconds"] = Val(stats.totalSeconds)>

	<cfset response["success"] = true>
	<cfset response["data"]    = data>

	<cfcatch type="any">
		<cfset response = StructNew()>
		<cfset response["success"] = false>
		<cfset response["data"] = "">
		<cfset response["error"] = cfcatch.message & " " & cfcatch.detail>
	</cfcatch>
</cftry>

<cfoutput>#SerializeJSON(response)#</cfoutput>
</cfsilent>
