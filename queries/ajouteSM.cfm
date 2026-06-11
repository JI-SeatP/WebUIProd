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
		<cfset dbPrimary = "AF_SEATPLY">
	<cfelse>
		<cfset datasourcePrimary = "TS_SEATPL">
		<cfset datasourceExt = "TS_SEATPL_EXT">
		<cfset dbPrimary = "TS_SEATPL">
	</cfif>

	<!--- Material warning: set when total available skid qty < QTE_CIBLE needed --->
	<cfset materialWarning = "">
	<!--- Container options for SKID dropdown — populated near end of request --->
	<cfset containerOptions = []>

	<!--- Include AutoFab SOAP utility --->
	<cfinclude template="lib/autofabSoap.cfm">

	<!--- Parse JSON body --->
	<cfset requestBody = DeserializeJSON(GetHttpRequestData().content)>
	<cfset transac = Val(requestBody["transac"])>
	<cfset copmachine = Val(requestBody["copmachine"])>
	<cfset nopseq = Val(requestBody["nopseq"])>
	<cfset qteBonne = Val(requestBody["qteBonne"])>
	<cfset smnotransInput = "">
	<cfif StructKeyExists(requestBody, "smnotrans")>
		<cfset smnotransInput = Trim(requestBody["smnotrans"])>
	</cfif>
	<cfset isVcut = false>
	<cfif StructKeyExists(requestBody, "isVcut")>
		<cfset isVcut = requestBody["isVcut"]>
	</cfif>
	<cfset listeTjseq = "">
	<cfif StructKeyExists(requestBody, "listeTjseq")>
		<cfset listeTjseq = Trim(requestBody["listeTjseq"])>
	</cfif>
	<cfset listeSmseq = "">
	<cfif StructKeyExists(requestBody, "listeSmseq")>
		<cfset listeSmseq = Trim(requestBody["listeSmseq"])>
	</cfif>
	<!--- Old software passes session.InfoClient.NOMEMPLOYE (left 50) to all SPs --->
	<cfset employeeName = "">
	<cfif StructKeyExists(requestBody, "employeeName")>
		<cfset employeeName = Trim(requestBody["employeeName"])>
	</cfif>

	<cfif transac EQ 0>
		<cfset response["success"] = false>
		<cfset response["error"] = "transac is required">
		<cfoutput>#SerializeJSON(response)#</cfoutput><cfabort>
	</cfif>

	<!--- Server time --->
	<cfquery name="qTime" datasource="#datasourcePrimary#">
		SELECT FORMAT(GETDATE(), 'yyyy-MM-dd') AS d, FORMAT(GETDATE(), 'HH:mm:ss') AS t
	</cfquery>
	<cfset dateStr = qTime.d>
	<cfset timeStr = qTime.t>

	<!--- Load operation (replicates ConstruitDonneesLocales) --->
	<cfquery name="qOperation" datasource="#datasourceExt#">
		SELECT TOP 1 v.OPERATION_SEQ, v.MACHINE, v.INVENTAIRE_SEQ, v.NOPSEQ,
			v.NO_INVENTAIRE, v.PRODUIT_CODE, v.ENTREPOT
		FROM vEcransProduction v
		WHERE v.TRANSAC = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#transac#">
		<cfif copmachine NEQ 0>
			AND v.COPMACHINE = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#copmachine#">
		</cfif>
		AND v.OPERATION <> 'FINSH'
	</cfquery>

	<!--- Get operation-par-transac for NISTR_NIVEAU --->
	<cfquery name="qOpTransac" datasource="#datasourcePrimary#">
		SELECT TOP 1 v.NISTR_NIVEAU, v.NISEQ, v.UtiliseInventaire
		FROM VOperationParTransac v
		WHERE v.TRANSAC = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#transac#">
		AND v.NOPSEQ = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#nopseq#">
	</cfquery>

	<!--- Get TRANSAC info — TRITEM/CONOTRANS/TRNORELACHE via COMMANDE join.
	      EXACT replica of old trouveLesInfosTransac (operation.cfc:4466-4473):
	      COMMANDE INNER JOIN TRANSAC ON CONOTRANS = TRNO AND TRITEM > 0 --->
	<cfquery name="qTransacInfo" datasource="#datasourcePrimary#">
		SELECT T.TRITEM, T.TRNORELACHE, C.CONOTRANS
		FROM TRANSAC T
		INNER JOIN COMMANDE C ON C.CONOTRANS = T.TRNO AND T.TRITEM > 0
		WHERE T.TRSEQ = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#transac#">
	</cfquery>
	<cfset TRITEM = Val(qTransacInfo.TRITEM)>
	<cfset TRNORELACHE = Val(qTransacInfo.TRNORELACHE)>
	<cfset CONOTRANS = qTransacInfo.CONOTRANS>

	<!--- Gate — old QteBonne.cfc:107-158: the endpoint is never invoked when the
	      operation doesn't use inventory (and old SortieMateriel skips when the
	      COMMANDE join finds no row). VCUT always creates SM. --->
	<cfset utiliseSM = 0>
	<cfif qOpTransac.RecordCount GT 0>
		<cfset utiliseSM = Val(qOpTransac.UtiliseInventaire)>
	</cfif>
	<cfif qTransacInfo.RecordCount EQ 0 OR (utiliseSM NEQ 1 AND NOT isVcut)>
		<cfset data = StructNew("ordered")>
		<cfset data["smnotrans"] = "">
		<cfset data["smseq"] = 0>
		<cfset data["materials"] = []>
		<cfset data["containerOptions"] = []>
		<cfset data["materialWarning"] = "">
		<cfset response["success"] = true>
		<cfset response["data"] = data>
		<cfset response["message"] = "No SM needed for this operation">
		<cfoutput>#SerializeJSON(response)#</cfoutput><cfabort>
	</cfif>

	<!--- VCUT overrides (support.cfc:922-925) --->
	<cfset operationSeq = Val(qOperation.OPERATION_SEQ)>
	<cfset nistrNiveau = "">
	<cfif qOpTransac.RecordCount GT 0>
		<cfset nistrNiveau = qOpTransac.NISTR_NIVEAU>
	</cfif>
	<cfif isVcut>
		<cfset operationSeq = 1>
		<cfset nistrNiveau = "00101">
	</cfif>

	<!--- Employee name for SP user params (old session.InfoClient.NOMEMPLOYE, left 50) --->
	<cfset empName = "WebUI New">
	<cfif Len(employeeName) GT 0>
		<cfset empName = Left(employeeName, 50)>
	</cfif>

	<cfset SmNoTransCible = "">
	<cfset smseqResult = 0>

	<!--- ============================================================ --->
	<!--- VCUT SM PATH (SortieMateriel.cfc:1648-1836) --->
	<!--- ============================================================ --->
	<cfif isVcut AND Len(listeTjseq) GT 0>

		<!--- 1. Find PROD TJSEQ (SortieMateriel.cfc:1651-1662) --->
		<cfquery name="qTJSEQPROD" datasource="#datasourcePrimary#">
			SELECT TOP 1 TJSEQ
			FROM TEMPSPROD
			WHERE TRANSAC = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#transac#">
			AND CNOMENCOP = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#nopseq#">
			AND MODEPROD_MPCODE = 'PROD'
			ORDER BY TJSEQ DESC
		</cfquery>
		<cfset LeTJSEQProd = 0>
		<cfif qTJSEQPROD.RecordCount GT 0>
			<cfset LeTJSEQProd = Val(qTJSEQPROD.TJSEQ)>
		</cfif>

		<!--- 2. Three-pass SMNOTRANS lookup (SortieMateriel.cfc:1666-1704) --->

		<!--- Pass 1: Check TEMPSPROD for PROD row's SMNOTRANS --->
		<cfif LeTJSEQProd GT 0>
			<cfquery name="qSMProd" datasource="#datasourcePrimary#">
				SELECT TOP 1 SMNOTRANS
				FROM TEMPSPROD
				WHERE TJSEQ = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#LeTJSEQProd#">
				AND MODEPROD_MPCODE = 'PROD'
				AND ISNULL(NULLIF(LTRIM(RTRIM(SMNOTRANS)),''),'') <> ''
			</cfquery>
			<cfif qSMProd.RecordCount GT 0>
				<cfset SmNoTransCible = Trim(qSMProd.SMNOTRANS)>
			</cfif>
		</cfif>

		<!--- Pass 2 & 3: SKIPPED for VCUT — the old software builds ListeTJSEQ incrementally
		      during the session. On a fresh "+" click it only contains the TJSEQ just created
		      by addVcutQty. Using ALL PROD rows would include historical rows with SMNOTRANS
		      populated, causing SM reuse instead of creation.
		      (SortieMateriel.cfc:1534-1536, 1664-1704) --->

		<!--- 3. Compute batch quantity using MAX not SUM (SortieMateriel.cfc:1706-1718).
		      Exact same query as old software, scoped to session-scoped LeTJSEQProd. --->
		<cfquery name="qTotPF" datasource="#datasourcePrimary#">
			SELECT
				MAX(ISNULL(TJQTEPROD, 0)) AS TOTALQTEPROD,
				MAX(ISNULL(TJQTEDEFECT, 0)) AS TOTALQTEDEFECT
			FROM TEMPSPROD
			WHERE TJSEQ = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#LeTJSEQProd#">
			AND MODEPROD_MPCODE = 'PROD'
		</cfquery>
		<cfset TotalQteVCUT_Bonne = Val(qTotPF.TOTALQTEPROD)>
		<cfset TotalQteVCUT_Def = Val(qTotPF.TOTALQTEDEFECT)>
		<cfset TotalQteVCUT = TotalQteVCUT_Bonne + TotalQteVCUT_Def>

		<!--- 4. Branch: no existing SM — create via Nba_Sp_Insert_Sortie_Materiel --->
		<cfif Len(SmNoTransCible) EQ 0>
			<!--- InsertSortieMateriel (SortieMateriel.cfc:2284) --->
			<!--- HEURE is 5-char HH:nn (old SM:2281 TimeFormat 'HH:nn') --->
			<cfset insertSmParams = "#TRITEM#,'#Left(CONOTRANS, 9)#','#dateStr#','#Left(timeStr, 5)#',#TotalQteVCUT#,'#Left(empName, 50)#','','Ecran de production pour SM',0,'0'">
			<cfset insertSmResult = autofabExecuteStoredProc(datasourcePrimary, "Nba_Sp_Insert_Sortie_Materiel", insertSmParams, "0")>

			<!--- Extract NEWSMNOTRANS --->
			<cfif StructKeyExists(insertSmResult, "outputs") AND StructKeyExists(insertSmResult.outputs, "NEWSMNOTRANS")>
				<cfset SmNoTransCible = Trim(insertSmResult.outputs.NEWSMNOTRANS)>
			</cfif>

			<!--- Now call Nba_Sp_Sortie_Materiel to create DET_TRANS rows (SortieMateriel.cfc:2334) --->
			<cfif Len(SmNoTransCible) GT 0>
				<cfset sortieSmParams = "'#Left(SmNoTransCible, 9)#',#TRITEM#,'#Left(CONOTRANS, 9)#',#TotalQteVCUT#,#operationSeq#,'#Left(empName, 50)#','#Left(nistrNiveau, 500)#','',#TRNORELACHE#">
				<cfset sortieSmResult = autofabExecuteStoredProc(datasourcePrimary, "Nba_Sp_Sortie_Materiel", sortieSmParams, "0")>
			</cfif>

		<cfelse>
			<!--- 5. Branch: existing SM — update via Nba_Sp_Sortie_Materiel only (SortieMateriel.cfc:1756) --->
			<cfset updateSmParams = "'#Left(SmNoTransCible, 9)#',#TRITEM#,'#Left(CONOTRANS, 9)#',#TotalQteVCUT#,#operationSeq#,'#Left(empName, 50)#','#Left(nistrNiveau, 500)#','',#TRNORELACHE#">
			<cfset updateSmResult = autofabExecuteStoredProc(datasourcePrimary, "Nba_Sp_Sortie_Materiel", updateSmParams, "0")>
		</cfif>

		<!--- 6. Batch TEMPSPROD link (SortieMateriel.cfc:1797-1813) --->
		<cfif Len(SmNoTransCible) GT 0>
			<!--- Update empty SMNOTRANS slots --->
			<cfquery datasource="#datasourcePrimary#">
				UPDATE TEMPSPROD
				SET SMNOTRANS = <cfqueryparam cfsqltype="CF_SQL_VARCHAR" maxlength="9" value="#Left(SmNoTransCible, 9)#">
				WHERE TJSEQ IN (<cfqueryparam cfsqltype="CF_SQL_INTEGER" list="true" value="#listeTjseq#">)
				AND MODEPROD_MPCODE = 'PROD'
				AND ISNULL(NULLIF(LTRIM(RTRIM(SMNOTRANS)),''),'') = ''
			</cfquery>

			<!--- Ensure PROD TJSEQ itself has SMNOTRANS --->
			<cfif LeTJSEQProd GT 0>
				<cfquery datasource="#datasourcePrimary#">
					UPDATE TEMPSPROD
					SET SMNOTRANS = <cfqueryparam cfsqltype="CF_SQL_VARCHAR" maxlength="9" value="#Left(SmNoTransCible, 9)#">
					WHERE TJSEQ = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#LeTJSEQProd#">
					AND MODEPROD_MPCODE = 'PROD'
				</cfquery>
			</cfif>
		</cfif>

		<!--- 7. Get SMSEQ (SortieMateriel.cfc:1815-1833) --->
		<cfif Len(SmNoTransCible) GT 0>
			<cfquery name="qSMSEQ" datasource="#datasourcePrimary#">
				SELECT TOP 1 SMSEQ FROM SORTIEMATERIEL
				WHERE SMNOTRANS = <cfqueryparam cfsqltype="CF_SQL_VARCHAR" maxlength="9" value="#Left(SmNoTransCible, 9)#">
			</cfquery>
			<cfif qSMSEQ.RecordCount GT 0>
				<cfset smseqResult = Val(qSMSEQ.SMSEQ)>
			<cfelse>
				<!--- Fallback: use TRSEQ from TRANSAC --->
				<cfquery name="qTRSEQSM" datasource="#datasourcePrimary#">
					SELECT TOP 1 TRSEQ FROM TRANSAC
					WHERE TRNO = <cfqueryparam cfsqltype="CF_SQL_VARCHAR" maxlength="9" value="#Left(SmNoTransCible, 9)#">
				</cfquery>
				<cfif qTRSEQSM.RecordCount GT 0>
					<cfset smseqResult = Val(qTRSEQSM.TRSEQ)>
				</cfif>
			</cfif>
		</cfif>

		<!--- 8. VCUT smart per-skid distribution (replaces old SW uniform-qty-per-row).
		     For each SM material line, compute QTE_CIBLE via BOM ratio, then distribute
		     across available skids ordered by CON_SEQ ASC (greedy first-fit). Writes one
		     DET_TRANS row per consumed skid via Nba_Insert_Det_Trans_Avec_Contenant.
		     If total skid availability < QTE_CIBLE, sets materialWarning. --->
		<cfif Len(SmNoTransCible) GT 0 AND Len(listeTjseq) GT 0>
			<!--- Get all SM material lines from DET_TRANS --->
			<cfquery name="qDetLines" datasource="#datasourcePrimary#">
				SELECT DT.DTRSEQ, DT.TRANSAC, DT.ENTREPOT, DT.CONTENANT, DT.DTRQTE,
					T.INVENTAIRE AS T_INVENTAIRE, DT.TRANSAC_TRNO
				FROM DET_TRANS DT
				INNER JOIN TRANSAC T ON DT.TRANSAC = T.TRSEQ
				WHERE DT.TRANSAC_TRNO = <cfqueryparam cfsqltype="CF_SQL_VARCHAR" maxlength="9" value="#Left(SmNoTransCible, 9)#">
			</cfquery>

			<cfloop query="qDetLines">
				<cfset matInv = Val(qDetLines.T_INVENTAIRE)>
				<cfset detTrseq = Val(qDetLines.TRANSAC)>
				<cfset detEntrepot = Val(qDetLines.ENTREPOT)>

				<!--- 8.1 Compute QTE_CIBLE via BOM ratio (calculeQteSMQS lines 1081-1115) --->
				<cfquery name="qQteCible" datasource="#datasourcePrimary#">
					SELECT SUM(
						(ISNULL(TP.TJQTEPROD, 0) + ISNULL(TP.TJQTEDEFECT, 0))
						* ISNULL(RATIO.NIQTE, 0)
					) AS QTE_CIBLE
					FROM TEMPSPROD TP
					INNER JOIN cNOMENCOP COP ON COP.TRANSAC = TP.TRANSAC AND COP.INVENTAIRE_P = TP.INVENTAIRE_C
					OUTER APPLY (
						SELECT MAX(CN.NIQTE) AS NIQTE
						FROM cNOMENCLATURE CN
						WHERE CN.NISEQ_PERE = COP.CNOMENCLATURE
							AND CN.INVENTAIRE_M = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#matInv#">
					) RATIO
					WHERE TP.TRANSAC = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#transac#">
						AND TP.SMNOTRANS = <cfqueryparam cfsqltype="CF_SQL_VARCHAR" maxlength="9" value="#Left(SmNoTransCible, 9)#">
						AND TP.TJSEQ IN (<cfqueryparam cfsqltype="CF_SQL_INTEGER" list="true" value="#listeTjseq#">)
						AND TP.MODEPROD_MPCODE = 'PROD'
				</cfquery>

				<cfset qteCible = Val(qQteCible.QTE_CIBLE)>
				<cfif qteCible LTE 0>
					<!--- Skip when ratio not resolved — preserve existing DTRQTE --->
					<cfcontinue>
				</cfif>

				<!--- 8.2 Fetch available skids ordered by CON_SEQ ASC (dropdown order) --->
				<cfquery name="qSkids" datasource="#datasourceExt#">
					SELECT v.CONTENANT_CON_NUMERO, c.CON_SEQ AS conSeq,
						v.DTRQTE AS remainingQty, v.ENTREPOT
					FROM VSP_BonTravail_VeneerReserve v
					LEFT OUTER JOIN #dbPrimary#.dbo.CONTENANT c ON v.CONTENANT_CON_NUMERO = c.CON_NUMERO
					WHERE v.TRANSAC = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#transac#">
					ORDER BY c.CON_SEQ ASC
				</cfquery>

				<!--- 8.3 Greedy first-fit allocation across skids --->
				<cfset remaining = qteCible>
				<cfset totalAvailable = 0>
				<cfset allocations = []>
				<cfloop query="qSkids">
					<cfset skidQty = Val(qSkids.remainingQty)>
					<cfif Val(qSkids.conSeq) EQ 0 OR skidQty LTE 0>
						<cfcontinue>
					</cfif>
					<cfset totalAvailable = totalAvailable + skidQty>
					<cfif remaining LTE 0>
						<cfcontinue>
					</cfif>
					<cfset take = Min(remaining, skidQty)>
					<cfset alloc = StructNew()>
					<cfset alloc["conSeq"] = Val(qSkids.conSeq)>
					<cfset alloc["conNumero"] = qSkids.CONTENANT_CON_NUMERO>
					<cfset alloc["qty"] = take>
					<cfset skidEnt = Val(qSkids.ENTREPOT)>
					<cfif skidEnt EQ 0>
						<cfset skidEnt = detEntrepot>
					</cfif>
					<cfset alloc["entrepot"] = skidEnt>
					<cfset ArrayAppend(allocations, alloc)>
					<cfset remaining = remaining - take>
				</cfloop>

				<cfif remaining GT 0>
					<cfset materialWarning = "Not enough material. Only " & totalAvailable & " of " & qteCible & " needed are available.">
				</cfif>

				<!--- 8.4 Write DET_TRANS rows — one per consumed skid --->
				<cfloop array="#allocations#" index="alloc">
					<cfstoredproc procedure="Nba_Insert_Det_Trans_Avec_Contenant" datasource="#datasourcePrimary#">
						<cfprocparam type="in" cfsqltype="CF_SQL_INTEGER" value="#detTrseq#">
						<cfprocparam type="in" cfsqltype="CF_SQL_INTEGER" value="#matInv#">
						<cfprocparam type="in" cfsqltype="CF_SQL_VARCHAR" value="">
						<cfprocparam type="in" cfsqltype="CF_SQL_INTEGER" value="#alloc.entrepot#">
						<cfprocparam type="in" cfsqltype="CF_SQL_FLOAT" value="#alloc.qty#">
						<cfprocparam type="in" cfsqltype="CF_SQL_FLOAT" value="1">
						<cfprocparam type="in" cfsqltype="CF_SQL_INTEGER" value="#alloc.conSeq#">
						<cfprocparam type="in" cfsqltype="CF_SQL_VARCHAR" value="#Left(empName, 50)#">
						<cfprocparam type="out" cfsqltype="CF_SQL_INTEGER" variable="spSqlErreur">
						<cfprocparam type="out" cfsqltype="CF_SQL_INTEGER" variable="spError">
						<cfprocparam type="out" cfsqltype="CF_SQL_INTEGER" variable="spDtrseq">
					</cfstoredproc>
				</cfloop>
			</cfloop>
		</cfif>

	<cfelse>
		<!--- ============================================================ --->
		<!--- NON-VCUT SM PATH — EXACT replica of SortieMateriel.cfc AjouteSM --->
		<!--- (:1838-1973) + InsertSortieMateriel (:2259-2405) + calculeQteSMQS --->
		<!--- Mode='Mod' recalc (:1262-1350) --->
		<!--- ============================================================ --->
		<cfquery name="qProdRow" datasource="#datasourcePrimary#">
			SELECT TOP 1 TJSEQ, SMNOTRANS, TJQTEDEFECT, INVENTAIRE_C
			FROM TEMPSPROD
			WHERE TRANSAC = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#transac#">
			AND CNOMENCOP = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#nopseq#">
			AND MODEPROD_MPCODE = 'PROD'
			AND TJNOTE LIKE 'Ecran de production pour Temps prod%'
			ORDER BY TJSEQ DESC
		</cfquery>

		<cfif qProdRow.RecordCount GT 0>
			<cfset LeTJSEQ = Val(qProdRow.TJSEQ)>
			<cfset QteDefectueux = Val(qProdRow.TJQTEDEFECT)>
			<cfset InventaireC = Val(qProdRow.INVENTAIRE_C)>
			<!--- TotalQte = good + defect (old :1645, :2283) --->
			<cfset TotalQte = qteBonne + QteDefectueux>

			<!--- Step 1: write BOTH TJQTEPROD and TJQTEDEFECT (old :1841-1854) ---
			      with the SMNOTRANS-match WHERE variant when an SM was passed --->
			<cfif Len(smnotransInput) GT 0>
				<cfquery datasource="#datasourcePrimary#">
					UPDATE TEMPSPROD
					SET TJQTEPROD = <cfqueryparam cfsqltype="CF_SQL_FLOAT" value="#qteBonne#">,
						TJQTEDEFECT = <cfqueryparam cfsqltype="CF_SQL_FLOAT" value="#QteDefectueux#">
					WHERE LEFT(SMNOTRANS, 9) = <cfqueryparam cfsqltype="CF_SQL_VARCHAR" maxlength="9" value="#Left(smnotransInput, 9)#">
					AND TRANSAC = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#transac#">
					AND CNOMENCOP = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#nopseq#">
					AND MODEPROD_MPCODE = 'PROD'
				</cfquery>
			<cfelse>
				<cfquery datasource="#datasourcePrimary#">
					UPDATE TEMPSPROD
					SET TJQTEPROD = <cfqueryparam cfsqltype="CF_SQL_FLOAT" value="#qteBonne#">,
						TJQTEDEFECT = <cfqueryparam cfsqltype="CF_SQL_FLOAT" value="#QteDefectueux#">
					WHERE TJSEQ = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#LeTJSEQ#">
					AND MODEPROD_MPCODE = 'PROD'
				</cfquery>
			</cfif>

			<!--- Step 2: SM lookup — payload first, then ALL PROD rows of
			      TRANSAC+CNOMENCOP preferring SMNOTRANS<>'' (old :1615-1632, :1857-1876) --->
			<cfset SmNoTransCible = Left(smnotransInput, 9)>
			<cfif Len(SmNoTransCible) EQ 0>
				<cfquery name="qSMAnyProd" datasource="#datasourcePrimary#">
					SELECT TOP 1 SMNOTRANS
					FROM TEMPSPROD
					WHERE TRANSAC = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#transac#">
					AND CNOMENCOP = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#nopseq#">
					AND MODEPROD_MPCODE = 'PROD'
					AND ISNULL(NULLIF(LTRIM(RTRIM(SMNOTRANS)),''),'') <> ''
					ORDER BY TJSEQ DESC
				</cfquery>
				<cfif qSMAnyProd.RecordCount GT 0>
					<cfset SmNoTransCible = Trim(qSMAnyProd.SMNOTRANS)>
				</cfif>
			</cfif>

			<!--- Orphan check: SMNOTRANS with no TRANSAC header → clear link, force creation
			      (old :1881-1905) --->
			<cfif Len(SmNoTransCible) GT 0>
				<cfquery name="qHeaderCheck" datasource="#datasourcePrimary#">
					SELECT TOP 1 TRSEQ FROM TRANSAC
					WHERE TRNO = <cfqueryparam cfsqltype="CF_SQL_VARCHAR" maxlength="9" value="#Left(SmNoTransCible, 9)#">
				</cfquery>
				<cfif qHeaderCheck.RecordCount EQ 0>
					<cfquery datasource="#datasourcePrimary#">
						UPDATE TEMPSPROD SET SMNOTRANS = ''
						WHERE TRANSAC = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#transac#">
						AND CNOMENCOP = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#nopseq#">
						AND MODEPROD_MPCODE = 'PROD'
						AND LEFT(SMNOTRANS, 9) = <cfqueryparam cfsqltype="CF_SQL_VARCHAR" maxlength="9" value="#Left(SmNoTransCible, 9)#">
					</cfquery>
					<cfset SmNoTransCible = "">
				</cfif>
			</cfif>

			<!--- NEVER reuse a POSTED SM. Once submit posts the SM (SM/REPORT ->
			      TRPOSTER=1) its lines are immutable - Nba_Sp_Sortie_Materiel ADDS
			      new lines instead of updating, duplicating the material rows.
			      A new session always gets a fresh SM. --->
			<cfif Len(SmNoTransCible) GT 0>
				<cfquery name="qPostedCheck" datasource="#datasourcePrimary#">
					SELECT TOP 1 TRSEQ FROM TRANSAC
					WHERE TRNO = <cfqueryparam cfsqltype="CF_SQL_VARCHAR" maxlength="9" value="#Left(SmNoTransCible, 9)#">
					AND ISNULL(TRPOSTER, 0) = 1
				</cfquery>
				<cfif qPostedCheck.RecordCount GT 0>
					<cfset SmNoTransCible = "">
				</cfif>
			</cfif>

			<cfset smCreatedNow = false>
			<cfif Len(SmNoTransCible) EQ 0>
				<!--- Create new SM — InsertSortieMateriel (old :2284) with TotalQte --->
				<cfset insertSmParams = "#TRITEM#,'#Left(CONOTRANS, 9)#','#dateStr#','#Left(timeStr, 5)#',#TotalQte#,'#Left(empName, 50)#','','Ecran de production pour SM',0,'0'">
				<cfset insertSmResult = autofabExecuteStoredProc(datasourcePrimary, "Nba_Sp_Insert_Sortie_Materiel", insertSmParams, "0")>
				<cfif StructKeyExists(insertSmResult, "outputs") AND StructKeyExists(insertSmResult.outputs, "NEWSMNOTRANS")>
					<cfset SmNoTransCible = Trim(insertSmResult.outputs.NEWSMNOTRANS)>
				</cfif>

				<cfif Len(SmNoTransCible) GT 0>
					<cfset smCreatedNow = true>

					<!--- NOTE: the old create-path NIQTE gate (InsertSortieMateriel :2318-2328)
					      only fires when arguments.Inventaire <> 0, and ajouteSM always passes
					      the default "0" (signature SM:1514-1527) => it NEVER fires on this
					      path. Not replicated (FIX-2, audit 08 B9). --->
					<cfset sortieSmParams = "'#Left(SmNoTransCible, 9)#',#TRITEM#,'#Left(CONOTRANS, 9)#',#TotalQte#,#operationSeq#,'#Left(empName, 50)#','#Left(nistrNiveau, 500)#','',#TRNORELACHE#">
					<cfset sortieSmResult = autofabExecuteStoredProc(datasourcePrimary, "Nba_Sp_Sortie_Materiel", sortieSmParams, "0")>

					<!--- Robust post-create update (old :2387-2399): qtys re-written +
					      SMNOTRANS set only when currently empty --->
					<cfquery datasource="#datasourcePrimary#">
						UPDATE TEMPSPROD
						SET
							TJQTEPROD = <cfqueryparam cfsqltype="CF_SQL_FLOAT" value="#qteBonne#">,
							TJQTEDEFECT = <cfqueryparam cfsqltype="CF_SQL_FLOAT" value="#QteDefectueux#">,
							SMNOTRANS = CASE
								WHEN ISNULL(NULLIF(LTRIM(RTRIM(SMNOTRANS)),''),'') = ''
								THEN <cfqueryparam cfsqltype="CF_SQL_VARCHAR" maxlength="9" value="#Left(SmNoTransCible, 9)#">
								ELSE SMNOTRANS
							END
						WHERE TJSEQ = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#LeTJSEQ#">
						AND MODEPROD_MPCODE = 'PROD'
					</cfquery>
				</cfif>
			<cfelse>
				<!--- Update existing SM — Nba_Sp_Sortie_Materiel ONLY (old :1948-1971) --->
				<cfset updateSmParams = "'#Left(SmNoTransCible, 9)#',#TRITEM#,'#Left(CONOTRANS, 9)#',#TotalQte#,#operationSeq#,'#Left(empName, 50)#','#Left(nistrNiveau, 500)#','',#TRNORELACHE#">
				<cfset updateSmResult = autofabExecuteStoredProc(datasourcePrimary, "Nba_Sp_Sortie_Materiel", updateSmParams, "0")>
			</cfif>

			<!--- Get SMSEQ --->
			<cfif Len(SmNoTransCible) GT 0>
				<cfquery name="qSMSEQ2" datasource="#datasourcePrimary#">
					SELECT TOP 1 SMSEQ FROM SORTIEMATERIEL
					WHERE SMNOTRANS = <cfqueryparam cfsqltype="CF_SQL_VARCHAR" maxlength="9" value="#Left(SmNoTransCible, 9)#">
				</cfquery>
				<cfif qSMSEQ2.RecordCount GT 0>
					<cfset smseqResult = Val(qSMSEQ2.SMSEQ)>
				</cfif>
			</cfif>

			<!--- DET_TRANS recalc — ONLY when the session already touched an SM
			      (old Mode='Mod': sp_js.cfm:1752 computes Mode from the session
			      ListeSMSEQ hidden input, and the server function no-ops unless
			      Mode='Mod', SortieMateriel.cfc:846-848). First SM-touch of a session
			      (created OR adopted) never recalcs (FIX-3).
			      NO direct SORTIEMATERIEL/TRANSAC header writes — that block is masked
			      out in the old software (:1974-2250). --->
			<cfset sessionSmTouched = false>
			<cfloop list="#listeSmseq#" index="ceSessionSm">
				<cfif Val(ceSessionSm) GT 0><cfset sessionSmTouched = true></cfif>
			</cfloop>
			<cfif Len(SmNoTransCible) GT 0 AND sessionSmTouched>
				<cfquery name="qDetLinesStd" datasource="#datasourcePrimary#">
					SELECT DT.DTRSEQ, DT.TRANSAC, DT.ENTREPOT, DT.CONTENANT, DT.DTRQTE,
						T.INVENTAIRE AS T_INVENTAIRE, DT.TRANSAC_TRNO
					FROM DET_TRANS DT
					INNER JOIN TRANSAC T ON DT.TRANSAC = T.TRSEQ
					WHERE DT.TRANSAC_TRNO = <cfqueryparam cfsqltype="CF_SQL_VARCHAR" maxlength="9" value="#Left(SmNoTransCible, 9)#">
				</cfquery>

				<cfloop query="qDetLinesStd">
					<cfset matInvStd = Val(qDetLinesStd.T_INVENTAIRE)>
					<cfset detTrseqStd = Val(qDetLinesStd.TRANSAC)>

					<!--- NIQTE via cNOMENCOP(INVENTAIRE_P = INVENTAIRE_C) → cNOMENCLATURE
					      (old :1262-1286) --->
					<cfquery name="qRatioStd" datasource="#datasourcePrimary#">
						SELECT MAX(CN.NIQTE) AS NIQTE
						FROM cNOMENCOP COP
						INNER JOIN cNOMENCLATURE CN ON CN.NISEQ_PERE = COP.CNOMENCLATURE
						WHERE COP.TRANSAC = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#transac#">
						AND COP.INVENTAIRE_P = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#InventaireC#">
						AND CN.INVENTAIRE_M = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#matInvStd#">
					</cfquery>
					<cfset niqteStd = Val(qRatioStd.NIQTE)>

					<cfif niqteStd LTE 0>
						<!--- Missing BOM row → zero the 4 TRANSAC qty columns (old :1237-1244) --->
						<cfquery datasource="#datasourcePrimary#">
							UPDATE TRANSAC
							SET TRQTETRANSAC = 0, TRQTEUNINV = 0, TRQTECMD = 0, TRQTEINV_ESTIME = 0
							WHERE TRSEQ = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#detTrseqStd#">
						</cfquery>
						<cfcontinue>
					</cfif>

					<!--- NouvelleQte = Abs(TotalQte * NIQTE) (old :1291) --->
					<cfset nouvelleQteStd = Abs(TotalQte * niqteStd)>

					<cfstoredproc procedure="Nba_Insert_Det_Trans_Avec_Contenant" datasource="#datasourcePrimary#">
						<cfprocparam type="in" cfsqltype="CF_SQL_INTEGER" value="#detTrseqStd#">
						<cfprocparam type="in" cfsqltype="CF_SQL_INTEGER" value="#matInvStd#">
						<cfprocparam type="in" cfsqltype="CF_SQL_VARCHAR" value="">
						<cfprocparam type="in" cfsqltype="CF_SQL_INTEGER" value="#Val(qDetLinesStd.ENTREPOT)#">
						<cfprocparam type="in" cfsqltype="CF_SQL_FLOAT" value="#nouvelleQteStd#">
						<cfprocparam type="in" cfsqltype="CF_SQL_FLOAT" value="1">
						<cfprocparam type="in" cfsqltype="CF_SQL_INTEGER" value="#Val(qDetLinesStd.CONTENANT)#">
						<cfprocparam type="in" cfsqltype="CF_SQL_VARCHAR" value="#Left(empName, 50)#">
						<cfprocparam type="out" cfsqltype="CF_SQL_INTEGER" variable="spSqlErreurStd">
						<cfprocparam type="out" cfsqltype="CF_SQL_INTEGER" variable="spErrorStd">
						<cfprocparam type="out" cfsqltype="CF_SQL_INTEGER" variable="spDtrseqStd">
					</cfstoredproc>

					<!--- UPDATE TRANSAC 4 qty cols (old :1343-1350) --->
					<cfquery datasource="#datasourcePrimary#">
						UPDATE TRANSAC
						SET TRQTETRANSAC = <cfqueryparam cfsqltype="CF_SQL_FLOAT" value="#nouvelleQteStd#">,
							TRQTEUNINV = <cfqueryparam cfsqltype="CF_SQL_FLOAT" value="#nouvelleQteStd#">,
							TRQTECMD = <cfqueryparam cfsqltype="CF_SQL_FLOAT" value="#nouvelleQteStd#">,
							TRQTEINV_ESTIME = <cfqueryparam cfsqltype="CF_SQL_FLOAT" value="#nouvelleQteStd#">
						WHERE TRSEQ = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#detTrseqStd#">
					</cfquery>
				</cfloop>
			</cfif>
		</cfif>
	</cfif>

	<!--- Query material output rows for display.
	     Mirrors api.cjs Step 7 — includes CONTENANT/CONTENANT_CON_NUMERO so the
	     SKID dropdown can show the currently-selected container per row. --->
	<cfset materials = []>
	<cfif Len(SmNoTransCible) GT 0>
		<cfquery name="qMaterials" datasource="#datasourcePrimary#">
			SELECT DT.DTRSEQ, DT.DTRQTE, DT.CONTENANT, DT.CONTENANT_CON_NUMERO,
				DT.ENTREPOT_ENCODE, DT.ENTREPOT_ENDESC_P, DT.ENTREPOT_ENDESC_S,
				T.INVENTAIRE_INNOINV AS code,
				T.INVENTAIRE_INDESC1 AS description_P, T.INVENTAIRE_INDESC2 AS description_S,
				T.UNITE_INV_UNDESC1 AS unit_P, T.UNITE_INV_UNDESC2 AS unit_S,
				ABS(DETTRANS.DTRQTE_TRANSACTION) AS correctedQty
			FROM DET_TRANS DT
			INNER JOIN TRANSAC T ON DT.TRANSAC = T.TRSEQ
			OUTER APPLY (
				SELECT DT.DTRQTE_INV + ISNULL((
					SELECT SUM(DTCOR.DTRQTE_INV) FROM DET_TRANS DTCOR
					INNER JOIN TRANSAC TR ON TR.TRSEQ = DTCOR.TRANSAC
					WHERE DTCOR.DTRSEQ_PERE = DT.DTRSEQ AND DTCOR.TRANSAC_TRNO_EQUATE = 14
				), 0) AS DTRQTE_TRANSACTION
			) DETTRANS
			WHERE DT.TRANSAC_TRNO = <cfqueryparam cfsqltype="CF_SQL_VARCHAR" maxlength="9" value="#Left(SmNoTransCible, 9)#">
			ORDER BY T.INVENTAIRE_INNOINV
		</cfquery>

		<cfloop query="qMaterials">
			<cfset mat = StructNew("ordered")>
			<cfset mat["id"] = qMaterials.DTRSEQ>
			<cfset mat["code"] = qMaterials.code>
			<cfset mat["description_P"] = qMaterials.description_P>
			<cfset mat["description_S"] = qMaterials.description_S>
			<cfset mat["unit_P"] = qMaterials.unit_P>
			<cfset mat["unit_S"] = qMaterials.unit_S>
			<cfset mat["originalQty"] = Val(qMaterials.DTRQTE)>
			<cfif Len(qMaterials.correctedQty)>
				<cfset mat["correctedQty"] = Val(qMaterials.correctedQty)>
			<cfelse>
				<cfset mat["correctedQty"] = Val(qMaterials.DTRQTE)>
			</cfif>
			<cfset mat["warehouse"] = qMaterials.ENTREPOT_ENCODE>
			<cfset mat["warehouse_P"] = qMaterials.ENTREPOT_ENDESC_P>
			<cfset mat["warehouse_S"] = qMaterials.ENTREPOT_ENDESC_S>
			<cfset mat["container"] = qMaterials.CONTENANT_CON_NUMERO>
			<cfset mat["conSeq"] = Val(qMaterials.CONTENANT)>
			<cfset ArrayAppend(materials, mat)>
		</cfloop>
	</cfif>

	<!--- Container options for SKID dropdown (SortieMateriel.cfc:553-605).
	     VCUT path: VSP_BonTravail_VeneerReserve on EXT datasource (with remainingQty for distribution).
	     Fallback: DET_TRANS containers for the SM transaction. --->
	<cfif Len(SmNoTransCible) GT 0>
		<cftry>
			<cfquery name="qVcutContainers" datasource="#datasourceExt#">
				SELECT DISTINCT v.CONTENANT_CON_NUMERO AS conNumero, c.CON_SEQ AS conSeq,
					v.DTRQTE AS remainingQty, v.ENTREPOT
				FROM VSP_BonTravail_VeneerReserve v
				LEFT OUTER JOIN #dbPrimary#.dbo.CONTENANT c ON v.CONTENANT_CON_NUMERO = c.CON_NUMERO
				WHERE v.TRANSAC = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#transac#">
				ORDER BY c.CON_SEQ ASC
			</cfquery>

			<cfloop query="qVcutContainers">
				<cfif Val(qVcutContainers.conSeq) NEQ 0>
					<cfset opt = StructNew("ordered")>
					<cfset opt["conSeq"] = Val(qVcutContainers.conSeq)>
					<cfset opt["conNumero"] = qVcutContainers.conNumero>
					<cfset opt["remainingQty"] = Val(qVcutContainers.remainingQty)>
					<cfset opt["entrepot"] = Val(qVcutContainers.ENTREPOT)>
					<cfset ArrayAppend(containerOptions, opt)>
				</cfif>
			</cfloop>

			<cfcatch type="any">
				<!--- If EXT view fails, fall through to DET_TRANS fallback below --->
			</cfcatch>
		</cftry>

		<!--- Fallback when no VCUT container options resolved --->
		<cfif ArrayLen(containerOptions) EQ 0>
			<cftry>
				<cfquery name="qFallbackContainers" datasource="#datasourcePrimary#">
					SELECT DISTINCT DT.CONTENANT AS conSeq, DT.CONTENANT_CON_NUMERO AS conNumero,
						DT.DTRQTE AS remainingQty, DT.ENTREPOT
					FROM DET_TRANS DT
					WHERE DT.TRANSAC_TRNO = <cfqueryparam cfsqltype="CF_SQL_VARCHAR" maxlength="9" value="#Left(SmNoTransCible, 9)#">
						AND DT.CONTENANT IS NOT NULL AND DT.CONTENANT <> 0
				</cfquery>
				<cfloop query="qFallbackContainers">
					<cfset opt = StructNew("ordered")>
					<cfset opt["conSeq"] = Val(qFallbackContainers.conSeq)>
					<cfset opt["conNumero"] = qFallbackContainers.conNumero>
					<cfset opt["remainingQty"] = Val(qFallbackContainers.remainingQty)>
					<cfset opt["entrepot"] = Val(qFallbackContainers.ENTREPOT)>
					<cfset ArrayAppend(containerOptions, opt)>
				</cfloop>
				<cfcatch type="any"></cfcatch>
			</cftry>
		</cfif>
	</cfif>

	<!--- Build response --->
	<cfset data = StructNew("ordered")>
	<cfset data["smnotrans"] = SmNoTransCible>
	<cfset data["smseq"] = smseqResult>
	<cfset data["materials"] = materials>
	<cfset data["containerOptions"] = containerOptions>
	<cfif Len(materialWarning) GT 0>
		<cfset data["materialWarning"] = materialWarning>
	<cfelse>
		<cfset data["materialWarning"] = "">
	</cfif>

	<cfset response["success"] = true>
	<cfset response["data"] = data>

	<cfcatch type="any">
		<cfset response = StructNew()>
		<cfset response["success"] = false>
		<cfset response["data"] = StructNew()>
		<cfset response["error"] = cfcatch.message & " " & cfcatch.detail>
	</cfcatch>
</cftry>

<cfoutput>#SerializeJSON(response)#</cfoutput>
</cfsilent>
