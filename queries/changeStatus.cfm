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
		<cfset datasourcePrimary = "AF_SEATPLY">
		<cfset datasourceExt = "AF_SEATPLY_EXT">
	<cfelse>
		<cfset datasourcePrimary = "TS_SEATPL">
		<cfset datasourceExt = "TS_SEATPL_EXT">
	</cfif>

	<!--- Parse JSON body --->
	<cfset requestBody = DeserializeJSON(GetHttpRequestData().content)>
	<cfset transac = Val(requestBody.transac ?: 0)>
	<cfset copmachine = Val(requestBody.copmachine ?: 0)>
	<cfset newStatus = requestBody.newStatus ?: "">
	<cfset employeeCode = Val(requestBody.employeeCode ?: 0)>

	<cfif transac EQ 0 OR Len(Trim(newStatus)) EQ 0>
		<cfset response["success"] = false>
		<cfset response["error"] = "transac and newStatus are required">
		<cfoutput>#SerializeJSON(response)#</cfoutput><cfabort>
	</cfif>

	<!--- Map frontend action to MODEPROD.MPCODE --->
	<cfswitch expression="#newStatus#">
		<cfcase value="SETUP"><cfset mpcode = "Setup"></cfcase>
		<cfcase value="PROD"><cfset mpcode = "Prod"></cfcase>
		<cfcase value="PAUSE"><cfset mpcode = "PAUSE"></cfcase>
		<cfcase value="STOP"><cfset mpcode = "STOP"></cfcase>
		<cfcase value="COMP"><cfset mpcode = "COMP"></cfcase>
		<cfcase value="ON_HOLD"><cfset mpcode = "HOLD"></cfcase>
		<cfcase value="READY"><cfset mpcode = "READY"></cfcase>
		<cfdefaultcase>
			<cfset response["success"] = false>
			<cfset response["error"] = "Unknown status: #newStatus#">
			<cfoutput>#SerializeJSON(response)#</cfoutput><cfabort>
		</cfdefaultcase>
	</cfswitch>

	<!--- Server time (consistent across all operations in this request) --->
	<cfquery name="qTime" datasource="#datasourcePrimary#">
		SELECT FORMAT(GETDATE(), 'yyyy-MM-dd') AS d, FORMAT(GETDATE(), 'HH:mm:ss') AS t
	</cfquery>
	<cfset dateStr = qTime.d>
	<cfset timeStr = qTime.t>

	<!--- 1. Look up MODEPROD record for the new status --->
	<cfquery name="qModeProd" datasource="#datasourcePrimary#">
		SELECT MPSEQ, MPCODE
		FROM MODEPROD
		WHERE MPCODE = <cfqueryparam cfsqltype="CF_SQL_VARCHAR" value="#mpcode#">
	</cfquery>

	<cfif qModeProd.RecordCount EQ 0>
		<cfset response["success"] = false>
		<cfset response["error"] = "MODEPROD not found for code #mpcode#">
		<cfoutput>#SerializeJSON(response)#</cfoutput><cfabort>
	</cfif>

	<!--- 2. Get operation details from vEcransProduction (EXT database) --->
	<cfquery name="qOperation" datasource="#datasourceExt#">
		SELECT TOP 1 v.OPERATION_SEQ, v.MACHINE, v.INVENTAIRE_SEQ, v.CNOMENCLATURE,
		       v.NOPSEQ, v.COPMACHINE, v.TAUXHORAIREOPERATION, v.NO_INVENTAIRE, v.PRODUIT_CODE
		FROM vEcransProduction v
		WHERE v.TRANSAC = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#transac#">
		<cfif copmachine NEQ 0>
			AND v.COPMACHINE = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#copmachine#">
		</cfif>
		AND v.OPERATION <> 'FINSH'
	</cfquery>

	<cfif qOperation.RecordCount EQ 0>
		<cfset response["success"] = false>
		<cfset response["error"] = "Operation not found for transac=#transac#">
		<cfoutput>#SerializeJSON(response)#</cfoutput><cfabort>
	</cfif>

	<!--- 3. Employee EMSEQ from request body (no query needed) --->
	<cfset employeeSeq = Val(employeeCode)>

	<!--- 4. Find the most recent TEMPSPROD row with a DIFFERENT status (trouveDernierStatut) --->
	<cfquery name="qPrevRow" datasource="#datasourcePrimary#">
		SELECT TOP 1 TJSEQ, EMPLOYE, OPERATION, MACHINE, cNOMENCLATURE, INVENTAIRE_C,
		       CNOMENCOP, cNomencOp_Machine, MODEPROD_MPCODE,
		       TJDEBUTDATE, TJQTEPROD, TJQTEDEFECT, SMNOTRANS
		FROM TEMPSPROD
		WHERE TRANSAC = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#transac#">
		AND CNOMENCOP = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#Val(qOperation.NOPSEQ)#">
		AND MODEPROD_MPCODE <> <cfqueryparam cfsqltype="CF_SQL_VARCHAR" value="#mpcode#">
		AND TJNOTE LIKE 'Ecran de production pour Temps prod%'
		<cfif copmachine NEQ 0>
			AND cNomencOp_Machine = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#copmachine#">
		</cfif>
		ORDER BY TJSEQ DESC
	</cfquery>

	<cfset tjNote = "Ecran de production pour Temps prod New">
	<cfset LeTJSEQ = 0>
	<cfset hasPrevRow = (qPrevRow.RecordCount GE 1)>

	<!--- PATH A: If no previous row and status is not SETUP, create initial PROD row first --->
	<cfif qPrevRow.RecordCount EQ 0 AND mpcode NEQ "Setup">
		<cfquery name="qProdMp" datasource="#datasourcePrimary#">
			SELECT MPSEQ FROM MODEPROD WHERE MPCODE = 'Prod'
		</cfquery>
		<cfif qProdMp.RecordCount GT 0>
			<!--- Insert initial PROD row via SP --->
			<cfstoredproc procedure="Nba_Sp_Insert_Production" datasource="#datasourcePrimary#">
				<cfprocparam type="in" cfsqltype="CF_SQL_INTEGER" value="#employeeSeq#">
				<cfprocparam type="in" cfsqltype="CF_SQL_FLOAT" value="0">
				<cfprocparam type="in" cfsqltype="CF_SQL_INTEGER" value="#Val(qOperation.OPERATION_SEQ)#">
				<cfprocparam type="in" cfsqltype="CF_SQL_FLOAT" value="0">
				<cfprocparam type="in" cfsqltype="CF_SQL_INTEGER" value="#Val(qOperation.MACHINE)#">
				<cfprocparam type="in" cfsqltype="CF_SQL_FLOAT" value="0">
				<cfprocparam type="in" cfsqltype="CF_SQL_INTEGER" value="#transac#">
				<cfprocparam type="in" cfsqltype="CF_SQL_INTEGER" value="0">
				<cfprocparam type="in" cfsqltype="CF_SQL_VARCHAR" value="">
				<cfprocparam type="in" cfsqltype="CF_SQL_INTEGER" value="#Val(qOperation.CNOMENCLATURE)#">
				<cfprocparam type="in" cfsqltype="CF_SQL_INTEGER" value="#Val(qOperation.INVENTAIRE_SEQ)#">
				<cfprocparam type="in" cfsqltype="CF_SQL_FLOAT" value="0">
				<cfprocparam type="in" cfsqltype="CF_SQL_FLOAT" value="0">
				<cfprocparam type="in" cfsqltype="CF_SQL_BIT" value="1">
				<cfprocparam type="in" cfsqltype="CF_SQL_BIT" value="0">
				<cfprocparam type="in" cfsqltype="CF_SQL_CHAR" value="#dateStr#">
				<cfprocparam type="in" cfsqltype="CF_SQL_CHAR" value="#timeStr#">
				<cfprocparam type="in" cfsqltype="CF_SQL_CHAR" value="">
				<cfprocparam type="in" cfsqltype="CF_SQL_CHAR" value="">
				<cfprocparam type="in" cfsqltype="CF_SQL_INTEGER" value="#Val(qProdMp.MPSEQ)#">
				<cfprocparam type="in" cfsqltype="CF_SQL_VARCHAR" value="#tjNote#">
				<cfprocparam type="in" cfsqltype="CF_SQL_INTEGER" value="0">
				<cfprocparam type="in" cfsqltype="CF_SQL_CHAR" value="">
				<cfprocparam type="in" cfsqltype="CF_SQL_INTEGER" value="#IIF(copmachine NEQ 0, copmachine, Val(qOperation.COPMACHINE))#">
				<cfprocparam type="out" cfsqltype="CF_SQL_INTEGER" variable="pathATjseq">
				<cfprocparam type="out" cfsqltype="CF_SQL_INTEGER" variable="pathAErreur">
			</cfstoredproc>

			<!--- Re-query to find the row we just created as "previous" --->
			<cfquery name="qPrevRow" datasource="#datasourcePrimary#">
				SELECT TOP 1 TJSEQ, EMPLOYE, OPERATION, MACHINE, cNOMENCLATURE, INVENTAIRE_C,
				       CNOMENCOP, cNomencOp_Machine, MODEPROD_MPCODE,
				       TJDEBUTDATE, TJQTEPROD, TJQTEDEFECT, SMNOTRANS
				FROM TEMPSPROD
				WHERE TRANSAC = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#transac#">
				AND CNOMENCOP = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#Val(qOperation.NOPSEQ)#">
				AND MODEPROD_MPCODE <> <cfqueryparam cfsqltype="CF_SQL_VARCHAR" value="#mpcode#">
				AND TJNOTE LIKE 'Ecran de production pour Temps prod%'
				<cfif copmachine NEQ 0>
					AND cNomencOp_Machine = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#copmachine#">
				</cfif>
				ORDER BY TJSEQ DESC
			</cfquery>
			<cfset hasPrevRow = (qPrevRow.RecordCount GE 1)>
		</cfif>
	</cfif>

	<!--- Step 7: Close previous row via Nba_Sp_Update_Production --->
	<cfif hasPrevRow>
		<cfset prevDateStr = DateFormat(qPrevRow.TJDEBUTDATE, 'yyyy-mm-dd')>
		<cfset prevTimeStr = TimeFormat(qPrevRow.TJDEBUTDATE, 'HH:nn:ss')>

		<cfstoredproc procedure="Nba_Sp_Update_Production" datasource="#datasourcePrimary#">
			<cfprocparam type="in" cfsqltype="CF_SQL_INTEGER" value="#Val(qPrevRow.TJSEQ)#">
			<cfprocparam type="in" cfsqltype="CF_SQL_INTEGER" value="#Val(qPrevRow.EMPLOYE)#">
			<!--- OPERATION and MACHINE: always use CURRENT operation (matches old software) --->
			<cfprocparam type="in" cfsqltype="CF_SQL_INTEGER" value="#Val(qOperation.OPERATION_SEQ)#">
			<cfprocparam type="in" cfsqltype="CF_SQL_INTEGER" value="#Val(qOperation.MACHINE)#">
			<cfprocparam type="in" cfsqltype="CF_SQL_INTEGER" value="#transac#">
			<cfprocparam type="in" cfsqltype="CF_SQL_VARCHAR" value="">
			<cfprocparam type="in" cfsqltype="CF_SQL_VARCHAR" value="">
			<!--- cNOMENCLATURE: use previous row value only (matches old software) --->
			<cfprocparam type="in" cfsqltype="CF_SQL_INTEGER" value="#Val(qPrevRow.cNOMENCLATURE)#">
			<!--- INVENTAIRE_C: use CURRENT operation (matches old software) --->
			<cfprocparam type="in" cfsqltype="CF_SQL_INTEGER" value="#Val(qOperation.INVENTAIRE_SEQ)#">
			<cfprocparam type="in" cfsqltype="CF_SQL_BIT" value="1">
			<cfprocparam type="in" cfsqltype="CF_SQL_BIT" value="0">
			<cfprocparam type="in" cfsqltype="CF_SQL_FLOAT" value="#Val(qPrevRow.TJQTEPROD)#">
			<cfprocparam type="in" cfsqltype="CF_SQL_FLOAT" value="#Val(qPrevRow.TJQTEDEFECT)#">
			<cfprocparam type="in" cfsqltype="CF_SQL_CHAR" value="#prevDateStr#">
			<cfprocparam type="in" cfsqltype="CF_SQL_CHAR" value="#prevTimeStr#">
			<cfprocparam type="in" cfsqltype="CF_SQL_CHAR" value="#dateStr#">
			<cfprocparam type="in" cfsqltype="CF_SQL_CHAR" value="#timeStr#">
			<cfprocparam type="in" cfsqltype="CF_SQL_VARCHAR" value="#Left(Trim(qPrevRow.MODEPROD_MPCODE), 5)#">
			<cfprocparam type="in" cfsqltype="CF_SQL_VARCHAR" value="#tjNote#">
			<cfprocparam type="in" cfsqltype="CF_SQL_CHAR" value="#Left(qPrevRow.SMNOTRANS, 9)#">
			<cfprocparam type="out" cfsqltype="CF_SQL_INTEGER" variable="updateErreur">
		</cfstoredproc>
	</cfif>

	<!--- Step 8: Insert new TEMPSPROD row for the new status --->
	<!--- COMP: set end date/time to NOW (old software closes COMP rows immediately) --->
	<cfif mpcode EQ "COMP">
		<cfset insertDateF = dateStr>
		<cfset insertTimeF = timeStr>
	<cfelse>
		<cfset insertDateF = "">
		<cfset insertTimeF = "">
	</cfif>

	<cfstoredproc procedure="Nba_Sp_Insert_Production" datasource="#datasourcePrimary#">
		<cfprocparam type="in" cfsqltype="CF_SQL_INTEGER" value="#employeeSeq#">
		<cfprocparam type="in" cfsqltype="CF_SQL_FLOAT" value="0">
		<cfprocparam type="in" cfsqltype="CF_SQL_INTEGER" value="#Val(qOperation.OPERATION_SEQ)#">
		<cfprocparam type="in" cfsqltype="CF_SQL_FLOAT" value="0">
		<cfprocparam type="in" cfsqltype="CF_SQL_INTEGER" value="#Val(qOperation.MACHINE)#">
		<cfprocparam type="in" cfsqltype="CF_SQL_FLOAT" value="0">
		<cfprocparam type="in" cfsqltype="CF_SQL_INTEGER" value="#transac#">
		<cfprocparam type="in" cfsqltype="CF_SQL_INTEGER" value="0">
		<cfprocparam type="in" cfsqltype="CF_SQL_VARCHAR" value="">
		<cfprocparam type="in" cfsqltype="CF_SQL_INTEGER" value="#Val(qOperation.CNOMENCLATURE)#">
		<cfprocparam type="in" cfsqltype="CF_SQL_INTEGER" value="#Val(qOperation.INVENTAIRE_SEQ)#">
		<cfprocparam type="in" cfsqltype="CF_SQL_FLOAT" value="0">
		<cfprocparam type="in" cfsqltype="CF_SQL_FLOAT" value="0">
		<cfprocparam type="in" cfsqltype="CF_SQL_BIT" value="1">
		<cfprocparam type="in" cfsqltype="CF_SQL_BIT" value="0">
		<cfprocparam type="in" cfsqltype="CF_SQL_CHAR" value="#dateStr#">
		<cfprocparam type="in" cfsqltype="CF_SQL_CHAR" value="#timeStr#">
		<cfprocparam type="in" cfsqltype="CF_SQL_CHAR" value="#insertDateF#">
		<cfprocparam type="in" cfsqltype="CF_SQL_CHAR" value="#insertTimeF#">
		<cfprocparam type="in" cfsqltype="CF_SQL_INTEGER" value="#Val(qModeProd.MPSEQ)#">
		<cfprocparam type="in" cfsqltype="CF_SQL_VARCHAR" value="#tjNote#">
		<cfprocparam type="in" cfsqltype="CF_SQL_INTEGER" value="0">
		<cfprocparam type="in" cfsqltype="CF_SQL_CHAR" value="">
		<cfprocparam type="in" cfsqltype="CF_SQL_INTEGER" value="#IIF(copmachine NEQ 0, copmachine, Val(qOperation.COPMACHINE))#">
		<cfprocparam type="out" cfsqltype="CF_SQL_INTEGER" variable="LeTJSEQ">
		<cfprocparam type="out" cfsqltype="CF_SQL_INTEGER" variable="insertErreur">
	</cfstoredproc>

	<!--- Step 9: Post-insert — Update CNOMENCOP and INVENTAIRE_C --->
	<cfif Val(LeTJSEQ) GT 0 AND Val(qOperation.NOPSEQ) GT 0>
		<cfquery datasource="#datasourcePrimary#">
			UPDATE TEMPSPROD
			SET CNOMENCOP = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#Val(qOperation.NOPSEQ)#">,
			    INVENTAIRE_C = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#Val(qOperation.INVENTAIRE_SEQ)#">
			WHERE TJSEQ = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#Val(LeTJSEQ)#">
		</cfquery>

		<!--- Step 10: Mark operation started in PL_RESULTAT --->
		<cfquery datasource="#datasourcePrimary#">
			UPDATE PL_RESULTAT
			SET PR_DEBUTE = 1,
			    MODEPROD = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#Val(qModeProd.MPSEQ)#">
			WHERE CNOMENCOP = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#Val(qOperation.NOPSEQ)#">
		</cfquery>

		<!--- Step 11: PAUSE/STOP/COMP — Zero out cost fields --->
		<cfif mpcode EQ "PAUSE" OR mpcode EQ "STOP" OR mpcode EQ "COMP">
			<cfquery datasource="#datasourcePrimary#">
				UPDATE TEMPSPROD SET
					TJEMTAUXHOR = 0, TJOPTAUXHOR = 0, TJMATAUXHOR = 0,
					TJSYSTEMPSHOMME = 0, TJTEMPSHOMME = 0,
					TJEMCOUT = 0, TJOPCOUT = 0, TJMACOUT = 0
				WHERE TJSEQ = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#Val(LeTJSEQ)#">
			</cfquery>
		</cfif>

		<!--- Step 12-13: STOP/COMP (non-VCUT) — Recalculate costs --->
		<cfset isVcut = (qOperation.NO_INVENTAIRE EQ "VCUT") OR (qOperation.PRODUIT_CODE EQ "VCUT")>
		<cfif (mpcode EQ "STOP" OR mpcode EQ "COMP") AND NOT isVcut AND hasPrevRow>
			<!--- Recalculate costs on previous PROD row --->
			<cftry>
				<cfquery datasource="#datasourcePrimary#">
					UPDATE TEMPSPROD SET
						TJSYSTEMPSHOMME = ISNULL(COUTS_TEMPSPROD.CALCSYSTEMPSHOMME, 0),
						TJTEMPSHOMME    = ISNULL(COUTS_TEMPSPROD.CALCTEMPSHOMME, 0),
						TJEMCOUT        = ISNULL(COUTS_TEMPSPROD.CALCEMCOUT, 0),
						TJOPCOUT        = ISNULL(COUTS_TEMPSPROD.CALCOPCOUT, 0),
						TJMACOUT        = ISNULL(COUTS_TEMPSPROD.CALCMACOUT, 0),
						TJVALEUR_MATIERE = ISNULL(COUTS_TEMPSPROD.VALEUR_MATIERE, 0)
					FROM TEMPSPROD
					INNER JOIN dbo.FctCalculTempsDeProduction(<cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#Val(qPrevRow.TJSEQ)#">) COUTS_TEMPSPROD
						ON (COUTS_TEMPSPROD.TJSEQ = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#Val(qPrevRow.TJSEQ)#">)
					WHERE TEMPSPROD.TJSEQ = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#Val(qPrevRow.TJSEQ)#">
				</cfquery>
				<cfcatch type="any">
					<!--- Log but continue (matches old software behavior) --->
				</cfcatch>
			</cftry>

			<!--- Recalculate SETUP row costs if operation has setup time --->
			<cftry>
				<cfquery name="qSetupCheck" datasource="#datasourcePrimary#">
					SELECT NOPTEMPSETUP
					FROM CNOMENCOP
					WHERE NOPSEQ = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#Val(qOperation.NOPSEQ)#">
				</cfquery>

				<!--- Old software: NEQ 0 (includes negatives) --->
				<cfif qSetupCheck.RecordCount GT 0 AND Val(qSetupCheck.NOPTEMPSETUP) NEQ 0>
					<cfquery name="qSetupRow" datasource="#datasourcePrimary#">
						SELECT TOP 1 TJSEQ FROM TEMPSPROD
						WHERE TRANSAC = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#transac#">
						AND CNOMENCOP = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#Val(qOperation.NOPSEQ)#">
						AND MODEPROD_MPCODE = 'Setup'
						AND TJNOTE LIKE 'Ecran de production pour Temps prod%'
						<cfif copmachine NEQ 0>
							AND cNomencOp_Machine = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#copmachine#">
						</cfif>
						ORDER BY TJSEQ DESC
					</cfquery>

					<cfif qSetupRow.RecordCount GT 0>
						<cfquery datasource="#datasourcePrimary#">
							UPDATE TEMPSPROD SET
								TJSYSTEMPSHOMME = ISNULL(COUTS_TEMPSPROD.CALCSYSTEMPSHOMME, 0),
								TJTEMPSHOMME    = ISNULL(COUTS_TEMPSPROD.CALCTEMPSHOMME, 0),
								TJEMCOUT        = ISNULL(COUTS_TEMPSPROD.CALCEMCOUT, 0),
								TJOPCOUT        = ISNULL(COUTS_TEMPSPROD.CALCOPCOUT, 0),
								TJMACOUT        = ISNULL(COUTS_TEMPSPROD.CALCMACOUT, 0)
							FROM TEMPSPROD
							INNER JOIN dbo.FctCalculTempsDeProduction(<cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#Val(qSetupRow.TJSEQ)#">) COUTS_TEMPSPROD
								ON (COUTS_TEMPSPROD.TJSEQ = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#Val(qSetupRow.TJSEQ)#">)
							WHERE TEMPSPROD.TJSEQ = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#Val(qSetupRow.TJSEQ)#">
						</cfquery>
					</cfif>
				</cfif>
				<cfcatch type="any">
					<!--- Log but continue (matches old software behavior) --->
				</cfcatch>
			</cftry>
		</cfif>
	</cfif>

	<!--- Return response --->
	<cfset data = StructNew("ordered")>
	<cfset data["transac"] = transac>
	<cfset data["copmachine"] = copmachine>
	<cfset data["newStatus"] = newStatus>
	<cfset data["tjseq"] = Val(LeTJSEQ)>

	<cfset response["success"] = true>
	<cfset response["data"] = data>
	<cfset response["message"] = "Status changed to #newStatus#">

	<cfcatch type="any">
		<cfset response = StructNew()>
		<cfset response["success"] = false>
		<cfset response["data"] = StructNew()>
		<cfset response["error"] = cfcatch.message & " " & cfcatch.detail>
	</cfcatch>
</cftry>

<cfoutput>#SerializeJSON(response)#</cfoutput>
</cfsilent>
