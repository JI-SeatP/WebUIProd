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

	<!--- Include AutoFab SOAP utility --->
	<cfinclude template="lib/autofabSoap.cfm">

	<!--- Read JSON body --->
	<cfset requestBody = DeserializeJSON(GetHttpRequestData().content)>

	<!--- Extract fields --->
	<cfset transac = Val(requestBody["transac"])>
	<cfset copmachine = Val(requestBody["copmachine"])>
	<cfset qtype = requestBody["type"]>
	<cfset employeeCode = requestBody["employeeCode"]>
	<cfset goodQty = Val(requestBody["goodQty"])>
	<cfset nopseq = Val(requestBody["nopseq"])>

	<!--- Optional fields --->
	<cfset primaryCause = "">
	<cfif StructKeyExists(requestBody, "primaryCause")><cfset primaryCause = requestBody["primaryCause"]></cfif>
	<cfset secondaryCause = "">
	<cfif StructKeyExists(requestBody, "secondaryCause")><cfset secondaryCause = requestBody["secondaryCause"]></cfif>
	<cfset notes = "">
	<cfif StructKeyExists(requestBody, "notes")><cfset notes = requestBody["notes"]></cfif>
	<cfset moldAction = "">
	<cfif StructKeyExists(requestBody, "moldAction")><cfset moldAction = requestBody["moldAction"]></cfif>

	<!--- VCUT-specific fields --->
	<cfset isVcut = false>
	<cfif StructKeyExists(requestBody, "isVcut")><cfset isVcut = requestBody["isVcut"]></cfif>
	<cfset listeTjseq = "">
	<cfif StructKeyExists(requestBody, "listeTjseq")><cfset listeTjseq = Trim(requestBody["listeTjseq"])></cfif>
	<cfset listeEpfSeq = "">
	<cfif StructKeyExists(requestBody, "listeEpfSeq")><cfset listeEpfSeq = Trim(requestBody["listeEpfSeq"])></cfif>
	<cfset smnotrans = "">
	<cfif StructKeyExists(requestBody, "smnotrans")><cfset smnotrans = Trim(requestBody["smnotrans"])></cfif>
	<cfset listeSmseq = "">
	<cfif StructKeyExists(requestBody, "listeSmseq")><cfset listeSmseq = Trim(requestBody["listeSmseq"])></cfif>

	<!--- Map type to MPCODE --->
	<cfset mpcode = "STOP">
	<cfif qtype EQ "comp"><cfset mpcode = "COMP"></cfif>

	<!--- Server time --->
	<cfquery name="qTime" datasource="#datasourcePrimary#">
		SELECT FORMAT(GETDATE(), 'yyyy-MM-dd') AS d, FORMAT(GETDATE(), 'HH:mm:ss') AS t
	</cfquery>
	<cfset dateStr = qTime.d>
	<cfset timeStr = qTime.t>

	<!--- Load operation --->
	<cfquery name="qOperation" datasource="#datasourceExt#">
		SELECT TOP 1 v.OPERATION_SEQ, v.MACHINE, v.INVENTAIRE_SEQ, v.CNOMENCLATURE,
			v.NOPSEQ, v.COPMACHINE, v.NO_INVENTAIRE, v.PRODUIT_CODE, v.QTE_FORCEE
		FROM vEcransProduction v
		WHERE v.TRANSAC = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#transac#">
		<cfif copmachine NEQ 0>
			AND v.COPMACHINE = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#copmachine#">
		</cfif>
		AND v.OPERATION <> 'FINSH'
	</cfquery>

	<!--- Resolve employee EMSEQ, EMNO, EMNOM --->
	<cfquery name="qEmployee" datasource="#datasourcePrimary#">
		SELECT TOP 1 EMSEQ, EMNOIDENT, EMNOM FROM EMPLOYE
		WHERE EMNOIDENT = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#Val(employeeCode)#">
	</cfquery>
	<cfset employeeSeq = 0>
	<cfset employeeEmno = "">
	<cfset employeeName = "">
	<cfif qEmployee.RecordCount GT 0>
		<cfset employeeSeq = Val(qEmployee.EMSEQ)>
		<cfset employeeEmno = qEmployee.EMNOIDENT>
		<cfset employeeName = qEmployee.EMNOM>
	</cfif>

	<!--- Find the current PROD TEMPSPROD row (main) --->
	<cfquery name="qPrevRow" datasource="#datasourcePrimary#">
		SELECT TOP 1 TJSEQ, EMPLOYE, OPERATION, MACHINE, cNOMENCLATURE, INVENTAIRE_C,
			CNOMENCOP, cNomencOp_Machine, MODEPROD_MPCODE,
			TJDEBUTDATE, TJQTEPROD, TJQTEDEFECT, SMNOTRANS
		FROM TEMPSPROD
		WHERE TRANSAC = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#transac#">
		AND CNOMENCOP = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#nopseq#">
		AND MODEPROD_MPCODE = 'PROD'
		AND TJNOTE LIKE 'Ecran de production pour Temps prod%'
		<cfif copmachine NEQ 0>
			AND cNomencOp_Machine = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#copmachine#">
		</cfif>
		ORDER BY TJSEQ DESC
	</cfquery>

	<cfset mainTjseq = 0>
	<cfif qPrevRow.RecordCount GT 0>
		<cfset mainTjseq = Val(qPrevRow.TJSEQ)>
	</cfif>

	<!--- ============================================================ --->
	<!--- Step 1: Update employee on main TEMPSPROD (QuestionnaireSortie.cfc:700) --->
	<!--- ============================================================ --->
	<cfif mainTjseq GT 0>
		<cfquery datasource="#datasourcePrimary#">
			UPDATE TEMPSPROD
			SET EMPLOYE = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#employeeSeq#">,
				EMPLOYE_EMNO = <cfqueryparam cfsqltype="CF_SQL_VARCHAR" value="#employeeEmno#">,
				EMPLOYE_EMNOM = <cfqueryparam cfsqltype="CF_SQL_VARCHAR" value="#employeeName#">
			WHERE TJSEQ = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#mainTjseq#">
		</cfquery>
	</cfif>

	<!--- ============================================================ --->
	<!--- Step 2: SKIP changeTEMPSPROD for VCUT (I10) --->
	<!--- For non-VCUT: update TJQTEPROD, TJQTEDEFECT on main row --->
	<!--- ============================================================ --->
	<cfif NOT isVcut AND mainTjseq GT 0>
		<cfquery datasource="#datasourcePrimary#">
			UPDATE TEMPSPROD
			SET TJQTEPROD = <cfqueryparam cfsqltype="CF_SQL_FLOAT" value="#goodQty#">
			WHERE TJSEQ = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#mainTjseq#">
		</cfquery>
	</cfif>

	<!--- ============================================================ --->
	<!--- Step 3: Save stop causes to TEMPSPRODEX (QuestionnaireSortie.cfc:752) --->
	<!--- ============================================================ --->
	<cfif qtype EQ "stop" AND Len(primaryCause) GT 0 AND mainTjseq GT 0>
		<!--- Check if TEMPSPRODEX already exists --->
		<cfquery name="qExistTpex" datasource="#datasourcePrimary#">
			SELECT COUNT(*) AS cnt FROM TEMPSPRODEX WHERE TEMPSPROD = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#mainTjseq#">
		</cfquery>

		<cfif Val(qExistTpex.cnt) GT 0>
			<cfquery datasource="#datasourcePrimary#">
				UPDATE TEMPSPRODEX
				SET QA_CAUSEP = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#Val(primaryCause)#">,
					QA_CAUSES = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#Val(secondaryCause)#">,
					EXTPRD_NOTE = <cfqueryparam cfsqltype="CF_SQL_VARCHAR" value="#notes#">
				WHERE TEMPSPROD = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#mainTjseq#">
			</cfquery>
		<cfelse>
			<cfquery datasource="#datasourcePrimary#">
				INSERT INTO TEMPSPRODEX (TEMPSPROD, QA_CAUSEP, QA_CAUSES, EXTPRD_NOTE)
				VALUES (
					<cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#mainTjseq#">,
					<cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#Val(primaryCause)#">,
					<cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#Val(secondaryCause)#">,
					<cfqueryparam cfsqltype="CF_SQL_VARCHAR" value="#notes#">
				)
			</cfquery>
		</cfif>
	</cfif>

	<!--- ============================================================ --->
	<!--- Step 4: Post EPFs via AutoFab EPF/REPORT (QuestionnaireSortie.cfc:918) --->
	<!--- VCUT: NO TJPROD_TERMINE (I3) --->
	<!--- ============================================================ --->
	<cfif Len(listeEpfSeq) GT 0>
		<cfloop list="#listeEpfSeq#" index="pfseq">
			<!--- Get PFNOTRANS --->
			<cfquery name="qPfno" datasource="#datasourcePrimary#">
				SELECT PFNOTRANS FROM ENTRERPRODFINI
				WHERE PFSEQ = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#Val(pfseq)#">
			</cfquery>

			<cfif qPfno.RecordCount GT 0>
				<!--- Post EPF via AutoFab SOAP (QuestionnaireSortie.cfc:2115-2143) --->
				<cfset epfReportParams = "'#Trim(qPfno.PFNOTRANS)#';'#employeeName#'">
				<cfset epfReportResult = autofabExecuteTransaction(datasourcePrimary, "EPF", "REPORT", epfReportParams)>

				<!--- VCUT: do NOT set TJPROD_TERMINE = 1 (I3, guarded at line 918) --->
				<!--- Non-VCUT would set TJPROD_TERMINE here --->
				<cfif NOT isVcut>
					<!--- Non-VCUT: set TJPROD_TERMINE on linked TEMPSPROD --->
					<cfquery datasource="#datasourcePrimary#">
						UPDATE TEMPSPROD SET TJPROD_TERMINE = 1
						WHERE ENTRERPRODFINI_PFNOTRANS = <cfqueryparam cfsqltype="CF_SQL_VARCHAR" value="#Left(Trim(qPfno.PFNOTRANS), 9)#">
					</cfquery>
				</cfif>
			</cfif>
		</cfloop>
	</cfif>

	<!--- ============================================================ --->
	<!--- Step 5: Post SM via AutoFab SM/REPORT (QuestionnaireSortie.cfc:1743-1785) --->
	<!--- ============================================================ --->
	<cfif Len(smnotrans) GT 0>
		<cfset smReportParams = "'#Left(smnotrans, 9)#';'#employeeName#'">
		<cfset smReportResult = autofabExecuteTransaction(datasourcePrimary, "SM", "REPORT", smReportParams)>
	</cfif>

	<!--- ============================================================ --->
	<!--- Step 6-9: VCUT completion check (QuestionnaireSortie.cfc:1124-1290) --->
	<!--- ============================================================ --->
	<cfif isVcut AND Len(listeTjseq) GT 0 AND qtype EQ "comp">
		<!--- Completion threshold: QTE_FORCEE (I2), NOT DCQTE_A_FAB --->
		<cfset LaQteTotale = Val(qOperation.QTE_FORCEE)>

		<!--- Current total produced across batch --->
		<cfquery name="qTotalProd" datasource="#datasourcePrimary#">
			SELECT MAX(ISNULL(TJQTEPROD, 0)) AS LeTJQTEPROD
			FROM TEMPSPROD
			WHERE TJSEQ IN (<cfqueryparam cfsqltype="CF_SQL_INTEGER" list="true" value="#listeTjseq#">)
			AND MODEPROD_MPCODE = 'PROD'
		</cfquery>
		<cfset LeTJQTEPROD = Val(qTotalProd.LeTJQTEPROD)>

		<!--- No auto-STOP to COMP for VCUT (I5) — only check completion --->

		<cfif LaQteTotale GT 0 AND (LaQteTotale - LeTJQTEPROD) LE 0>
			<!--- ============================================================ --->
			<!--- VCUT-COMPLETE block (QuestionnaireSortie.cfc:1186-1290) --->
			<!--- ============================================================ --->

			<!--- Step 9a: Per-EPF — update cNOMENCOP with quantities (I9 step 1) --->
			<cfif Len(listeEpfSeq) GT 0>
				<cfloop list="#listeEpfSeq#" index="pfseq2">
					<cfquery name="qPfno2" datasource="#datasourcePrimary#">
						SELECT PFNOTRANS FROM ENTRERPRODFINI
						WHERE PFSEQ = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#Val(pfseq2)#">
					</cfquery>

					<cfif qPfno2.RecordCount GT 0>
						<!--- Find TEMPSPROD linked to this EPF to get INVENTAIRE_C --->
						<cfquery name="qTpForEpf" datasource="#datasourcePrimary#">
							SELECT INVENTAIRE_C, SUM(TJQTEPROD) AS totalGood, SUM(TJQTEDEFECT) AS totalDefect
							FROM TEMPSPROD
							WHERE ENTRERPRODFINI_PFNOTRANS = <cfqueryparam cfsqltype="CF_SQL_VARCHAR" value="#Left(Trim(qPfno2.PFNOTRANS), 9)#">
							GROUP BY INVENTAIRE_C
						</cfquery>

						<cfif qTpForEpf.RecordCount GT 0>
							<!--- Update cNOMENCOP --->
							<cfquery datasource="#datasourcePrimary#">
								UPDATE cNOMENCOP
								SET NOPQTETERMINE = <cfqueryparam cfsqltype="CF_SQL_FLOAT" value="#Val(qTpForEpf.totalGood)#">,
									NOPQTESCRAP = <cfqueryparam cfsqltype="CF_SQL_FLOAT" value="#Val(qTpForEpf.totalDefect)#">
								WHERE TRANSAC = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#transac#">
								AND INVENTAIRE_P = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#Val(qTpForEpf.INVENTAIRE_C)#">
							</cfquery>

							<!--- Step 9b: Update PL_RESULTAT PR_TERMINE (I9 step 2) --->
							<cfquery datasource="#datasourcePrimary#">
								UPDATE PL_RESULTAT SET PR_TERMINE = 1
								WHERE CNOMENCOP IN (
									SELECT NOPSEQ FROM cNOMENCOP
									WHERE TRANSAC = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#transac#">
									AND INVENTAIRE_P = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#Val(qTpForEpf.INVENTAIRE_C)#">
								)
							</cfquery>
						</cfif>
					</cfif>
				</cfloop>
			</cfif>

			<!--- Step 9c: All ListeTJSEQ — set COMP, TJPROD_TERMINE (I9 step 3) --->
			<cfquery datasource="#datasourcePrimary#">
				UPDATE TEMPSPROD
				SET MODEPROD_MPCODE = 'COMP',
					TJFINDATE = GETDATE(),
					TJPROD_TERMINE = 1
				WHERE TJSEQ IN (<cfqueryparam cfsqltype="CF_SQL_INTEGER" list="true" value="#listeTjseq#">)
			</cfquery>

			<!--- Step 9d: Hardcode — INVENTAIRE_C = 10525 (I9 step 4, audit E1) --->
			<!--- NOTE: This is a legacy hardcode for the VCUT parent material.
			      May be environment-specific — see audit Q2. --->
			<cfquery datasource="#datasourcePrimary#">
				UPDATE TEMPSPROD SET TJQTEPROD = 1
				WHERE TRANSAC = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#transac#">
				AND INVENTAIRE_C = 10525
			</cfquery>

			<!--- Step 9e: Close transaction (I9 step 5) --->
			<cfquery datasource="#datasourcePrimary#">
				UPDATE TRANSAC SET TRSTATUTITEM = 1
				WHERE TRSEQ = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#transac#">
			</cfquery>

		<cfelse>
			<!--- VCUT-INCOMPLETE: reset cNOMENCOP quantities to 0 (QuestionnaireSortie.cfc:1282) --->
			<cfif Len(listeEpfSeq) GT 0>
				<cfloop list="#listeEpfSeq#" index="pfseq3">
					<cfquery name="qPfno3" datasource="#datasourcePrimary#">
						SELECT PFNOTRANS FROM ENTRERPRODFINI
						WHERE PFSEQ = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#Val(pfseq3)#">
					</cfquery>
					<cfif qPfno3.RecordCount GT 0>
						<cfquery name="qTpForEpf3" datasource="#datasourcePrimary#">
							SELECT DISTINCT INVENTAIRE_C FROM TEMPSPROD
							WHERE ENTRERPRODFINI_PFNOTRANS = <cfqueryparam cfsqltype="CF_SQL_VARCHAR" value="#Left(Trim(qPfno3.PFNOTRANS), 9)#">
						</cfquery>
						<cfif qTpForEpf3.RecordCount GT 0>
							<cfquery datasource="#datasourcePrimary#">
								UPDATE cNOMENCOP
								SET NOPQTETERMINE = 0, NOPQTESCRAP = 0, NOPQTERESTE = 0
								WHERE TRANSAC = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#transac#">
								AND INVENTAIRE_P = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#Val(qTpForEpf3.INVENTAIRE_C)#">
							</cfquery>
						</cfif>
					</cfif>
				</cfloop>
			</cfif>
		</cfif>
	</cfif>

	<!--- ============================================================ --->
	<!--- Step 10-14: Status change (reuses changeStatus.cfm pattern) --->
	<!--- ============================================================ --->
	<cfif mainTjseq GT 0>
		<!--- Get MODEPROD for target status --->
		<cfquery name="qModeProd" datasource="#datasourcePrimary#">
			SELECT MPSEQ FROM MODEPROD WHERE MPCODE = <cfqueryparam cfsqltype="CF_SQL_VARCHAR" value="#mpcode#">
		</cfquery>

		<!--- Step 10: Close PROD via Nba_Sp_Update_Production --->
		<cfset prevDateStr = DateFormat(qPrevRow.TJDEBUTDATE, 'yyyy-mm-dd')>
		<cfset prevTimeStr = TimeFormat(qPrevRow.TJDEBUTDATE, 'HH:nn:ss')>

		<cfstoredproc procedure="Nba_Sp_Update_Production" datasource="#datasourcePrimary#">
			<cfprocparam type="in" cfsqltype="CF_SQL_INTEGER" value="#mainTjseq#">
			<cfprocparam type="in" cfsqltype="CF_SQL_INTEGER" value="#Val(qPrevRow.EMPLOYE)#">
			<cfprocparam type="in" cfsqltype="CF_SQL_INTEGER" value="#Val(qOperation.OPERATION_SEQ)#">
			<cfprocparam type="in" cfsqltype="CF_SQL_INTEGER" value="#Val(qOperation.MACHINE)#">
			<cfprocparam type="in" cfsqltype="CF_SQL_INTEGER" value="#transac#">
			<cfprocparam type="in" cfsqltype="CF_SQL_VARCHAR" value="">
			<cfprocparam type="in" cfsqltype="CF_SQL_VARCHAR" value="">
			<cfprocparam type="in" cfsqltype="CF_SQL_INTEGER" value="#Val(qPrevRow.cNOMENCLATURE)#">
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
			<cfprocparam type="in" cfsqltype="CF_SQL_VARCHAR" value="Ecran de production pour Temps prod New">
			<cfprocparam type="in" cfsqltype="CF_SQL_CHAR" value="#Left(qPrevRow.SMNOTRANS, 9)#">
			<cfprocparam type="out" cfsqltype="CF_SQL_INTEGER" variable="updateErreur">
		</cfstoredproc>

		<!--- Step 11: Create new STOP/COMP row via Nba_Sp_Insert_Production --->
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
			<cfprocparam type="in" cfsqltype="CF_SQL_VARCHAR" value="Ecran de production pour Temps prod New">
			<cfprocparam type="in" cfsqltype="CF_SQL_INTEGER" value="0">
			<cfprocparam type="in" cfsqltype="CF_SQL_CHAR" value="">
			<cfprocparam type="in" cfsqltype="CF_SQL_INTEGER" value="#copmachine#">
			<cfprocparam type="out" cfsqltype="CF_SQL_INTEGER" variable="LeTJSEQ">
			<cfprocparam type="out" cfsqltype="CF_SQL_INTEGER" variable="insertErreur">
		</cfstoredproc>

		<!--- Step 12: Update CNOMENCOP and INVENTAIRE_C on new row --->
		<cfif Val(LeTJSEQ) GT 0>
			<cfquery datasource="#datasourcePrimary#">
				UPDATE TEMPSPROD
				SET CNOMENCOP = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#nopseq#">,
					INVENTAIRE_C = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#Val(qOperation.INVENTAIRE_SEQ)#">
				WHERE TJSEQ = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#Val(LeTJSEQ)#">
			</cfquery>

			<!--- Step 13: Update PL_RESULTAT --->
			<cfquery datasource="#datasourcePrimary#">
				UPDATE PL_RESULTAT
				SET PR_DEBUTE = 1,
					MODEPROD = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#Val(qModeProd.MPSEQ)#">
				WHERE CNOMENCOP = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#nopseq#">
			</cfquery>

			<!--- Step 14: Zero cost fields --->
			<cfquery datasource="#datasourcePrimary#">
				UPDATE TEMPSPROD SET
					TJEMTAUXHOR = 0, TJOPTAUXHOR = 0, TJMATAUXHOR = 0,
					TJSYSTEMPSHOMME = 0, TJTEMPSHOMME = 0,
					TJEMCOUT = 0, TJOPCOUT = 0, TJMACOUT = 0
				WHERE TJSEQ = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#Val(LeTJSEQ)#">
			</cfquery>

			<!--- Step 15: SKIP cost recalculation for VCUT (I4) --->
			<!--- Non-VCUT cost recalc handled by changeStatus.cfm --->
		</cfif>
	</cfif>

	<!--- Return response --->
	<cfset data = StructNew("ordered")>
	<cfset data["transac"] = transac>
	<cfset data["type"] = qtype>
	<cfset data["tjseq"] = Val(LeTJSEQ)>

	<cfset response["success"] = true>
	<cfset response["data"] = data>
	<cfset response["message"] = "Questionnaire submitted successfully">

	<cfcatch type="any">
		<cfset response = StructNew()>
		<cfset response["success"] = false>
		<cfset response["data"] = StructNew()>
		<cfset response["error"] = cfcatch.message & " " & cfcatch.detail>
	</cfcatch>
</cftry>

<cfoutput>#SerializeJSON(response)#</cfoutput>
</cfsilent>
