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

	<cfset theMACODE  = Left(Trim(url.MACODE ?: ""), 50)>
	<cfset theTRANSAC = Val(url.TRANSAC ?: 0)>           <!--- mapped to TRSEQ --->
	<cfset theINSEQ   = Val(url.INSEQ ?: 0)>             <!--- mapped to INVENTAIRE --->
	<cfset theOPSEQ   = Val(url.OPSEQ ?: 0)>             <!--- mapped to OPCODE column --->
	<cfset theNISEQ   = (StructKeyExists(url, "NISEQ") AND IsNumeric(url.NISEQ)) ? Val(url.NISEQ) : "">

	<cfif Len(theMACODE) EQ 0 OR theTRANSAC LTE 0 OR theINSEQ LTE 0 OR theOPSEQ LTE 0>
		<cfset response["success"] = false>
		<cfset response["data"]    = "">
		<cfset response["error"]   = "Missing required parameters (MACODE, TRANSAC, INSEQ, OPSEQ).">
		<cfoutput>#SerializeJSON(response)#</cfoutput>
		<cfabort>
	</cfif>

	<cfquery name="target" datasource="#datasourceExt#">
		SELECT
			MACHINE_CODE AS MACODE,
			OPCODE       AS OPSEQ,
			NISEQ,
			TRSEQ        AS TRANSAC,
			INVENTAIRE   AS INSEQ,
			PT_LoadTime + PT_OpTime + PT_UnloadTime           AS TargetTimePerPiece,
			PT_Delay                                          AS PT_Delay,
			CASE
				WHEN (PT_LoadTime + PT_OpTime + PT_UnloadTime + PT_Delay) > 0
				THEN ROUND(3600.0 / (PT_LoadTime + PT_OpTime + PT_UnloadTime + PT_Delay), 2)
				ELSE NULL
			END AS TargetAvgPcsHour,
			CASE
				WHEN (PT_LoadTime + PT_OpTime + PT_UnloadTime) > 0
				THEN ROUND(3600.0 / (PT_LoadTime + PT_OpTime + PT_UnloadTime), 2)
				ELSE NULL
			END AS TargetAvgPcsHour_Min
		FROM dbo.WUI_WOPM_Targets
		WHERE MACHINE_CODE = <cfqueryparam cfsqltype="CF_SQL_VARCHAR" maxlength="50" value="#theMACODE#">
		  AND TRSEQ        = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#theTRANSAC#">
		  AND INVENTAIRE   = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#theINSEQ#">
		  AND OPCODE       = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#theOPSEQ#">
		  AND (
		        (NISEQ = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#theNISEQ#" null="#NOT IsNumeric(theNISEQ)#">)
		        OR (NISEQ IS NULL AND <cfqueryparam cfsqltype="CF_SQL_BIT" value="#NOT IsNumeric(theNISEQ)#">)
		      )
	</cfquery>

	<cfif target.RecordCount EQ 1 AND IsNumeric(target.TargetTimePerPiece) AND Val(target.TargetTimePerPiece) GT 0>
		<cfset row = StructNew("ordered")>
		<cfset row["MACODE"]              = target.MACODE>
		<cfset row["OPSEQ"]               = Val(target.OPSEQ)>
		<cfset row["NISEQ"]               = (Len(target.NISEQ) GT 0) ? Val(target.NISEQ) : JavaCast("null", "")>
		<cfset row["TRANSAC"]             = Val(target.TRANSAC)>
		<cfset row["INSEQ"]               = Val(target.INSEQ)>
		<cfset row["TargetTimePerPiece"]  = Val(target.TargetTimePerPiece)>
		<cfset row["PT_Delay"]            = Val(target.PT_Delay)>
		<cfset row["TargetAvgPcsHour"]    = IsNumeric(target.TargetAvgPcsHour)     ? target.TargetAvgPcsHour     : JavaCast("null", "")>
		<cfset row["TargetAvgPcsHour_Min"] = IsNumeric(target.TargetAvgPcsHour_Min) ? target.TargetAvgPcsHour_Min : JavaCast("null", "")>

		<cfset response["success"] = true>
		<cfset response["data"]    = row>
	<cfelse>
		<cfset response["success"] = true>
		<cfset response["data"]    = JavaCast("null", "")>
		<cfset response["message"] = "No target row defined for this operation">
	</cfif>

	<cfcatch type="any">
		<cfset response = StructNew()>
		<cfset response["success"] = false>
		<cfset response["data"] = "">
		<cfset response["error"] = cfcatch.message & " " & cfcatch.detail>
	</cfcatch>
</cftry>

<cfoutput>#SerializeJSON(response)#</cfoutput>
</cfsilent>
