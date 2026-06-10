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

	<cfset theTRANSAC = Val(requestBody["TRANSAC"])>
	<cfset theOPSEQ   = Val(requestBody["OPSEQ"])>
	<cfset theOPCODE  = Left(Trim(requestBody["OPCODE"] ?: ""), 20)>
	<cfset theINSEQ   = (StructKeyExists(requestBody, "INSEQ")  AND IsNumeric(requestBody["INSEQ"]))  ? Val(requestBody["INSEQ"])  : "">
	<cfset theMASEQ   = Val(requestBody["MASEQ"])>
	<cfset theNOPSEQ  = Val(requestBody["NOPSEQ"])>
	<cfset theTJSEQ   = (StructKeyExists(requestBody, "TJSEQ")  AND IsNumeric(requestBody["TJSEQ"]))  ? Val(requestBody["TJSEQ"])  : "">
	<cfset theNISEQ   = (StructKeyExists(requestBody, "NISEQ")  AND IsNumeric(requestBody["NISEQ"]))  ? Val(requestBody["NISEQ"])  : "">
	<cfset theEMP_NUM = Left(Trim(requestBody["EMP_NUM"] ?: ""), 5)>

	<cfif theTRANSAC LTE 0 OR theMASEQ LTE 0 OR Len(theEMP_NUM) EQ 0>
		<cfset response["success"] = false>
		<cfset response["data"] = "">
		<cfset response["error"] = "Missing required fields (TRANSAC, MASEQ, EMP_NUM).">
		<cfoutput>#SerializeJSON(response)#</cfoutput>
		<cfabort>
	</cfif>

	<cftransaction action="begin">
		<!--- ============================================================
		      STEP 1: Look for a resumable open PRSEQ.
		      A run is "resumable" when it's open (PR_End IS NULL), matches
		      the full operation key, AND was last touched by the SAME
		      operator. If found, we reuse it instead of opening a fresh
		      PRSEQ — that's how the timer survives a page refresh / remount.
		      ============================================================ --->
		<cfquery name="findResumable" datasource="#datasourceExt#">
			SELECT TOP 1
				PRSEQ, PR_Start, PR_LastUpdate, TotalGood, TotalDef,
				DATEDIFF(SECOND, '00:00:00', PR_TotalTime) AS PR_TotalSeconds
			FROM dbo.WUI_ProductionRuns
			WHERE PR_End IS NULL
				AND TRANSAC = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#theTRANSAC#">
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
			AND COALESCE(PR_LastUpdate, PR_Start) >= DATEADD(MINUTE, -5, SYSDATETIME())
			ORDER BY COALESCE(PR_LastUpdate, PR_Start) DESC
		</cfquery>

		<cfset resumePRSEQ = (findResumable.RecordCount GT 0) ? Val(findResumable.PRSEQ) : 0>

		<!--- ============================================================
		      STEP 2: Defensive close — any OTHER open PRSEQ on this key
		      (different operator, duplicates, etc.) gets closed.
		      ============================================================ --->
		<cfquery name="findOrphans" datasource="#datasourceExt#">
			SELECT PRSEQ, COALESCE(PR_LastUpdate, PR_Start) AS ClosingStamp
			FROM dbo.WUI_ProductionRuns
			WHERE PR_End IS NULL
				AND TRANSAC = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#theTRANSAC#">
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
				<cfif resumePRSEQ GT 0>
					AND PRSEQ <> <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#resumePRSEQ#">
				</cfif>
		</cfquery>

		<cfloop query="findOrphans">
			<cfquery datasource="#datasourceExt#">
				UPDATE dbo.WUI_ProductionRunDetails
				SET PR_DetEnd = <cfqueryparam cfsqltype="CF_SQL_TIMESTAMP" value="#findOrphans.ClosingStamp#">,
				    QtyGood   = 0,
				    QtyDef    = 0
				WHERE PRSEQ = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#findOrphans.PRSEQ#">
				  AND PR_DetEnd IS NULL
			</cfquery>
			<cfquery datasource="#datasourceExt#">
				UPDATE dbo.WUI_ProductionRuns
				SET PR_End        = <cfqueryparam cfsqltype="CF_SQL_TIMESTAMP" value="#findOrphans.ClosingStamp#">,
				    PR_LastUpdate = <cfqueryparam cfsqltype="CF_SQL_TIMESTAMP" value="#findOrphans.ClosingStamp#">
				WHERE PRSEQ = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#findOrphans.PRSEQ#">
				  AND PR_End IS NULL
			</cfquery>
		</cfloop>

		<cfif resumePRSEQ GT 0>
			<!--- ====================================================
			      STEP 3a: RESUME path
			      ==================================================== --->
			<cfquery name="findOpenDet" datasource="#datasourceExt#">
				SELECT TOP 1 PRDETSEQ, PR_DetStart,
				       DATEDIFF(SECOND, PR_DetStart, SYSDATETIME()) AS PieceElapsedSec
				FROM dbo.WUI_ProductionRunDetails
				WHERE PRSEQ = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#resumePRSEQ#">
				  AND PR_DetEnd IS NULL
				ORDER BY PRDETSEQ DESC
			</cfquery>

			<cfif findOpenDet.RecordCount GT 0>
				<cfset resumePRDETSEQ    = Val(findOpenDet.PRDETSEQ)>
				<cfset resumeDetStart    = findOpenDet.PR_DetStart>
				<cfset resumeElapsedSec  = Val(findOpenDet.PieceElapsedSec)>
			<cfelse>
				<cfquery name="newOpenDet" datasource="#datasourceExt#">
					INSERT INTO dbo.WUI_ProductionRunDetails (PRSEQ, PR_DetStart, QtyGood, QtyDef)
					VALUES (
						<cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#resumePRSEQ#">,
						SYSDATETIME(),
						0, 0
					);
					SELECT SCOPE_IDENTITY() AS NEW_PRDETSEQ, SYSDATETIME() AS PR_DetStart;
				</cfquery>
				<cfset resumePRDETSEQ   = Val(newOpenDet.NEW_PRDETSEQ)>
				<cfset resumeDetStart   = newOpenDet.PR_DetStart>
				<cfset resumeElapsedSec = 0>
			</cfif>

			<cfquery datasource="#datasourceExt#">
				UPDATE dbo.WUI_ProductionRuns
				SET PR_LastUpdate = SYSDATETIME()
				WHERE PRSEQ = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#resumePRSEQ#">
			</cfquery>

			<cfset data = StructNew("ordered")>
			<cfset data["PRSEQ"]            = resumePRSEQ>
			<cfset data["PRDETSEQ"]         = resumePRDETSEQ>
			<cfset data["PR_Start"]         = findResumable.PR_Start>
			<cfset data["PR_DetStart"]      = resumeDetStart>
			<cfset data["resumed"]          = true>
			<cfset data["pieceElapsedSec"]  = resumeElapsedSec>
			<cfset data["TotalGood"]        = Val(findResumable.TotalGood)>
			<cfset data["TotalDef"]         = Val(findResumable.TotalDef)>
			<cfset data["PR_TotalSeconds"]  = Val(findResumable.PR_TotalSeconds)>

			<cfset response["success"] = true>
			<cfset response["data"]    = data>
			<cfset response["message"] = "Production run resumed">
		<cfelse>
			<!--- ====================================================
			      STEP 3b: FRESH path (no resumable)
			      ==================================================== --->
			<cfquery name="insertRun" datasource="#datasourceExt#">
				INSERT INTO dbo.WUI_ProductionRuns (
					TRANSAC, OPSEQ, OPCODE, INSEQ, MASEQ, NOPSEQ, TJSEQ, NISEQ, EMP_NUM,
					PR_Start, PR_LastUpdate, TotalGood, TotalDef, PR_TotalTime
				) VALUES (
					<cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#theTRANSAC#">,
					<cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#theOPSEQ#">,
					<cfqueryparam cfsqltype="CF_SQL_VARCHAR" maxlength="20" value="#theOPCODE#">,
					<cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#theINSEQ#" null="#NOT IsNumeric(theINSEQ)#">,
					<cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#theMASEQ#">,
					<cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#theNOPSEQ#">,
					<cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#theTJSEQ#" null="#NOT IsNumeric(theTJSEQ)#">,
					<cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#theNISEQ#" null="#NOT IsNumeric(theNISEQ)#">,
					<cfqueryparam cfsqltype="CF_SQL_VARCHAR" maxlength="5" value="#theEMP_NUM#">,
					SYSDATETIME(),
					SYSDATETIME(),
					0, 0, '00:00:00'
				);
				SELECT SCOPE_IDENTITY() AS NEW_PRSEQ, SYSDATETIME() AS PR_Start;
			</cfquery>

			<cfset newPRSEQ = Val(insertRun.NEW_PRSEQ)>
			<cfset prStart  = insertRun.PR_Start>

			<cfquery name="insertDet" datasource="#datasourceExt#">
				INSERT INTO dbo.WUI_ProductionRunDetails (PRSEQ, PR_DetStart, QtyGood, QtyDef)
				VALUES (
					<cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#newPRSEQ#">,
					SYSDATETIME(),
					0, 0
				);
				SELECT SCOPE_IDENTITY() AS NEW_PRDETSEQ, SYSDATETIME() AS PR_DetStart;
			</cfquery>

			<cfset newPRDETSEQ = Val(insertDet.NEW_PRDETSEQ)>
			<cfset prDetStart  = insertDet.PR_DetStart>

			<cfset data = StructNew("ordered")>
			<cfset data["PRSEQ"]            = newPRSEQ>
			<cfset data["PRDETSEQ"]         = newPRDETSEQ>
			<cfset data["PR_Start"]         = prStart>
			<cfset data["PR_DetStart"]      = prDetStart>
			<cfset data["resumed"]          = false>
			<cfset data["pieceElapsedSec"]  = 0>
			<cfset data["TotalGood"]        = 0>
			<cfset data["TotalDef"]         = 0>
			<cfset data["PR_TotalSeconds"]  = 0>

			<cfset response["success"] = true>
			<cfset response["data"]    = data>
			<cfset response["message"] = "Production run started">
		</cfif>
	</cftransaction>

	<cfcatch type="any">
		<cfset response = StructNew()>
		<cfset response["success"] = false>
		<cfset response["data"] = "">
		<cfset response["error"] = cfcatch.message & " " & cfcatch.detail>
	</cfcatch>
</cftry>

<cfoutput>#SerializeJSON(response)#</cfoutput>
</cfsilent>
