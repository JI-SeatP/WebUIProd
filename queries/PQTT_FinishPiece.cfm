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

	<!--- Read JSON body --->
	<cfset requestBody = DeserializeJSON(GetHttpRequestData().content)>

	<cfset thePRSEQ       = Val(requestBody["PRSEQ"])>
	<cfset thePRDETSEQ    = Val(requestBody["PRDETSEQ"])>
	<cfset theKind        = UCase(Trim(requestBody["kind"] ?: ""))>      <!--- GOOD or DEF --->
	<cfset thePieceSec    = Val(requestBody["pieceSeconds"])>
	<cfset theShiftStart  = requestBody["shiftStart"]>                    <!--- ISO datetime --->
	<cfset theShiftEnd    = requestBody["shiftEnd"]>

	<cfif thePRSEQ LTE 0 OR thePRDETSEQ LTE 0 OR thePieceSec LT 0
	      OR (theKind NEQ "GOOD" AND theKind NEQ "DEF")>
		<cfset response["success"] = false>
		<cfset response["data"]    = "">
		<cfset response["error"]   = "Invalid input.">
		<cfoutput>#SerializeJSON(response)#</cfoutput>
		<cfabort>
	</cfif>

	<cfset qtyGood = (theKind EQ "GOOD") ? 1 : 0>
	<cfset qtyDef  = (theKind EQ "GOOD") ? 0 : 1>

	<cftransaction action="begin">
		<!--- ============================================================
		      STEP 1: Close the supplied PRDETSEQ.
		      Idempotent guard: only if still open.
		      ============================================================ --->
		<cfquery name="closeDet" datasource="#datasourceExt#" result="closeDetMeta">
			UPDATE dbo.WUI_ProductionRunDetails
			SET PR_DetEnd = SYSDATETIME(),
			    QtyGood   = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#qtyGood#">,
			    QtyDef    = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#qtyDef#">
			WHERE PRDETSEQ = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#thePRDETSEQ#">
			  AND PRSEQ    = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#thePRSEQ#">
			  AND PR_DetEnd IS NULL
		</cfquery>

		<cfif closeDetMeta.RecordCount EQ 0>
			<cftransaction action="rollback">
			<cfset response["success"] = false>
			<cfset response["data"]    = "">
			<cfset response["error"]   = "PRDETSEQ not found or already closed.">
			<cfoutput>#SerializeJSON(response)#</cfoutput>
			<cfabort>
		</cfif>

		<!--- ============================================================
		      STEP 2: Increment PRSEQ totals + add seconds to PR_TotalTime.
		      ============================================================ --->
		<cfquery datasource="#datasourceExt#">
			UPDATE dbo.WUI_ProductionRuns
			SET TotalGood     = TotalGood + <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#qtyGood#">,
			    TotalDef      = TotalDef  + <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#qtyDef#">,
			    PR_LastUpdate = SYSDATETIME(),
			    PR_TotalTime  = CAST(DATEADD(
			        SECOND,
			        <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#thePieceSec#">,
			        CAST(PR_TotalTime AS DATETIME)
			    ) AS TIME(0))
			WHERE PRSEQ = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#thePRSEQ#">
		</cfquery>

		<!--- ============================================================
		      STEP 3: Open a fresh PRDETSEQ for this PRSEQ.
		      ============================================================ --->
		<cfquery name="insertDet" datasource="#datasourceExt#">
			INSERT INTO dbo.WUI_ProductionRunDetails (PRSEQ, PR_DetStart, QtyGood, QtyDef)
			VALUES (
				<cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#thePRSEQ#">,
				SYSDATETIME(),
				0, 0
			);
			SELECT SCOPE_IDENTITY() AS NEW_PRDETSEQ, SYSDATETIME() AS PR_DetStart;
		</cfquery>

		<cfset newPRDETSEQ = Val(insertDet.NEW_PRDETSEQ)>
		<cfset newDetStart = insertDet.PR_DetStart>

		<!--- ============================================================
		      STEP 4: Read back the updated PRSEQ + the shift-scoped stats
		      across all PRSEQs on the same key + EMP_NUM.
		      ============================================================ --->
		<cfquery name="curRun" datasource="#datasourceExt#">
			SELECT TRANSAC, NOPSEQ, OPSEQ, MASEQ, INSEQ, NISEQ, EMP_NUM,
			       TotalGood, TotalDef,
			       DATEDIFF(SECOND, '00:00:00', PR_TotalTime) AS TotalSeconds
			FROM dbo.WUI_ProductionRuns
			WHERE PRSEQ = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#thePRSEQ#">
		</cfquery>

		<cfquery name="stats" datasource="#datasourceExt#">
			SELECT
				ISNULL(SUM(TotalGood), 0) AS sumGood,
				ISNULL(SUM(TotalDef),  0) AS sumDef,
				ISNULL(SUM(DATEDIFF(SECOND, '00:00:00', PR_TotalTime)), 0) AS totalSeconds
			FROM dbo.WUI_ProductionRuns
			WHERE TRANSAC = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#curRun.TRANSAC#">
			  AND NOPSEQ  = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#curRun.NOPSEQ#">
			  AND OPSEQ   = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#curRun.OPSEQ#">
			  AND MASEQ   = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#curRun.MASEQ#">
			  AND (
			        (INSEQ = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#curRun.INSEQ#" null="#NOT IsNumeric(curRun.INSEQ)#">)
			        OR (INSEQ IS NULL AND <cfqueryparam cfsqltype="CF_SQL_BIT" value="#NOT IsNumeric(curRun.INSEQ)#">)
			      )
			  AND (
			        (NISEQ = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#curRun.NISEQ#" null="#NOT IsNumeric(curRun.NISEQ)#">)
			        OR (NISEQ IS NULL AND <cfqueryparam cfsqltype="CF_SQL_BIT" value="#NOT IsNumeric(curRun.NISEQ)#">)
			      )
			  AND EMP_NUM = <cfqueryparam cfsqltype="CF_SQL_VARCHAR" maxlength="5" value="#curRun.EMP_NUM#">
			  AND COALESCE(PR_LastUpdate, PR_Start) >= <cfqueryparam cfsqltype="CF_SQL_TIMESTAMP" value="#theShiftStart#">
			  AND COALESCE(PR_LastUpdate, PR_Start) <  <cfqueryparam cfsqltype="CF_SQL_TIMESTAMP" value="#theShiftEnd#">
		</cfquery>
	</cftransaction>

	<cfset data = StructNew("ordered")>
	<cfset data["nextPRDETSEQ"] = newPRDETSEQ>
	<cfset data["PR_DetStart"]  = newDetStart>
	<cfset data["TotalGood"]    = Val(curRun.TotalGood)>
	<cfset data["TotalDef"]     = Val(curRun.TotalDef)>
	<cfset data["TotalSeconds"] = Val(curRun.TotalSeconds)>
	<cfset data["stats"]        = {
		"sumGood":      Val(stats.sumGood),
		"sumDef":       Val(stats.sumDef),
		"totalSeconds": Val(stats.totalSeconds)
	}>

	<cfset response["success"] = true>
	<cfset response["data"]    = data>
	<cfset response["message"] = "Piece logged">

	<cfcatch type="any">
		<cfset response = StructNew()>
		<cfset response["success"] = false>
		<cfset response["data"] = "">
		<cfset response["error"] = cfcatch.message & " " & cfcatch.detail>
	</cfcatch>
</cftry>

<cfoutput>#SerializeJSON(response)#</cfoutput>
</cfsilent>
