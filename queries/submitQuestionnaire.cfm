<cfsilent>
<cfsetting enablecfoutputonly="true" showdebugoutput="false">
<cfcontent type="application/json">
<cfheader name="Access-Control-Allow-Origin" value="*">
<cfheader name="Access-Control-Allow-Methods" value="POST,OPTIONS">
<cfheader name="Access-Control-Allow-Headers" value="Content-Type">

<cfif cgi.REQUEST_METHOD EQ "OPTIONS">
	<cfoutput>{}</cfoutput><cfabort>
</cfif>

<!---
	EXACT replica of legacy QuestionnaireSortie.cfc -> ModifieTEMPSPROD (lines 599-1293).
	Kept in lockstep with server/api.cjs /submitQuestionnaire.cfm.

	IMPORTANT: submit does NOT close/insert TEMPSPROD rows and does NOT create SMs.
	The status mutation happened at questionnaire open (changeStatus.cfm = old
	ajouteModifieStatut); SM creation happens interactively via ajouteSM.cfm.
	Submit only: updates qtys/employee/costs, upserts stop causes, posts SM/EPF via
	AutoFab EXECUTE_TRANSACTION REPORT, EnCours/cariste/cNOMENCOP bookkeeping.
--->
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
	<cfset nopseqArg = Val(requestBody["nopseq"])>

	<!--- Optional fields --->
	<cfset primaryCause = "">
	<cfif StructKeyExists(requestBody, "primaryCause")><cfset primaryCause = requestBody["primaryCause"]></cfif>
	<cfset secondaryCause = "">
	<cfif StructKeyExists(requestBody, "secondaryCause")><cfset secondaryCause = requestBody["secondaryCause"]></cfif>
	<cfset notes = "">
	<cfif StructKeyExists(requestBody, "notes")><cfset notes = requestBody["notes"]></cfif>
	<cfset moldAction = "">
	<cfif StructKeyExists(requestBody, "moldAction")><cfset moldAction = requestBody["moldAction"]></cfif>
	<cfset defectsArr = []>
	<cfif StructKeyExists(requestBody, "defects")><cfset defectsArr = requestBody["defects"]></cfif>
	<!--- Session login name for SP/SOAP user params (old session.InfoClient.NOMEMPLOYE) --->
	<cfset userName = "WebUI New">
	<cfif StructKeyExists(requestBody, "employeeName") AND Len(Trim(requestBody["employeeName"])) GT 0>
		<cfset userName = Left(Trim(requestBody["employeeName"]), 50)>
	</cfif>
	<!--- The STOP/COMP/ON_HOLD row created by changeStatus (old arguments.TJSEQ) --->
	<cfset stopTjseqArg = 0>
	<cfif StructKeyExists(requestBody, "stopTjseq")><cfset stopTjseqArg = Val(requestBody["stopTjseq"])></cfif>

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

	<cfset isStop = (qtype EQ "stop")>
	<cfset isComp = (qtype EQ "comp")>

	<!--- Server time --->
	<cfquery name="qTime" datasource="#datasourcePrimary#">
		SELECT FORMAT(GETDATE(), 'yyyy-MM-dd') AS d, FORMAT(GETDATE(), 'HH:mm:ss') AS t
	</cfquery>
	<cfset dateStr = qTime.d>
	<cfset timeStr = qTime.t>

	<!--- Find the last PROD TEMPSPROD record (old :657-668) --->
	<cfquery name="qPrevRow" datasource="#datasourcePrimary#">
		SELECT TOP 1 TP.TJSEQ, TP.CNOMENCOP, TP.SMNOTRANS,
			TP.ENTRERPRODFINI_PFNOTRANS, TP.CNOMENCLATURE,
			TP.TJQTEPROD, TP.TJQTEDEFECT, TP.MODEPROD_MPCODE,
			TP.EMPLOYE, TP.OPERATION, TP.MACHINE, TP.INVENTAIRE_C,
			TP.TJDEBUTDATE, TP.TJFINDATE, TP.cNomencOp_Machine,
			CNOP.NOPSEQ
		FROM TEMPSPROD TP
		INNER JOIN cNOMENCOP CNOP ON CNOP.NOPSEQ = TP.CNOMENCOP
		WHERE TP.TRANSAC = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#transac#">
		AND TP.MODEPROD_MPCODE = 'PROD'
		AND TP.TJNOTE LIKE 'Ecran de production pour Temps prod%'
		<cfif copmachine NEQ 0>
			AND TP.cNOMENCOP_MACHINE = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#copmachine#">
		</cfif>
		ORDER BY TP.TJSEQ DESC
	</cfquery>

	<cfif qPrevRow.RecordCount EQ 0>
		<cfset response["success"] = false>
		<cfset response["error"] = "No active PROD record found for this operation">
		<cfoutput>#SerializeJSON(response)#</cfoutput>
		<cfabort>
	</cfif>

	<cfset mainTjseq = Val(qPrevRow.TJSEQ)>
	<cfset nopseq = nopseqArg>
	<cfif nopseq EQ 0><cfset nopseq = Val(qPrevRow.NOPSEQ)></cfif>
	<!--- Defect total comes from the DB (write-as-you-go via addDefect.cfm) --->
	<cfset qteDefect = Val(qPrevRow.TJQTEDEFECT)>
	<cfset totalQte = goodQty + qteDefect>

	<!--- Resolve the STOP/COMP row for causes/employee. Prefer the explicit TJSEQ
	      from changeStatus (covers ON_HOLD); fallback MODEPROD=8 lookup (old :734-744). --->
	<cfset stopTjseq = stopTjseqArg>
	<cfif stopTjseq EQ 0 AND isStop>
		<cfquery name="qStopRow" datasource="#datasourcePrimary#">
			SELECT TOP 1 TJSEQ FROM TEMPSPROD
			WHERE TRANSAC = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#transac#">
			AND CNOMENCOP = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#nopseq#">
			<cfif copmachine NEQ 0>
				AND cNOMENCOP_MACHINE = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#copmachine#">
			</cfif>
			AND MODEPROD = 8
			ORDER BY TJSEQ DESC
		</cfquery>
		<cfif qStopRow.RecordCount GT 0>
			<cfset stopTjseq = Val(qStopRow.TJSEQ)>
		</cfif>
	</cfif>

	<!--- ============================================================ --->
	<!--- STEP 1: Reset TJPROD_TERMINE flag (old :686-692) --->
	<!--- ============================================================ --->
	<cfquery datasource="#datasourcePrimary#">
		UPDATE TEMPSPROD
		SET TJPROD_TERMINE = 0
		WHERE TRANSAC = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#transac#">
		AND CNOMENCOP = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#nopseq#">
		AND TJPROD_TERMINE = 1
	</cfquery>

	<!--- ============================================================ --->
	<!--- STEP 2: Update employee on the STOP/COMP row AND the PROD row --->
	<!--- (old :700-706 + ChangeTEMPSPROD :1670-1678) --->
	<!--- ============================================================ --->
	<cfquery name="qEmployee" datasource="#datasourcePrimary#">
		SELECT TOP 1 EMSEQ, EMNOIDENT AS EMNO, EMNOM FROM EMPLOYE
		WHERE EMNOIDENT = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#Val(employeeCode)#">
	</cfquery>
	<cfset employeeSeq = 0>
	<cfif qEmployee.RecordCount GT 0>
		<cfset employeeSeq = Val(qEmployee.EMSEQ)>
		<!--- STOP/COMP row gets employee + changeTEMPSPROD (a) writes (old :1670-1679,
		      FIX-6): TJNOTE + CNOMENCOP + INVENTAIRE_C. TJNOTE: the old JS Note logic
		      is inverted (sp_js:1966-1967) and the questionnaire has no Note input,
		      so the constant always arrives — replicate the effective value. --->
		<cfif stopTjseq GT 0>
			<cfquery datasource="#datasourcePrimary#">
				UPDATE TEMPSPROD
				SET EMPLOYE = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#employeeSeq#">,
					EMPLOYE_EMNO = <cfqueryparam cfsqltype="CF_SQL_VARCHAR" value="#qEmployee.EMNO#">,
					EMPLOYE_EMNOM = <cfqueryparam cfsqltype="CF_SQL_VARCHAR" value="#qEmployee.EMNOM#">,
					TJNOTE = <cfqueryparam cfsqltype="CF_SQL_VARCHAR" maxlength="500" value="Ecran de production pour Temps prod">,
					CNOMENCOP = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#nopseq#">,
					INVENTAIRE_C = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#Val(qPrevRow.INVENTAIRE_C)#">
				WHERE TJSEQ = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#stopTjseq#">
			</cfquery>
		</cfif>
		<cfquery datasource="#datasourcePrimary#">
			UPDATE TEMPSPROD
			SET EMPLOYE = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#employeeSeq#">,
				EMPLOYE_EMNO = <cfqueryparam cfsqltype="CF_SQL_VARCHAR" value="#qEmployee.EMNO#">,
				EMPLOYE_EMNOM = <cfqueryparam cfsqltype="CF_SQL_VARCHAR" value="#qEmployee.EMNOM#">
			WHERE TJSEQ = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#mainTjseq#">
		</cfquery>
	</cfif>

	<!--- ============================================================ --->
	<!--- STEP 3: Stop causes on the STOP row — NOT the PROD row --->
	<!--- (old ModifieTEMPSPROD :734-769: TOP 1 MODEPROD = 8, upsert TEMPSPRODEX) --->
	<!--- ============================================================ --->
	<cfif isStop AND Len(primaryCause) GT 0 AND Val(primaryCause) NEQ 0 AND stopTjseq GT 0>
		<cfquery name="qExistTpex" datasource="#datasourcePrimary#">
			SELECT QA_CAUSEP, QA_CAUSES FROM TEMPSPRODEX
			WHERE TEMPSPROD = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#stopTjseq#">
		</cfquery>
		<cfif qExistTpex.RecordCount GT 0>
			<cfquery datasource="#datasourcePrimary#">
				UPDATE TEMPSPRODEX
				SET QA_CAUSEP = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#Val(primaryCause)#">,
					QA_CAUSES = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#Val(secondaryCause)#">,
					EXTPRD_NOTE = <cfqueryparam cfsqltype="CF_SQL_VARCHAR" maxlength="500" value="#Left(notes, 500)#">
				WHERE TEMPSPROD = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#stopTjseq#">
			</cfquery>
		<cfelse>
			<cfquery datasource="#datasourcePrimary#">
				INSERT INTO TEMPSPRODEX (TEMPSPROD, QA_CAUSEP, QA_CAUSES, EXTPRD_NOTE)
				VALUES (
					<cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#stopTjseq#">,
					<cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#Val(primaryCause)#">,
					<cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#Val(secondaryCause)#">,
					<cfqueryparam cfsqltype="CF_SQL_VARCHAR" maxlength="500" value="#Left(notes, 500)#">
				)
			</cfquery>
		</cfif>
	</cfif>

	<!--- ============================================================ --->
	<!--- STEP 4 (non-VCUT): qty update on PROD row + TJPROD_TERMINE pre-check --->
	<!--- (old ChangeTEMPSPROD :1670-1699 + :708-716; VCUT skips — old :708) --->
	<!--- ============================================================ --->
	<cfif NOT isVcut>
		<!--- Old changeTEMPSPROD (c) writes ONLY the quantities on the PROD row
		      (QS:1695-1701); CNOMENCOP/INVENTAIRE_C go on the STOP row (FIX-6). --->
		<cfquery datasource="#datasourcePrimary#">
			UPDATE TEMPSPROD
			SET TJQTEPROD = <cfqueryparam cfsqltype="CF_SQL_FLOAT" value="#goodQty#">,
				TJQTEDEFECT = <cfqueryparam cfsqltype="CF_SQL_FLOAT" value="#qteDefect#">
			WHERE TJSEQ = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#mainTjseq#">
		</cfquery>

		<!--- TJPROD_TERMINE pre-check (old :708-716) --->
		<cftry>
			<cfquery name="qQteCheck" datasource="#datasourcePrimary#">
				SELECT ISNULL(COP.NOPQTEAFAIRE, 0) AS NiQte_A_Fab,
					ISNULL((SELECT SUM(TJQTEPROD) FROM TEMPSPROD WHERE TRANSAC = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#transac#"> AND CNOMENCOP = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#nopseq#">), 0) AS Qte_Termine
				FROM CNOMENCOP COP
				WHERE COP.NOPSEQ = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#nopseq#">
			</cfquery>
			<cfif qQteCheck.RecordCount GT 0 AND (Val(qQteCheck.NiQte_A_Fab) - Val(qQteCheck.Qte_Termine)) LTE 0>
				<cfquery datasource="#datasourcePrimary#">
					UPDATE TEMPSPROD SET TJPROD_TERMINE = 1
					WHERE TJSEQ = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#mainTjseq#">
				</cfquery>
			</cfif>
			<cfcatch type="any"></cfcatch>
		</cftry>

		<!--- ChangeTEMPSPROD diff-status row (old :1682-1741): update qty + costs on
		      the most recent row whose MPCODE differs from the submit status --->
		<cftry>
			<cfset statusForQuery = "PROD">
			<cfif isStop><cfset statusForQuery = "STOP"></cfif>
			<cfif isComp><cfset statusForQuery = "COMP"></cfif>
			<cfquery name="qDiffStatus" datasource="#datasourcePrimary#">
				SELECT TOP 1 TJSEQ, MODEPROD_MPCODE FROM TEMPSPROD
				WHERE TRANSAC = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#transac#">
				AND CNOMENCOP = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#nopseq#">
				<cfif copmachine NEQ 0>
					AND cNOMENCOP_MACHINE = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#copmachine#">
				</cfif>
				AND MODEPROD_MPCODE <> <cfqueryparam cfsqltype="CF_SQL_VARCHAR" maxlength="5" value="#statusForQuery#">
				AND TJNOTE LIKE 'Ecran de production pour Temps prod%'
				ORDER BY TJSEQ DESC
			</cfquery>
			<cfif qDiffStatus.RecordCount GT 0>
				<cfset diffTjseq = Val(qDiffStatus.TJSEQ)>
				<cfquery datasource="#datasourcePrimary#">
					UPDATE TEMPSPROD
					SET TJQTEPROD = <cfqueryparam cfsqltype="CF_SQL_FLOAT" value="#goodQty#">,
						TJQTEDEFECT = <cfqueryparam cfsqltype="CF_SQL_FLOAT" value="#qteDefect#">
					WHERE TJSEQ = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#diffTjseq#">
				</cfquery>
				<cfquery datasource="#datasourcePrimary#">
					UPDATE TEMPSPROD SET
						TJSYSTEMPSHOMME = ISNULL(C.CALCSYSTEMPSHOMME, 0),
						TJTEMPSHOMME = ISNULL(C.CALCTEMPSHOMME, 0),
						TJEMCOUT = ISNULL(C.CALCEMCOUT, 0),
						TJOPCOUT = ISNULL(C.CALCOPCOUT, 0),
						TJMACOUT = ISNULL(C.CALCMACOUT, 0)
					FROM TEMPSPROD
					INNER JOIN dbo.FctCalculTempsDeProduction(<cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#diffTjseq#">) C ON C.TJSEQ = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#diffTjseq#">
					WHERE TEMPSPROD.TJSEQ = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#diffTjseq#">
				</cfquery>
			</cfif>
			<cfcatch type="any"></cfcatch>
		</cftry>
	</cfif>

	<!--- ============================================================ --->
	<!--- STEP 5: DET_DEFECT fallback insert — only when write-as-you-go --->
	<!--- didn't already persist them (QteDefect.cfc add columns) --->
	<!--- ============================================================ --->
	<cfquery name="qExistingDefects" datasource="#datasourcePrimary#">
		SELECT COUNT(*) AS cnt FROM DET_DEFECT
		WHERE TEMPSPROD = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#mainTjseq#">
	</cfquery>
	<cfif Val(qExistingDefects.cnt) EQ 0 AND ArrayLen(defectsArr) GT 0>
		<cfquery name="qInv" datasource="#datasourcePrimary#">
			SELECT INVENTAIRE FROM TRANSAC
			WHERE TRSEQ = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#transac#">
		</cfquery>
		<cfquery name="qDefCosts" datasource="#datasourcePrimary#">
			SELECT ISNULL(TP.TJEMCOUT, 0) + ISNULL(TP.TJOPCOUT, 0) + ISNULL(TP.TJMACOUT, 0) AS CoutOperation,
				ISNULL(TP.TJQTEPROD, 0) AS TJQTEPROD,
				ISNULL((SELECT SUM(0 - TRCOUTTRANS) FROM TRANSAC WHERE TRSEQ = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#transac#">), 0) AS CoutMatiere
			FROM TEMPSPROD TP
			WHERE TP.TJSEQ = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#mainTjseq#">
		</cfquery>
		<cfset LaValeurEstimeeTotale = Val(qDefCosts.CoutOperation) + Val(qDefCosts.CoutMatiere)>
		<cfif Val(qDefCosts.TJQTEPROD) NEQ 0>
			<cfset LaValeurEstimeeUnitaire = LaValeurEstimeeTotale / qDefCosts.TJQTEPROD>
		<cfelse>
			<cfset LaValeurEstimeeUnitaire = 0>
		</cfif>

		<cfloop array="#defectsArr#" index="d">
			<cfset dQty = Val(d["qty"])>
			<cfif dQty LTE 0><cfcontinue></cfif>
			<cfquery datasource="#datasourcePrimary#">
				INSERT INTO DET_DEFECT
					(TEMPSPROD, TRANSAC, INVENTAIRE, MACHINE, EMPLOYE,
					DDQTEUNINV, DDDATE, RAISON, DDNOTE,
					DDVALEUR_ESTIME_UNITAIRE, DDVALEUR_ESTIME_TOTALE, TRANSAC_PERE)
				VALUES (
					<cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#mainTjseq#">,
					<cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#transac#">,
					<cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#Val(qInv.INVENTAIRE)#">,
					<cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#Val(qPrevRow.MACHINE)#">,
					<cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#employeeSeq#">,
					<cfqueryparam cfsqltype="CF_SQL_FLOAT" value="#dQty#">,
					GETDATE(),
					<cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#Val(d['typeId'])#">,
					<cfqueryparam cfsqltype="CF_SQL_VARCHAR" maxlength="500" value="#Left(d['notes'], 500)#">,
					<cfqueryparam cfsqltype="CF_SQL_FLOAT" value="#Val(LaValeurEstimeeUnitaire)#">,
					<cfqueryparam cfsqltype="CF_SQL_FLOAT" value="#Val(LaValeurEstimeeTotale)#">,
					<cfqueryparam cfsqltype="CF_SQL_INTEGER" value="0">
				)
			</cfquery>
		</cfloop>
	</cfif>

	<!--- ============================================================ --->
	<!--- Zero-qty rollback (old verifieStatutSortie :2430-2462): total 0 + --->
	<!--- PROD row has an SM -> AutoFab SM/DEL + clear the row --->
	<!--- ============================================================ --->
	<cfif totalQte EQ 0 AND NOT isVcut AND Len(Trim(qPrevRow.SMNOTRANS)) GT 0>
		<cftry>
			<cfquery name="qDelSmSeq" datasource="#datasourcePrimary#">
				SELECT SMSEQ FROM SORTIEMATERIEL
				WHERE SMNOTRANS = <cfqueryparam cfsqltype="CF_SQL_VARCHAR" maxlength="9" value="#Left(Trim(qPrevRow.SMNOTRANS), 9)#">
			</cfquery>
			<cfif qDelSmSeq.RecordCount GT 0>
				<cfset smDelParams = "#Val(qDelSmSeq.SMSEQ)#;'';'';'''';'';'';'';'''';'''';'';'';'';''">
				<cfset smDelResult = autofabExecuteTransaction(datasourcePrimary, "SM", "DEL", smDelParams)>
			</cfif>
			<cfquery datasource="#datasourcePrimary#">
				UPDATE TEMPSPROD
				SET SMNOTRANS = '', TJQTEPROD = 0, TJQTEDEFECT = 0
				WHERE TJSEQ = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#mainTjseq#">
			</cfquery>
			<cfcatch type="any"></cfcatch>
		</cftry>
	</cfif>

	<!--- ============================================================ --->
	<!--- SM posting — REPORT only (old ModifieTEMPSPROD :776-828 + --->
	<!--- ReportSortieMateriel :1743-1786). Submit NEVER creates an SM. --->
	<!--- Params: SMSEQ;LaDateClarion;LaHeureClarion;'NOMEMPLOYE';'';'';'';'''';'''';'';'';'';'' --->
	<!--- Clarion: days since 1800-12-28 / seconds-since-midnight*100 (support.cfc:872-873) --->
	<!--- ============================================================ --->
	<cfif totalQte GT 0 OR isVcut>
		<cftry>
			<!--- Collect SMNOTRANS values to report --->
			<cfset smnoList = "">
			<cfif isVcut>
				<!--- VCUT: every distinct SM linked to PROD rows of this TRANSAC --->
				<cfquery name="qVcutSms" datasource="#datasourcePrimary#">
					SELECT DISTINCT LTRIM(RTRIM(SMNOTRANS)) AS SMNOTRANS
					FROM TEMPSPROD
					WHERE TRANSAC = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#transac#">
					AND MODEPROD_MPCODE = 'PROD'
					AND ISNULL(NULLIF(LTRIM(RTRIM(SMNOTRANS)),''),'') <> ''
				</cfquery>
				<cfloop query="qVcutSms">
					<cfset smnoList = ListAppend(smnoList, Left(Trim(qVcutSms.SMNOTRANS), 9))>
				</cfloop>
			<cfelse>
				<!--- Non-VCUT: PROD row's SM + payload smnotrans --->
				<cfquery name="qProdSm" datasource="#datasourcePrimary#">
					SELECT SMNOTRANS FROM TEMPSPROD
					WHERE TJSEQ = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#mainTjseq#">
					AND ISNULL(NULLIF(LTRIM(RTRIM(SMNOTRANS)),''),'') <> ''
				</cfquery>
				<cfif qProdSm.RecordCount GT 0>
					<cfset smnoList = ListAppend(smnoList, Left(Trim(qProdSm.SMNOTRANS), 9))>
				</cfif>
				<cfif Len(smnotrans) GT 0>
					<cfset smnoList = ListAppend(smnoList, Left(smnotrans, 9))>
				</cfif>
			</cfif>
			<cfset smnoList = ListRemoveDuplicates(smnoList)>

			<cfloop list="#smnoList#" index="ceSmno">
				<cfquery name="qSmSeqReport" datasource="#datasourcePrimary#">
					SELECT SMSEQ FROM SORTIEMATERIEL
					WHERE SMNOTRANS = <cfqueryparam cfsqltype="CF_SQL_VARCHAR" maxlength="9" value="#ceSmno#">
				</cfquery>
				<cfif qSmSeqReport.RecordCount GT 0>
					<cfquery name="qClarionSm" datasource="#datasourcePrimary#">
						SELECT DATEDIFF(DAY, '1800-12-28', GETDATE()) AS LaDateClarion,
							DATEDIFF(SECOND, CAST(CAST(GETDATE() AS DATE) AS DATETIME), GETDATE()) * 100 AS LaHeureClarion
					</cfquery>
					<cfset smReportParams = "#Val(qSmSeqReport.SMSEQ)#;#qClarionSm.LaDateClarion#;#qClarionSm.LaHeureClarion#;'#userName#';'';'';'';'''';'''';'';'';'';''">
					<cfset smReportResult = autofabExecuteTransaction(datasourcePrimary, "SM", "REPORT", smReportParams)>
				</cfif>
			</cfloop>
			<cfcatch type="any"></cfcatch>
		</cftry>
	</cfif>

	<!--- ============================================================ --->
	<!--- EPF posting (old :829-933 + ReportEntreeProduitFini :2115-2143) --->
	<!--- DET_TRANS cost UPDATE with dbo.FctNbaRound precedes each REPORT --->
	<!--- ============================================================ --->
	<cftry>
		<cfif isVcut AND Len(listeEpfSeq) GT 0>
			<!--- VCUT: iterate ListeEPFSEQ with index-matched ListeTJSEQ (old :833-834) --->
			<cfset tjArr = ListToArray(listeTjseq)>
			<cfset epfArr = ListToArray(listeEpfSeq)>
			<cfloop from="1" to="#ArrayLen(epfArr)#" index="iEpf">
				<cfset leEpfSeq = Val(epfArr[iEpf])>
				<cfset leTj = 0>
				<cfif iEpf LTE ArrayLen(tjArr)><cfset leTj = Val(tjArr[iEpf])></cfif>
				<cfif leTj EQ 0>
					<cfquery name="qTjFallback" datasource="#datasourcePrimary#">
						SELECT TOP 1 TJSEQ FROM TEMPSPROD
						WHERE TRANSAC = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#transac#">
						AND cNOMENCOP = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#nopseq#">
						AND MODEPROD_MPCODE = 'PROD'
						AND TJNOTE LIKE 'Ecran de production pour Temps prod%'
						ORDER BY TJSEQ DESC
					</cfquery>
					<cfif qTjFallback.RecordCount GT 0><cfset leTj = Val(qTjFallback.TJSEQ)></cfif>
				</cfif>

				<!--- Component NOPSEQ from TEMPSPROD (old :851-855) --->
				<cfset compNopseq = nopseq>
				<cfquery name="qTjComp" datasource="#datasourcePrimary#">
					SELECT TJSEQ, CNOMENCOP FROM TEMPSPROD
					WHERE TJSEQ = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#leTj#">
				</cfquery>
				<cfif qTjComp.RecordCount GT 0 AND Val(qTjComp.CNOMENCOP) GT 0>
					<cfset compNopseq = Val(qTjComp.CNOMENCOP)>
				</cfif>

				<!--- EPF DET_TRANS info (old :856-862) --->
				<cfquery name="qEpfInfo" datasource="#datasourcePrimary#">
					SELECT dt.DTRSEQ, epf.PFNOTRANS, dt.DTRQTE, t.TRSEQ AS EPF_TRSEQ
					FROM DET_TRANS dt
					INNER JOIN TRANSAC t ON dt.TRANSAC = t.TRSEQ
					INNER JOIN ENTRERPRODFINI epf ON t.TRNO = epf.PFNOTRANS
					WHERE epf.PFSEQ = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#leEpfSeq#">
				</cfquery>

				<cfif qEpfInfo.RecordCount GT 0>
					<!--- DET_TRANS cost update (old :865-876) --->
					<cfquery name="qValUnit" datasource="#datasourcePrimary#">
						SELECT NOPValeurEstime_Unitaire FROM CNOMENCOP
						WHERE NOPSEQ = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#compNopseq#">
					</cfquery>
					<cfif Val(qValUnit.NOPValeurEstime_Unitaire) GT 0 AND Val(qEpfInfo.DTRSEQ) GT 0>
						<cfquery datasource="#datasourcePrimary#">
							UPDATE DET_TRANS SET
								DTRCOUT_UNIT = dbo.FctNbaRound(<cfqueryparam cfsqltype="CF_SQL_FLOAT" value="#Val(qValUnit.NOPValeurEstime_Unitaire)#">, 'PANB_DECIMAL_PRIX'),
								DTRCOUT_TRANS = dbo.FctNbaRound(<cfqueryparam cfsqltype="CF_SQL_FLOAT" value="#Val(qValUnit.NOPValeurEstime_Unitaire)#"> * DTRQTE, 'PANB_DECIMAL_PRIX')
							WHERE DTRSEQ = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#Val(qEpfInfo.DTRSEQ)#">
						</cfquery>
					</cfif>

					<!--- EPF/REPORT (old :2129) — EPFSEQ;LaDateClarion;LaHeureClarion;'NOMEMPLOYE';... --->
					<cfquery name="qClarionEpf" datasource="#datasourcePrimary#">
						SELECT DATEDIFF(DAY, '1800-12-28', GETDATE()) AS LaDateClarion,
							DATEDIFF(SECOND, CAST(CAST(GETDATE() AS DATE) AS DATETIME), GETDATE()) * 100 AS LaHeureClarion
					</cfquery>
					<cfset epfReportParams = "#leEpfSeq#;#qClarionEpf.LaDateClarion#;#qClarionEpf.LaHeureClarion#;'#userName#';'';'';'';'''';'''';'';'';'';''">
					<cfset epfReportResult = autofabExecuteTransaction(datasourcePrimary, "EPF", "REPORT", epfReportParams)>
				</cfif>
				<!--- VCUT: do NOT set TJPROD_TERMINE (old :918 skips for VCUT) --->
			</cfloop>
		<cfelseif NOT isVcut>
			<!--- Non-VCUT: every unposted EPF child of this TRANSAC --->
			<cfquery name="qEpfList" datasource="#datasourcePrimary#">
				SELECT EPF.PFSEQ, EPF.PFNOTRANS, DT.DTRSEQ, DT.DTRQTE, T.TRSEQ AS EPF_TRSEQ
				FROM ENTRERPRODFINI EPF
				INNER JOIN TRANSAC T ON T.TRNO = EPF.PFNOTRANS
				INNER JOIN DET_TRANS DT ON DT.TRANSAC = T.TRSEQ
				WHERE EPF.PFSEQ IN (
					SELECT DISTINCT EPF2.PFSEQ FROM ENTRERPRODFINI EPF2
					INNER JOIN TRANSAC T2 ON T2.TRNO = EPF2.PFNOTRANS
					WHERE T2.TRANSAC_PERE = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#transac#">
				)
				AND ISNULL(EPF.PFPOSTER, 0) = 0
			</cfquery>
			<cfloop query="qEpfList">
				<cfquery name="qValUnit2" datasource="#datasourcePrimary#">
					SELECT NOPValeurEstime_Unitaire FROM CNOMENCOP
					WHERE NOPSEQ = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#nopseq#">
				</cfquery>
				<cfif Val(qValUnit2.NOPValeurEstime_Unitaire) GT 0 AND Val(qEpfList.DTRSEQ) GT 0>
					<cfquery datasource="#datasourcePrimary#">
						UPDATE DET_TRANS SET
							DTRCOUT_UNIT = dbo.FctNbaRound(<cfqueryparam cfsqltype="CF_SQL_FLOAT" value="#Val(qValUnit2.NOPValeurEstime_Unitaire)#">, 'PANB_DECIMAL_PRIX'),
							DTRCOUT_TRANS = dbo.FctNbaRound(<cfqueryparam cfsqltype="CF_SQL_FLOAT" value="#Val(qValUnit2.NOPValeurEstime_Unitaire)#"> * DTRQTE, 'PANB_DECIMAL_PRIX')
						WHERE DTRSEQ = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#Val(qEpfList.DTRSEQ)#">
					</cfquery>
				</cfif>
				<cfquery name="qClarionEpf2" datasource="#datasourcePrimary#">
					SELECT DATEDIFF(DAY, '1800-12-28', GETDATE()) AS LaDateClarion,
						DATEDIFF(SECOND, CAST(CAST(GETDATE() AS DATE) AS DATETIME), GETDATE()) * 100 AS LaHeureClarion
				</cfquery>
				<cfset epfReportParams2 = "#Val(qEpfList.PFSEQ)#;#qClarionEpf2.LaDateClarion#;#qClarionEpf2.LaHeureClarion#;'#userName#';'';'';'';'''';'''';'';'';'';''">
				<cfset epfReportResult2 = autofabExecuteTransaction(datasourcePrimary, "EPF", "REPORT", epfReportParams2)>
			</cfloop>
		</cfif>
		<cfcatch type="any"></cfcatch>
	</cftry>

	<!--- ============================================================ --->
	<!--- InsertTacheCariste — warehouse transfers for forklift (old :1932-2113) --->
	<!--- Only when the next operation uses a different warehouse --->
	<!--- ============================================================ --->
	<cftry>
		<cfquery name="qNextOp" datasource="#datasourceExt#">
			SELECT TOP 1 ENTREPOT, INVENTAIRE_SEQ, MACHINE, COPMACHINE, NOPSEQ
			FROM vEcransProduction
			WHERE TRANSAC = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#transac#">
			AND NOPSEQ <> <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#nopseq#">
			ORDER BY DATE_DEBUT_PREVU
		</cfquery>
		<cfif qNextOp.RecordCount GT 0>
			<cfquery name="qCurOp" datasource="#datasourceExt#">
				SELECT TOP 1 ENTREPOT, MACHINE, DECODE
				FROM vEcransProduction
				WHERE TRANSAC = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#transac#">
				AND NOPSEQ = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#nopseq#">
			</cfquery>
			<cfif qCurOp.RecordCount GT 0 AND Val(qNextOp.ENTREPOT) NEQ Val(qCurOp.ENTREPOT)>
				<cfset srcWarehouse = Val(qCurOp.ENTREPOT)>
				<cfif srcWarehouse EQ 0><cfset srcWarehouse = 1></cfif>
				<cfset dstWarehouse = Val(qNextOp.ENTREPOT)>
				<cfif dstWarehouse EQ 0><cfset dstWarehouse = 1></cfif>

				<cfquery name="qFork" datasource="#datasourcePrimary#">
					SELECT DESEQ FROM DEPARTEMENT WHERE DECODE = 'ForkLift'
				</cfquery>
				<cfquery name="qForkWha" datasource="#datasourcePrimary#">
					SELECT DESEQ FROM DEPARTEMENT WHERE DECODE = 'ForkLift WHA'
				</cfquery>
				<cfset forkDeptDefault = Val(qFork.DESEQ)>
				<cfset forkDept = forkDeptDefault>
				<cfif qCurOp.DECODE EQ "WHA" AND qForkWha.RecordCount GT 0>
					<cfset forkDept = Val(qForkWha.DESEQ)>
				</cfif>

				<cfquery name="qContainers" datasource="#datasourcePrimary#">
					SELECT DISTINCT DT.CONTENANT, DT.CONTENANT_CON_NUMERO, DT.NO_SERIE,
						T.INVENTAIRE, N.INVENTAIRE_INNOINV AS ITEM
					FROM DET_TRANS DT
					LEFT JOIN NO_SERIE N ON DT.NO_SERIE = N.NSSEQ
					INNER JOIN TRANSAC T ON DT.TRANSAC = T.TRSEQ
					WHERE T.TRANSAC = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#transac#">
				</cfquery>

				<cfquery name="qStm" datasource="#datasourcePrimary#">
					SELECT STM_SEQ FROM STATUT_MATERIEL WHERE STM_DEFAUT_PROD = 1
				</cfquery>
				<cfset stmSeq = Val(qStm.STM_SEQ)>

				<cfloop query="qContainers">
					<cfset ceForkDept = forkDept>
					<cfif Len(qContainers.ITEM) AND (FindNoCase("HPL", qContainers.ITEM) GT 0 OR FindNoCase("RECON", qContainers.ITEM) GT 0)>
						<cfset ceForkDept = forkDeptDefault>
					</cfif>
					<cfif Val(qContainers.CONTENANT) GT 0>
						<cfstoredproc procedure="Nba_Insert_Transfer_Entrepot_Contenant" datasource="#datasourcePrimary#">
							<cfprocparam type="in" cfsqltype="CF_SQL_INTEGER" value="#Val(qContainers.CONTENANT)#">
							<cfprocparam type="in" cfsqltype="CF_SQL_INTEGER" value="#Val(qContainers.CONTENANT)#">
							<cfprocparam type="in" cfsqltype="CF_SQL_INTEGER" value="#srcWarehouse#">
							<cfprocparam type="in" cfsqltype="CF_SQL_INTEGER" value="#dstWarehouse#">
							<cfprocparam type="in" cfsqltype="CF_SQL_INTEGER" value="#stmSeq#">
							<cfprocparam type="in" cfsqltype="CF_SQL_VARCHAR" value="#userName#">
							<cfprocparam type="in" cfsqltype="CF_SQL_INTEGER" value="0">
							<cfprocparam type="in" cfsqltype="CF_SQL_INTEGER" value="0">
							<cfprocparam type="out" cfsqltype="CF_SQL_INTEGER" variable="trSqlErreur">
							<cfprocparam type="out" cfsqltype="CF_SQL_INTEGER" variable="trErreur">
							<cfprocparam type="out" cfsqltype="CF_SQL_INTEGER" variable="trTreseq">
						</cfstoredproc>
						<cfif Val(trTreseq) GT 0>
							<cfquery datasource="#datasourcePrimary#">
								UPDATE TRANSFENTREP
								SET TREPOSTER = 0,
									COPMACHINE = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#copmachine#">,
									CNOMENCOP = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#nopseq#">,
									DEPARTEMENT = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#ceForkDept#">,
									TRENOTE = 'Ecran de production'
								WHERE TRESEQ = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#Val(trTreseq)#">
							</cfquery>
						</cfif>
					<cfelseif Val(qContainers.INVENTAIRE) GT 0 AND Val(qContainers.NO_SERIE) GT 0>
						<cfstoredproc procedure="Nba_Insert_Transfer_Entrepot_Sans_Contenant" datasource="#datasourcePrimary#">
							<cfprocparam type="in" cfsqltype="CF_SQL_INTEGER" value="#Val(qContainers.INVENTAIRE)#">
							<cfprocparam type="in" cfsqltype="CF_SQL_INTEGER" value="#Val(qContainers.NO_SERIE)#">
							<cfprocparam type="in" cfsqltype="CF_SQL_FLOAT" value="1">
							<cfprocparam type="in" cfsqltype="CF_SQL_INTEGER" value="#srcWarehouse#">
							<cfprocparam type="in" cfsqltype="CF_SQL_INTEGER" value="#dstWarehouse#">
							<cfprocparam type="in" cfsqltype="CF_SQL_VARCHAR" value="#userName#">
							<cfprocparam type="in" cfsqltype="CF_SQL_INTEGER" value="0">
							<cfprocparam type="out" cfsqltype="CF_SQL_INTEGER" variable="trSqlErreur2">
							<cfprocparam type="out" cfsqltype="CF_SQL_INTEGER" variable="trErreur2">
							<cfprocparam type="out" cfsqltype="CF_SQL_INTEGER" variable="trTreseq2">
						</cfstoredproc>
						<cfif Val(trTreseq2) GT 0>
							<cfquery datasource="#datasourcePrimary#">
								UPDATE TRANSFENTREP
								SET COPMACHINE = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#copmachine#">,
									CNOMENCOP = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#nopseq#">,
									DEPARTEMENT = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#ceForkDept#">
								WHERE TRESEQ = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#Val(trTreseq2)#">
							</cfquery>
						</cfif>
					</cfif>
				</cfloop>
			</cfif>
		</cfif>
		<cfcatch type="any"></cfcatch>
	</cftry>

	<!--- NOTE: NO Nba_Sp_Update_Production / Nba_Sp_Insert_Production here — the
	      status mutation already happened at questionnaire open (changeStatus.cfm).
	      Old ModifieTEMPSPROD never closes/creates TEMPSPROD rows. --->

	<!--- ============================================================ --->
	<!--- Cost recalc on PROD row + STOP/COMP row (old ChangeTEMPSPROD --->
	<!--- :1694-1713 and :1719-1729) --->
	<!--- ============================================================ --->
	<cftry>
		<cfquery datasource="#datasourcePrimary#">
			UPDATE TEMPSPROD SET
				TJSYSTEMPSHOMME = ISNULL(C.CALCSYSTEMPSHOMME, 0),
				TJTEMPSHOMME = ISNULL(C.CALCTEMPSHOMME, 0),
				TJEMCOUT = ISNULL(C.CALCEMCOUT, 0),
				TJOPCOUT = ISNULL(C.CALCOPCOUT, 0),
				TJMACOUT = ISNULL(C.CALCMACOUT, 0)
			FROM TEMPSPROD
			INNER JOIN dbo.FctCalculTempsDeProduction(<cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#mainTjseq#">) C ON C.TJSEQ = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#mainTjseq#">
			WHERE TEMPSPROD.TJSEQ = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#mainTjseq#">
		</cfquery>
		<cfcatch type="any"></cfcatch>
	</cftry>
	<cfif stopTjseq GT 0>
		<cftry>
			<cfquery datasource="#datasourcePrimary#">
				UPDATE TEMPSPROD SET
					TJSYSTEMPSHOMME = ISNULL(C.CALCSYSTEMPSHOMME, 0),
					TJTEMPSHOMME = ISNULL(C.CALCTEMPSHOMME, 0),
					TJEMCOUT = ISNULL(C.CALCEMCOUT, 0),
					TJOPCOUT = ISNULL(C.CALCOPCOUT, 0),
					TJMACOUT = ISNULL(C.CALCMACOUT, 0)
				FROM TEMPSPROD
				INNER JOIN dbo.FctCalculTempsDeProduction(<cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#stopTjseq#">) C ON C.TJSEQ = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#stopTjseq#">
				WHERE TEMPSPROD.TJSEQ = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#stopTjseq#">
			</cfquery>
			<cfcatch type="any"></cfcatch>
		</cftry>
	</cfif>

	<!--- TJVALEUR_MATIERE (InsertEnCours mirror) --->
	<cftry>
		<cfquery datasource="#datasourcePrimary#">
			UPDATE TEMPSPROD SET
				TJVALEUR_MATIERE = ISNULL((SELECT SUM(0 - TRCOUTTRANS) FROM TRANSAC WHERE TRSEQ = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#transac#">), 0)
			WHERE TJSEQ = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#mainTjseq#">
		</cfquery>
		<cfcatch type="any"></cfcatch>
	</cftry>

	<!--- ============================================================ --->
	<!--- Nba_Update_ProduitEnCours (old :982-1085) --->
	<!--- ============================================================ --->
	<cftry>
		<cfquery name="qCosts" datasource="#datasourcePrimary#">
			SELECT ISNULL(TP.TJEMCOUT, 0) + ISNULL(TP.TJOPCOUT, 0) + ISNULL(TP.TJMACOUT, 0) AS CoutOperation,
				ISNULL((SELECT SUM(0 - TRCOUTTRANS) FROM TRANSAC WHERE TRSEQ = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#transac#">), 0) AS CoutMatiere
			FROM TEMPSPROD TP
			WHERE TP.TJSEQ = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#mainTjseq#">
		</cfquery>
		<cfstoredproc procedure="Nba_Update_ProduitEnCours" datasource="#datasourcePrimary#">
			<cfprocparam type="in" cfsqltype="CF_SQL_INTEGER" value="#transac#">
			<cfprocparam type="in" cfsqltype="CF_SQL_INTEGER" value="#nopseq#">
			<cfprocparam type="in" cfsqltype="CF_SQL_FLOAT" value="#goodQty#">
			<cfprocparam type="in" cfsqltype="CF_SQL_FLOAT" value="#qteDefect#">
			<cfprocparam type="in" cfsqltype="CF_SQL_FLOAT" value="#Val(qCosts.CoutMatiere)#">
			<cfprocparam type="in" cfsqltype="CF_SQL_FLOAT" value="#Val(qCosts.CoutOperation)#">
			<cfprocparam type="out" cfsqltype="CF_SQL_INTEGER" variable="pecSqlErreur">
			<cfprocparam type="out" cfsqltype="CF_SQL_INTEGER" variable="pecErreur">
		</cfstoredproc>
		<cfcatch type="any"></cfcatch>
	</cftry>

	<!--- ============================================================ --->
	<!--- cNOMENCOP quantity totals + completion logic --->
	<!--- ============================================================ --->
	<cfif isVcut AND Len(listeEpfSeq) GT 0 AND Len(listeTjseq) GT 0 AND isComp>
		<!--- VCUT completion check (QuestionnaireSortie.cfc:1124-1290) --->
		<cftry>
			<cfquery name="qQteForce" datasource="#datasourceExt#">
				SELECT TOP 1 QTE_FORCEE FROM vEcransProduction
				WHERE TRANSAC = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#transac#">
				AND OPERATION <> 'FINSH'
				AND (NO_INVENTAIRE = 'VCUT' OR PRODUIT_CODE = 'VCUT')
			</cfquery>
			<cfset LaQteTotale = Val(qQteForce.QTE_FORCEE)>

			<!--- SUM over all PROD rows for (TRANSAC, NOPSEQ) — old :1088-1096 --->
			<cfquery name="qTotalProd" datasource="#datasourcePrimary#">
				SELECT ISNULL(SUM(TJQTEPROD), 0) AS LeTJQTEPROD
				FROM TEMPSPROD
				WHERE TRANSAC = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#transac#">
				AND cNOMENCOP = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#nopseq#">
				AND MODEPROD_MPCODE = 'PROD'
			</cfquery>
			<cfset LeTJQTEPROD = Val(qTotalProd.LeTJQTEPROD)>

			<cfif LaQteTotale GT 0 AND (LaQteTotale - LeTJQTEPROD) LE 0>
				<!--- VCUT-COMPLETE block (old :1186-1290) --->
				<cfquery name="qCompMp" datasource="#datasourcePrimary#">
					SELECT TOP 1 MPSEQ, MPDESC_P, MPDESC_S FROM MODEPROD WHERE MPCODE = 'COMP'
				</cfquery>
				<cfset compMpseq = Val(qCompMp.MPSEQ)>
				<cfset compDescP = "">
				<cfset compDescS = "">
				<cfif qCompMp.RecordCount GT 0>
					<cfset compDescP = qCompMp.MPDESC_P>
					<cfset compDescS = qCompMp.MPDESC_S>
				</cfif>

				<!--- Step 9a: Per-EPF — update cNOMENCOP with quantities --->
				<cfloop list="#listeEpfSeq#" index="pfseq2">
					<cfquery name="qPfno2" datasource="#datasourcePrimary#">
						SELECT PFNOTRANS FROM ENTRERPRODFINI
						WHERE PFSEQ = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#Val(pfseq2)#">
					</cfquery>
					<cfif qPfno2.RecordCount GT 0 AND Len(Trim(qPfno2.PFNOTRANS)) GT 0>
						<cfquery name="qTpForEpf" datasource="#datasourcePrimary#">
							SELECT INVENTAIRE_C, SUM(TJQTEPROD) AS totalGood, SUM(TJQTEDEFECT) AS totalDefect
							FROM TEMPSPROD
							WHERE ENTRERPRODFINI_PFNOTRANS = <cfqueryparam cfsqltype="CF_SQL_VARCHAR" maxlength="9" value="#Left(Trim(qPfno2.PFNOTRANS), 9)#">
							GROUP BY INVENTAIRE_C
						</cfquery>
						<cfif qTpForEpf.RecordCount GT 0>
							<cfquery datasource="#datasourcePrimary#">
								UPDATE cNOMENCOP
								SET NOPQTETERMINE = <cfqueryparam cfsqltype="CF_SQL_FLOAT" value="#Val(qTpForEpf.totalGood)#">,
									NOPQTESCRAP = <cfqueryparam cfsqltype="CF_SQL_FLOAT" value="#Val(qTpForEpf.totalDefect)#">
								WHERE TRANSAC = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#transac#">
								AND INVENTAIRE_P = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#Val(qTpForEpf.INVENTAIRE_C)#">
							</cfquery>
							<!--- Step 9b: PL_RESULTAT PR_TERMINE for the current NOPSEQ only --->
							<cfquery datasource="#datasourcePrimary#">
								UPDATE PL_RESULTAT SET PR_TERMINE = 1
								WHERE cNOMENCOP = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#nopseq#">
							</cfquery>
						</cfif>
					</cfif>
				</cfloop>

				<!--- Step 9c: All ListeTJSEQ — set COMP + denormalized cols + TJPROD_TERMINE --->
				<cfquery datasource="#datasourcePrimary#">
					UPDATE TEMPSPROD
					SET MODEPROD = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#compMpseq#">,
						MODEPROD_MPCODE = 'COMP',
						MODEPROD_MPDESC_P = <cfqueryparam cfsqltype="CF_SQL_VARCHAR" maxlength="60" value="#compDescP#">,
						MODEPROD_MPDESC_S = <cfqueryparam cfsqltype="CF_SQL_VARCHAR" maxlength="60" value="#compDescS#">,
						TJFINDATE = GETDATE(),
						TJPROD_TERMINE = 1
					WHERE TJSEQ IN (<cfqueryparam cfsqltype="CF_SQL_INTEGER" list="true" value="#listeTjseq#">)
				</cfquery>

				<!--- Step 9d: INVENTAIRE_C = 10525 hardcode (old :1267-1274) --->
				<cfquery datasource="#datasourcePrimary#">
					UPDATE TEMPSPROD SET TJQTEPROD = 1
					WHERE INVENTAIRE_C = 10525
					AND TRANSAC = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#transac#">
					AND cNOMENCOP = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#nopseq#">
					AND MODEPROD = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#compMpseq#">
				</cfquery>

				<!--- Step 9e: Close transaction --->
				<cfquery datasource="#datasourcePrimary#">
					UPDATE TRANSAC SET TRSTATUTITEM = 1
					WHERE TRSEQ = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#transac#">
				</cfquery>
			<cfelse>
				<!--- VCUT-INCOMPLETE: reset cNOMENCOP quantities to 0 (old :1282) --->
				<cfloop list="#listeEpfSeq#" index="pfseq3">
					<cfquery name="qPfno3" datasource="#datasourcePrimary#">
						SELECT PFNOTRANS FROM ENTRERPRODFINI
						WHERE PFSEQ = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#Val(pfseq3)#">
					</cfquery>
					<cfif qPfno3.RecordCount GT 0 AND Len(Trim(qPfno3.PFNOTRANS)) GT 0>
						<cfquery name="qTpForEpf3" datasource="#datasourcePrimary#">
							SELECT DISTINCT INVENTAIRE_C FROM TEMPSPROD
							WHERE ENTRERPRODFINI_PFNOTRANS = <cfqueryparam cfsqltype="CF_SQL_VARCHAR" maxlength="9" value="#Left(Trim(qPfno3.PFNOTRANS), 9)#">
						</cfquery>
						<cfloop query="qTpForEpf3">
							<cfquery datasource="#datasourcePrimary#">
								UPDATE cNOMENCOP
								SET NOPQTETERMINE = 0, NOPQTESCRAP = 0, NOPQTERESTE = 0
								WHERE TRANSAC = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#transac#">
								AND INVENTAIRE_P = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#Val(qTpForEpf3.INVENTAIRE_C)#">
							</cfquery>
						</cfloop>
					</cfif>
				</cfloop>
			</cfif>
			<cfcatch type="any"></cfcatch>
		</cftry>
	<cfelse>
		<!--- Auto STOP->COMP flip (old QS:1086-1169 — runs BEFORE the cNOMENCOP totals;
		      exact replica, FIX-9). Sums PROD rows only; target per FMCODE family;
		      flips rows to COMP with FK + MPCODE + descriptions + TJFINDATE. --->
		<cfif isStop>
			<cftry>
				<cfquery name="qFlipSum" datasource="#datasourcePrimary#">
					SELECT SUM(TJQTEPROD) AS TotalPROD, SUM(TJQTEDEFECT) AS TotalDEFECT
					FROM TEMPSPROD
					WHERE TRANSAC = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#transac#">
					AND cNomencOp = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#nopseq#">
					AND MODEPROD_MPCODE = 'PROD'
				</cfquery>
				<cfset LeTJQTEPROD = Val(qFlipSum.TotalPROD)>

				<!--- Target per machine family (old QS:1098-1124): PRESS/VENPR/FLATP use
				      DCQTE_A_PRESSER when > 0 else DCQTE_A_FAB; others max(0, DCQTE_A_FAB) --->
				<cfquery name="qFlipOp" datasource="#datasourceExt#">
					SELECT TOP 1 v.FMCODE, VBE.DCQTE_A_FAB, VBE.DCQTE_A_PRESSER
					FROM vEcransProduction v
					LEFT OUTER JOIN dbo.VSP_BonTravail_Entete AS VBE ON VBE.TRANSAC = v.TRANSAC
					WHERE v.TRANSAC = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#transac#">
					AND v.NOPSEQ = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#nopseq#">
					AND v.OPERATION <> 'FINSH'
				</cfquery>
				<cfset flipFmcode = "">
				<cfset dcAFab = 0>
				<cfset dcAPresser = 0>
				<cfif qFlipOp.RecordCount GT 0>
					<cfset flipFmcode = qFlipOp.FMCODE>
					<cfset dcAFab = Ceiling(Val(qFlipOp.DCQTE_A_FAB))>
					<cfset dcAPresser = Ceiling(Val(qFlipOp.DCQTE_A_PRESSER))>
				</cfif>
				<cfif FindNoCase("PRESS", flipFmcode) NEQ 0 OR FindNoCase("VENPR", flipFmcode) NEQ 0 OR FindNoCase("FLATP", flipFmcode) NEQ 0>
					<cfif dcAPresser LTE 0>
						<cfset LaQuantiteAFab = dcAFab>
					<cfelse>
						<cfset LaQuantiteAFab = dcAPresser>
					</cfif>
				<cfelse>
					<cfif dcAFab LT 0>
						<cfset LaQuantiteAFab = 0>
					<cfelse>
						<cfset LaQuantiteAFab = dcAFab>
					</cfif>
				</cfif>

				<cfif (LaQuantiteAFab - LeTJQTEPROD) LTE 0>
					<cfquery name="qFlipMp" datasource="#datasourcePrimary#">
						SELECT MPSEQ, MPDESC_P, MPDESC_S FROM MODEPROD WHERE MPCODE = 'COMP'
					</cfquery>

					<!--- trouveCeTJSEQ: latest row of the operation (old QS:1137-1146) --->
					<cfquery name="qFlipCeTj" datasource="#datasourcePrimary#">
						SELECT TOP 1 TJSEQ FROM TEMPSPROD
						WHERE TRANSAC = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#transac#">
						<cfif copmachine NEQ 0>
							AND cNOMENCOP_MACHINE = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#copmachine#">
						</cfif>
						AND cNOMENCOP = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#nopseq#">
						ORDER BY TJSEQ DESC
					</cfquery>

					<cfquery datasource="#datasourcePrimary#">
						UPDATE PL_RESULTAT SET PR_TERMINE = 1
						WHERE cNOMENCOP = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#nopseq#">
					</cfquery>

					<!--- Old ListeTJSEQ defaults to arguments.TJSEQ (the STOP row) and the
					      latest row is appended (QS:613-615, :1154) — dedupe and flip each --->
					<cfset flipList = "">
					<cfif stopTjseq GT 0><cfset flipList = ListAppend(flipList, stopTjseq)></cfif>
					<cfif qFlipCeTj.RecordCount GT 0><cfset flipList = ListAppend(flipList, Val(qFlipCeTj.TJSEQ))></cfif>
					<cfset flipList = ListRemoveDuplicates(flipList)>
					<cfloop list="#flipList#" index="ceFlipTj">
						<cfquery datasource="#datasourcePrimary#">
							UPDATE TEMPSPROD
							SET MODEPROD = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#Val(qFlipMp.MPSEQ)#">,
								MODEPROD_MPCODE = 'COMP',
								MODEPROD_MPDESC_P = <cfqueryparam cfsqltype="CF_SQL_VARCHAR" maxlength="50" value="#Left(qFlipMp.MPDESC_P, 50)#">,
								MODEPROD_MPDESC_S = <cfqueryparam cfsqltype="CF_SQL_VARCHAR" maxlength="50" value="#Left(qFlipMp.MPDESC_S, 50)#">,
								TJFINDATE = <cfqueryparam cfsqltype="CF_SQL_TIMESTAMP" value="#CreateODBCDateTime(Now())#">,
								TJPROD_TERMINE = 1
							WHERE TJSEQ = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#Val(ceFlipTj)#">
						</cfquery>
					</cfloop>
				</cfif>
				<cfcatch type="any"></cfcatch>
			</cftry>
		</cfif>

		<!--- Non-VCUT: aggregate cNOMENCOP totals — AFTER the flip (old order:
		      flip QS:1130-1169, totals QS:1171-1184). NOPQTERESTE formula is the
		      CORRECTED one pending the FIX-8 decision (legacy sets RESTE=SUM(TJQTEPROD)). --->
		<cftry>
			<cfquery datasource="#datasourcePrimary#">
				UPDATE CNOMENCOP SET
					NOPQTETERMINE = (SELECT ISNULL(SUM(TJQTEPROD), 0) FROM TEMPSPROD WHERE TRANSAC = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#transac#"> AND CNOMENCOP = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#nopseq#"> AND MODEPROD_MPCODE = 'Prod'),
					NOPQTESCRAP = (SELECT ISNULL(SUM(TJQTEDEFECT), 0) FROM TEMPSPROD WHERE TRANSAC = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#transac#"> AND CNOMENCOP = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#nopseq#"> AND MODEPROD_MPCODE = 'Prod'),
					NOPQTERESTE = NOPQTEAFAIRE - (SELECT ISNULL(SUM(TJQTEPROD), 0) + ISNULL(SUM(TJQTEDEFECT), 0) FROM TEMPSPROD WHERE TRANSAC = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#transac#"> AND CNOMENCOP = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#nopseq#"> AND MODEPROD_MPCODE = 'Prod')
				WHERE NOPSEQ = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#nopseq#">
			</cfquery>
			<cfcatch type="any"></cfcatch>
		</cftry>

		<!--- Mark operation as complete in PL_RESULTAT if COMP --->
		<cfif isComp>
			<cfquery datasource="#datasourcePrimary#">
				UPDATE PL_RESULTAT SET PR_TERMINE = 1
				WHERE cNOMENCOP = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#nopseq#">
			</cfquery>
		</cfif>
	</cfif>

	<!--- Return response --->
	<cfset data = StructNew("ordered")>
	<cfset data["transac"] = transac>
	<cfset data["type"] = qtype>
	<cfset data["tjseq"] = mainTjseq>
	<cfset data["nopseq"] = nopseq>

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
