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
	<cfelse>
		<cfset datasourcePrimary = "TS_SEATPL">
	</cfif>

	<!--- Read JSON body --->
	<cfset requestBody = DeserializeJSON(GetHttpRequestData().content)>

	<!--- Extract fields --->
	<cfset theTJSEQ = Val(requestBody["tjseq"])>
	<cfset theEmployeeCode = requestBody["employeeCode"]>
	<cfset theOperation = Val(requestBody["operation"])>
	<cfset theMachine = Val(requestBody["machine"])>
	<cfset theStartDate = requestBody["startDate"]>
	<cfset theEndDate = requestBody["endDate"]>
	<cfset theGoodQty = Val(requestBody["goodQty"])>
	<cfset theEmployeeName = Left(requestBody["employeeName"], 30)>

	<!--- Optional arrays --->
	<cfset theDefects = []>
	<cfif StructKeyExists(requestBody, "defects")>
		<cfset theDefects = requestBody["defects"]>
	</cfif>
	<cfset theFinishedProducts = []>
	<cfif StructKeyExists(requestBody, "finishedProducts")>
		<cfset theFinishedProducts = requestBody["finishedProducts"]>
	</cfif>
	<cfset theMaterials = []>
	<cfif StructKeyExists(requestBody, "materials")>
		<cfset theMaterials = requestBody["materials"]>
	</cfif>

	<cfset ResultatTout = "">

	<!--- ============================================================
	      STEP 1: Load current TEMPSPROD row
	      Exact replica of CorrectionInventaire.cfc lines 208-212
	      ============================================================ --->
	<cfquery name="CeTEMPSPROD" datasource="#datasourcePrimary#">
		SELECT *
		FROM TEMPSPROD
		WHERE TJSEQ = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#theTJSEQ#">
	</cfquery>

	<!--- ============================================================
	      STEP 2: Compute totals for TRANSAC+cNOMENCOP where MODEPROD=1
	      Exact replica of CorrectionInventaire.cfc lines 213-219
	      ============================================================ --->
	<cfquery name="trouveTEMPSPROD" datasource="#datasourcePrimary#">
		SELECT SUM(TJQTEPROD) AS TotalPROD, SUM(TJQTEDEFECT) AS TotalDEFECT
		FROM TEMPSPROD
		WHERE TRANSAC = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#Val(CeTEMPSPROD.TRANSAC)#">
		AND cNomencOp = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#Val(CeTEMPSPROD.cNOMENCOP)#">
		AND MODEPROD = 1
	</cfquery>

	<cfset LeTJQTEPROD = Val(trouveTEMPSPROD.TotalPROD)>
	<cfset LeTJQTEDEFECT = Val(trouveTEMPSPROD.TotalDEFECT)>
	<cfset LaQteBonProduit = 0>
	<cfset LaQteDefectueux = 0>

	<!--- ============================================================
	      STEP 3: PROD mode — handle EPF, defects, SM
	      ============================================================ --->
	<cfif CeTEMPSPROD.MODEPROD_MPCODE EQ "PROD">

		<!--- 3a. Finished Products (EPF) correction
		      Exact replica of CorrectionInventaire.cfc lines 227-280 --->
		<cfquery name="trouveProduitsFinis" datasource="#datasourcePrimary#">
			SELECT DT.DTRSEQ, DT.DTRQTE
			FROM DET_TRANS DT
			INNER JOIN TRANSAC T ON DT.TRANSAC = T.TRSEQ
			INNER JOIN TEMPSPROD TP ON T.TRNO = TP.ENTRERPRODFINI_PFNOTRANS
			WHERE TP.TJSEQ = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#theTJSEQ#">
		</cfquery>

		<cfif trouveProduitsFinis.RecordCount EQ 0>
			<!--- No finished products — use goodQty directly --->
			<cfset LaQteBonProduit = theGoodQty>
		<cfelse>
			<!--- Sum EPF quantities and correct changed ones --->
			<cfset LaQteBonProduit = 0>
			<cfloop array="#theFinishedProducts#" index="fpItem">
				<cfset fpDTRSEQ = Val(fpItem["dtrseq"])>
				<cfset fpNewQty = Val(fpItem["qty"])>
				<cfset LaQteBonProduit = LaQteBonProduit + fpNewQty>

				<!--- Find original qty --->
				<cfset fpOrigQty = 0>
				<cfloop query="trouveProduitsFinis">
					<cfif Val(trouveProduitsFinis.DTRSEQ) EQ fpDTRSEQ>
						<cfset fpOrigQty = Val(trouveProduitsFinis.DTRQTE)>
					</cfif>
				</cfloop>

				<!--- Only call SP if qty changed --->
				<cfif fpNewQty NEQ fpOrigQty>
					<cfstoredproc procedure="Nba_Corrige_Quantite_Transaction" datasource="#datasourcePrimary#">
						<cfprocparam cfsqltype="CF_SQL_INTEGER" value="#fpDTRSEQ#">
						<cfprocparam cfsqltype="CF_SQL_FLOAT" value="#fpNewQty#">
						<cfprocparam cfsqltype="CF_SQL_VARCHAR" value="#theEmployeeName#" maxlength="30">
					</cfstoredproc>
				</cfif>
			</cfloop>
		</cfif>

		<!--- 3b. Defects — INSERT new / UPDATE existing in DET_DEFECT
		      Exact replica of QteDefect.cfc:AjouteModifieDetailDEFECT lines 645-741 --->

		<!--- Get cost info for defect valuation --->
		<cfquery name="trouveTempsProdCost" datasource="#datasourcePrimary#">
			SELECT T.TRSEQ, T.INVENTAIRE, TP.TJQTEPROD, TP.EMPLOYE, TP.MACHINE, TP.INVENTAIRE_C,
				TP.TJEMCOUT + TP.TJOPCOUT + TP.TJMACOUT AS CoutOperation
			FROM TEMPSPROD TP
			INNER JOIN TRANSAC T ON TP.TRANSAC = T.TRSEQ
			WHERE TP.TJSEQ = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#theTJSEQ#">
		</cfquery>
		<cfquery name="trouveCoutMatiere" datasource="#datasourcePrimary#">
			SELECT SUM(0 - TRCOUTTRANS) AS LeCoutMatiere
			FROM TRANSAC
			WHERE TRSEQ = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#Val(CeTEMPSPROD.TRANSAC)#">
		</cfquery>
		<cfset LaValeurEstimeeTotale = Val(trouveTempsProdCost.CoutOperation) + Val(trouveCoutMatiere.LeCoutMatiere)>
		<cfif Val(trouveTempsProdCost.TJQTEPROD) NEQ 0>
			<cfset LaValeurEstimeeUnitaire = LaValeurEstimeeTotale / trouveTempsProdCost.TJQTEPROD>
		<cfelse>
			<cfset LaValeurEstimeeUnitaire = 0>
		</cfif>

		<cfloop array="#theDefects#" index="defItem">
			<cfset defDDSEQ = 0>
			<cfif StructKeyExists(defItem, "ddseq")>
				<cfset defDDSEQ = Val(defItem["ddseq"])>
			</cfif>
			<cfset defQty = Val(defItem["qty"])>
			<cfset defReasonId = Val(defItem["reasonId"])>
			<cfset defNote = "">
			<cfif StructKeyExists(defItem, "note")>
				<cfset defNote = Left(defItem["note"], 1000)>
			</cfif>

			<cfif defDDSEQ EQ 0>
				<!--- New defect — INSERT into DET_DEFECT --->
				<cfif defQty NEQ 0>
					<cfquery datasource="#datasourcePrimary#">
						INSERT INTO DET_DEFECT (TRANSAC, INVENTAIRE, MACHINE, EMPLOYE, DDQTEUNINV, DDDATE, RAISON, DDNOTE,
							DDVALEUR_ESTIME_UNITAIRE, DDVALEUR_ESTIME_TOTALE, TEMPSPROD, TRANSAC_PERE)
						VALUES (
							<cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#Val(CeTEMPSPROD.TRANSAC)#">,
							<cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#Val(trouveTempsProdCost.INVENTAIRE)#">,
							<cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#Val(trouveTempsProdCost.MACHINE)#">,
							<cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#Val(trouveTempsProdCost.EMPLOYE)#">,
							<cfqueryparam cfsqltype="CF_SQL_FLOAT" value="#defQty#">,
							<cfqueryparam cfsqltype="CF_SQL_TIMESTAMP" value="#CreateODBCDateTime(Now())#">,
							<cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#defReasonId#">,
							<cfqueryparam cfsqltype="CF_SQL_VARCHAR" maxlength="1000" value="#defNote#">,
							<cfqueryparam cfsqltype="CF_SQL_FLOAT" value="#Val(LaValeurEstimeeUnitaire)#">,
							<cfqueryparam cfsqltype="CF_SQL_FLOAT" value="#Val(LaValeurEstimeeTotale)#">,
							<cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#theTJSEQ#">,
							<cfqueryparam cfsqltype="CF_SQL_INTEGER" value="0">
						)
					</cfquery>
				</cfif>
			<cfelse>
				<!--- Existing defect — UPDATE DET_DEFECT --->
				<cfquery datasource="#datasourcePrimary#">
					UPDATE DET_DEFECT
					SET DDQTEUNINV = <cfqueryparam cfsqltype="CF_SQL_FLOAT" value="#defQty#">,
						RAISON = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#defReasonId#">,
						DDNOTE = <cfqueryparam cfsqltype="CF_SQL_VARCHAR" maxlength="1000" value="#defNote#">,
						DDDATE = <cfqueryparam cfsqltype="CF_SQL_TIMESTAMP" value="#CreateODBCDateTime(Now())#">,
						DDVALEUR_ESTIME_UNITAIRE = <cfqueryparam cfsqltype="CF_SQL_FLOAT" value="#Val(LaValeurEstimeeUnitaire)#">,
						DDVALEUR_ESTIME_TOTALE = <cfqueryparam cfsqltype="CF_SQL_FLOAT" value="#Val(LaValeurEstimeeTotale)#">
					WHERE DDSEQ = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#defDDSEQ#">
				</cfquery>
			</cfif>
		</cfloop>

		<!--- 3c. Recalculate total defects and update TEMPSPROD.TJQTEDEFECT
		      Exact replica of QteDefect.cfc lines 729-738 --->
		<cfquery name="trouveTotal" datasource="#datasourcePrimary#">
			SELECT SUM(DDQTEUNINV) AS Total
			FROM DET_DEFECT
			WHERE TEMPSPROD = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#theTJSEQ#">
		</cfquery>
		<cfset LaQteDefectueux = Val(trouveTotal.Total)>
		<cfquery datasource="#datasourcePrimary#">
			UPDATE TEMPSPROD
			SET TJQTEDEFECT = <cfqueryparam cfsqltype="CF_SQL_FLOAT" value="#LaQteDefectueux#">
			WHERE TJSEQ = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#theTJSEQ#">
		</cfquery>

		<!--- Recompute LeTJQTEDEFECT for cNOMENCOP scrap update --->
		<cfquery name="trouveTotalDefAll" datasource="#datasourcePrimary#">
			SELECT SUM(TJQTEDEFECT) AS TotalDEFECT
			FROM TEMPSPROD
			WHERE TRANSAC = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#Val(CeTEMPSPROD.TRANSAC)#">
			AND cNomencOp = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#Val(CeTEMPSPROD.cNOMENCOP)#">
			AND MODEPROD = 1
		</cfquery>
		<cfset LeTJQTEDEFECT = Val(trouveTotalDefAll.TotalDEFECT)>

		<!--- 3d. UPDATE cNOMENCOP scrap quantities
		      Exact replica of CorrectionInventaire.cfc lines 283-287 --->
		<cfquery datasource="#datasourcePrimary#">
			UPDATE cNOMENCOP
			SET NOPQTESCRAP = <cfqueryparam cfsqltype="CF_SQL_FLOAT" value="#LeTJQTEDEFECT#">
			WHERE NOPSEQ = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#Val(CeTEMPSPROD.cNOMENCOP)#">
		</cfquery>

		<!--- 3e. Material output (SM) corrections
		      Exact replica of CorrectionInventaire.cfc lines 291-342 --->
		<cfquery name="trouveSortiesMateriel" datasource="#datasourcePrimary#">
			SELECT DT.DTRSEQ, DT.DTRQTE
			FROM TEMPSPROD TP
			INNER JOIN DET_TRANS DT ON DT.TRANSAC_TRNO = TP.SMNOTRANS
			INNER JOIN TRANSAC T ON DT.TRANSAC = T.TRSEQ
			WHERE TP.TJSEQ = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#theTJSEQ#">
		</cfquery>

		<cfloop array="#theMaterials#" index="smItem">
			<cfset smDTRSEQ = Val(smItem["dtrseq"])>
			<cfset smNewQty = Val(smItem["qty"])>

			<!--- Find original qty --->
			<cfset smOrigQty = 0>
			<cfloop query="trouveSortiesMateriel">
				<cfif Val(trouveSortiesMateriel.DTRSEQ) EQ smDTRSEQ>
					<cfset smOrigQty = Val(trouveSortiesMateriel.DTRQTE)>
				</cfif>
			</cfloop>

			<!--- Only call SP if qty changed --->
			<cfif smNewQty NEQ smOrigQty>
				<cfstoredproc procedure="Nba_Corrige_Quantite_Transaction" datasource="#datasourcePrimary#">
					<cfprocparam cfsqltype="CF_SQL_INTEGER" value="#smDTRSEQ#">
					<cfprocparam cfsqltype="CF_SQL_FLOAT" value="#smNewQty#">
					<cfprocparam cfsqltype="CF_SQL_VARCHAR" value="#theEmployeeName#" maxlength="30">
				</cfstoredproc>
			</cfif>
		</cfloop>

	</cfif><!--- end PROD mode --->

	<!--- ============================================================
	      STEP 4: Lookup employee EMSEQ from employee code
	      Exact replica of CorrectionInventaire.cfc lines 353-357
	      ============================================================ --->
	<cfquery name="trouveEmploye" datasource="#datasourcePrimary#">
		SELECT em.EMSEQ, em.EMNO, em.EMNOM, em.EMTAUXHOR
		FROM EMPLOYE em
		WHERE em.EMNO = <cfqueryparam cfsqltype="CF_SQL_VARCHAR" maxlength="5" value="#Left(theEmployeeCode, 5)#">
	</cfquery>

	<!--- ============================================================
	      STEP 5: Call Nba_Sp_Update_Production for current TJSEQ
	      Exact replica of CorrectionInventaire.cfc lines 344-387
	      Parse ISO datetime format to SQL date/time parts
	      ============================================================ --->
	<cfset sIsoDebut = theStartDate>
	<cfset sSqlDebut = Replace(sIsoDebut, "T", " ", "one") & ":00">
	<cfset dtDebut = ParseDateTime(sSqlDebut)>
	<cfset DateDebutSP = DateFormat(dtDebut, "yyyy-mm-dd")>
	<cfset HeureDebutSP = TimeFormat(dtDebut, "HH:nn:ss")>

	<cfset sIsoFin = theEndDate>
	<cfset DateFinSP = "">
	<cfset HeureFinSP = "">
	<cfif Len(Trim(sIsoFin)) GT 0>
		<cfset sSqlFin = Replace(sIsoFin, "T", " ", "one") & ":00">
		<cfset dtFin = ParseDateTime(sSqlFin)>
		<cfset DateFinSP = DateFormat(dtFin, "yyyy-mm-dd")>
		<cfset HeureFinSP = TimeFormat(dtFin, "HH:nn:ss")>
	</cfif>

	<!--- Call Nba_Sp_Update_Production with 20 parameters
	      Exact parameter order from CorrectionInventaire.cfc line 364 --->
	<cfstoredproc procedure="Nba_Sp_Update_Production" datasource="#datasourcePrimary#">
		<cfprocparam cfsqltype="CF_SQL_INTEGER" value="#theTJSEQ#">
		<cfprocparam cfsqltype="CF_SQL_INTEGER" value="#Val(trouveEmploye.EMSEQ)#">
		<cfprocparam cfsqltype="CF_SQL_INTEGER" value="#theOperation#">
		<cfprocparam cfsqltype="CF_SQL_INTEGER" value="#theMachine#">
		<cfprocparam cfsqltype="CF_SQL_INTEGER" value="#Val(CeTEMPSPROD.TRANSAC)#">
		<cfprocparam cfsqltype="CF_SQL_VARCHAR" value="" maxlength="20">
		<cfprocparam cfsqltype="CF_SQL_VARCHAR" value="" maxlength="20">
		<cfprocparam cfsqltype="CF_SQL_INTEGER" value="#Val(CeTEMPSPROD.CNOMENCLATURE)#">
		<cfprocparam cfsqltype="CF_SQL_INTEGER" value="#Val(CeTEMPSPROD.INVENTAIRE_C)#">
		<cfprocparam cfsqltype="CF_SQL_BIT" value="1">
		<cfprocparam cfsqltype="CF_SQL_BIT" value="0">
		<cfprocparam cfsqltype="CF_SQL_FLOAT" value="#Val(LaQteBonProduit)#">
		<cfprocparam cfsqltype="CF_SQL_FLOAT" value="#Val(LaQteDefectueux)#">
		<cfprocparam cfsqltype="CF_SQL_VARCHAR" value="#DateDebutSP#" maxlength="10">
		<cfprocparam cfsqltype="CF_SQL_VARCHAR" value="#HeureDebutSP#" maxlength="8">
		<cfprocparam cfsqltype="CF_SQL_VARCHAR" value="#DateFinSP#" maxlength="10">
		<cfprocparam cfsqltype="CF_SQL_VARCHAR" value="#HeureFinSP#" maxlength="8">
		<cfprocparam cfsqltype="CF_SQL_VARCHAR" value="#Left(CeTEMPSPROD.MODEPROD_MPCODE, 5)#" maxlength="5">
		<cfprocparam cfsqltype="CF_SQL_VARCHAR" value="Correction temps prod avec Ecran de production" maxlength="7500">
		<cfprocparam cfsqltype="CF_SQL_VARCHAR" value="#Left(CeTEMPSPROD.SMNOTRANS, 9)#" maxlength="9">
	</cfstoredproc>

	<!--- ============================================================
	      STEP 6: If PROD mode — recalculate costs and product quantities
	      Exact replica of CorrectionInventaire.cfc lines 391-422
	      ============================================================ --->
	<cfif CeTEMPSPROD.MODEPROD_MPCODE EQ "PROD">
		<!--- 6a. Recalculate costs via FctCalculTempsDeProduction --->
		<cfquery datasource="#datasourcePrimary#">
			UPDATE TEMPSPROD SET
				TJSYSTEMPSHOMME = ISNULL(COUTS_TEMPSPROD.CALCSYSTEMPSHOMME, 0),
				TJTEMPSHOMME    = ISNULL(COUTS_TEMPSPROD.CALCTEMPSHOMME, 0),
				TJEMCOUT        = ISNULL(COUTS_TEMPSPROD.CALCEMCOUT, 0),
				TJOPCOUT        = ISNULL(COUTS_TEMPSPROD.CALCOPCOUT, 0),
				TJMACOUT        = ISNULL(COUTS_TEMPSPROD.CALCMACOUT, 0)
			FROM TEMPSPROD
			INNER JOIN dbo.FctCalculTempsDeProduction(<cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#theTJSEQ#">) COUTS_TEMPSPROD
				ON (COUTS_TEMPSPROD.TJSEQ = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#theTJSEQ#">)
			WHERE TEMPSPROD.TJSEQ = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#theTJSEQ#">
		</cfquery>

		<!--- 6b. Recalculate product in-progress quantities --->
		<cfstoredproc procedure="Nba_Recalcul_Un_Produit_EnCours" datasource="#datasourcePrimary#">
			<cfprocparam cfsqltype="CF_SQL_INTEGER" value="#Val(CeTEMPSPROD.TRANSAC)#">
			<cfprocparam cfsqltype="CF_SQL_INTEGER" value="0">
		</cfstoredproc>
	</cfif>

	<!--- ============================================================
	      STEP 7: Adjust next status row start time
	      Exact replica of CorrectionInventaire.cfc lines 424-469
	      ============================================================ --->
	<cfquery name="trouveProchainStatut" datasource="#datasourcePrimary#">
		SELECT TOP 1 TJSEQ, MACHINE, TRANSAC, OPERATION, EMPLOYE, MODEPROD,
			MODEPROD_MPCODE, TJDEBUTDATE, TJFINDATE, TJQTEPROD, TJQTEDEFECT,
			TJNOTE, TRANSAC_TRNO, TRANSAC_TRITEM, INVENTAIRE_INDESC1,
			INVENTAIRE_INDESC2, INVENTAIRE_INDESC3, INVENTAIRE_C, CNOMENCLATURE,
			CNOMENCOP, cNomencOp_Machine, SMNOTRANS, ENTRERPRODFINI_PFNOTRANS
		FROM TEMPSPROD
		WHERE TRANSAC = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#Val(CeTEMPSPROD.TRANSAC)#">
		AND CNOMENCOP = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#Val(CeTEMPSPROD.CNOMENCOP)#">
		AND TJSEQ > <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#theTJSEQ#">
	</cfquery>

	<cfif trouveProchainStatut.RecordCount GT 0>
		<!--- Next row start = current row end --->
		<cfset NextDateDebutSP = DateFinSP>
		<cfset NextHeureDebutSP = HeureFinSP>

		<!--- Next row end = its own existing end (if valid) --->
		<cfset NextDateFinSP = "">
		<cfset NextHeureFinSP = "">
		<cfif IsDate(trouveProchainStatut.TJFINDATE)>
			<cfset NextDateFinSP = DateFormat(trouveProchainStatut.TJFINDATE, "yyyy-mm-dd")>
			<cfset NextHeureFinSP = TimeFormat(trouveProchainStatut.TJFINDATE, "HH:nn:ss")>
		</cfif>

		<cfstoredproc procedure="Nba_Sp_Update_Production" datasource="#datasourcePrimary#">
			<cfprocparam cfsqltype="CF_SQL_INTEGER" value="#Val(trouveProchainStatut.TJSEQ)#">
			<cfprocparam cfsqltype="CF_SQL_INTEGER" value="#Val(trouveProchainStatut.EMPLOYE)#">
			<cfprocparam cfsqltype="CF_SQL_INTEGER" value="#Val(trouveProchainStatut.OPERATION)#">
			<cfprocparam cfsqltype="CF_SQL_INTEGER" value="#Val(trouveProchainStatut.MACHINE)#">
			<cfprocparam cfsqltype="CF_SQL_INTEGER" value="#Val(trouveProchainStatut.TRANSAC)#">
			<cfprocparam cfsqltype="CF_SQL_VARCHAR" value="" maxlength="20">
			<cfprocparam cfsqltype="CF_SQL_VARCHAR" value="" maxlength="20">
			<cfprocparam cfsqltype="CF_SQL_INTEGER" value="#Val(trouveProchainStatut.CNOMENCLATURE)#">
			<cfprocparam cfsqltype="CF_SQL_INTEGER" value="#Val(CeTEMPSPROD.INVENTAIRE_C)#">
			<cfprocparam cfsqltype="CF_SQL_BIT" value="1">
			<cfprocparam cfsqltype="CF_SQL_BIT" value="0">
			<cfprocparam cfsqltype="CF_SQL_FLOAT" value="#Val(trouveProchainStatut.TJQTEPROD)#">
			<cfprocparam cfsqltype="CF_SQL_FLOAT" value="#Val(trouveProchainStatut.TJQTEDEFECT)#">
			<cfprocparam cfsqltype="CF_SQL_VARCHAR" value="#NextDateDebutSP#" maxlength="10">
			<cfprocparam cfsqltype="CF_SQL_VARCHAR" value="#NextHeureDebutSP#" maxlength="8">
			<cfprocparam cfsqltype="CF_SQL_VARCHAR" value="#NextDateFinSP#" maxlength="10">
			<cfprocparam cfsqltype="CF_SQL_VARCHAR" value="#NextHeureFinSP#" maxlength="8">
			<cfprocparam cfsqltype="CF_SQL_VARCHAR" value="#Left(trouveProchainStatut.MODEPROD_MPCODE, 5)#" maxlength="5">
			<cfprocparam cfsqltype="CF_SQL_VARCHAR" value="Correction temps prod avec Ecran de production" maxlength="7500">
			<cfprocparam cfsqltype="CF_SQL_VARCHAR" value="#Left(trouveProchainStatut.SMNOTRANS, 9)#" maxlength="9">
		</cfstoredproc>
	</cfif>

	<!--- Success response --->
	<cfset response["success"] = true>
	<cfset response["data"] = StructNew()>
	<cfset response["data"]["TJSEQ"] = theTJSEQ>
	<cfset response["message"] = "Correction saved successfully">

	<cfcatch type="any">
		<cfset response = StructNew()>
		<cfset response["success"] = false>
		<cfset response["data"] = StructNew()>
		<cfset response["error"] = cfcatch.message & " " & cfcatch.detail>
	</cfcatch>
</cftry>

<cfoutput>#SerializeJSON(response)#</cfoutput>
</cfsilent>
