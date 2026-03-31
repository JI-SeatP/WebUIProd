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

	<!--- Parse JSON body --->
	<cfset requestBody = DeserializeJSON(GetHttpRequestData().content)>
	<cfset transac = Val(requestBody["transac"])>
	<cfset copmachine = Val(requestBody["copmachine"])>
	<cfset nopseq = Val(requestBody["nopseq"])><!--- Component's NOPSEQ --->
	<cfset mainNopseq = Val(requestBody["mainNopseq"])><!--- Main operation NOPSEQ --->
	<cfset qty = Val(requestBody["qty"])>
	<cfset defectQty = Val(requestBody["defectQty"])>
	<cfset container = "">
	<cfif StructKeyExists(requestBody, "container")>
		<cfset container = Trim(requestBody["container"])>
	</cfif>
	<cfset inventaireP = Val(requestBody["inventaireP"])><!--- Component INVENTAIRE_M = parent inventory --->
	<cfset niseq = Val(requestBody["niseq"])><!--- Component NISEQ from CNOMENCLATURE --->
	<cfset employeeSeq = Val(requestBody["employeeSeq"])>

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

	<!--- 1. Load operation from vEcransProduction (replicates trouveUneOperation) --->
	<cfquery name="qOperation" datasource="#datasourceExt#">
		SELECT TOP 1 v.OPERATION_SEQ, v.MACHINE, v.INVENTAIRE_SEQ, v.CNOMENCLATURE,
			v.NOPSEQ, v.COPMACHINE, v.NO_INVENTAIRE, v.PRODUIT_CODE
		FROM vEcransProduction v
		WHERE v.TRANSAC = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#transac#">
		<cfif copmachine NEQ 0>
			AND v.COPMACHINE = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#copmachine#">
		</cfif>
		AND v.OPERATION <> 'FINSH'
	</cfquery>

	<!--- 2. Query component NOPSEQ from VOperationParTransac + cNOMENCOP
	      (ProduitFini.cfc:1350-1372, VCUT filter: OPERATION = 1) --->
	<cfquery name="trouveNOPSEQ" datasource="#datasourcePrimary#">
		SELECT TOP 1 v.NISEQ, v.OPERATION, v.MACHINE, v.NISTR_NIVEAU, c.NOPSEQ,
			v.INVENTAIRE, v.INVENTAIRE_INNOINV, v.EntrePF, v.UtiliseInventaire,
			c.INVENTAIRE_P, c.CNOMENCLATURE AS CNOMENCLATURE_SEQ
		FROM VOperationParTransac v
		INNER JOIN cNOMENCOP c ON c.NOPSEQ = v.NOPSEQ
		WHERE v.TRANSAC = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#transac#">
		AND c.INVENTAIRE_P = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#inventaireP#">
		AND v.OPERATION = 1
		ORDER BY c.NOPSEQ DESC
	</cfquery>

	<!--- 3. Query TRANSAC data (ProduitFini.cfc:1373-1380) --->
	<cfquery name="trouveTRANSAC" datasource="#datasourcePrimary#">
		SELECT DISTINCT cn.INVENTAIRE_P, cn.INVENTAIRE_P_INNOINV,
			t.INVENTAIRE, t.TRITEM, t.FSC, t.ENTREPOT, t.TRNOORIGINE, t.TRNO
		FROM cNOMENCLATURE cn
		INNER JOIN TRANSAC t ON cn.TRANSAC = t.TRSEQ
		WHERE cn.TRANSAC = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#transac#">
		AND cn.INVENTAIRE_P = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#inventaireP#">
	</cfquery>

	<cfset LeTJSEQEPF = 0>
	<cfset LaQteAjoutee = qty>
	<cfset tjNote = "Ecran de production pour Temps prod: Insertion">
	<cfset Machine_Seq = Val(qOperation.MACHINE)>
	<cfset dbNopseq = Val(trouveNOPSEQ.NOPSEQ)>

	<!--- 4. Cross-NOPSEQ check (ProduitFini.cfc:1383-1435) --->
	<!--- If the component's DB NOPSEQ differs from mainNopseq, create new TEMPSPROD row --->
	<cfif dbNopseq NEQ mainNopseq>
		<!--- Get MODEPROD for 'Prod' --->
		<cfquery name="qProdMp" datasource="#datasourcePrimary#">
			SELECT MPSEQ FROM MODEPROD WHERE MPCODE = 'Prod'
		</cfquery>

		<!--- Create new TEMPSPROD via Nba_Sp_Insert_Production (same pattern as changeStatus.cfm) --->
		<cfstoredproc procedure="Nba_Sp_Insert_Production" datasource="#datasourcePrimary#">
			<cfprocparam type="in" cfsqltype="CF_SQL_INTEGER" value="#employeeSeq#">
			<cfprocparam type="in" cfsqltype="CF_SQL_FLOAT" value="0">
			<cfprocparam type="in" cfsqltype="CF_SQL_INTEGER" value="#Val(trouveNOPSEQ.OPERATION)#">
			<cfprocparam type="in" cfsqltype="CF_SQL_FLOAT" value="0">
			<cfprocparam type="in" cfsqltype="CF_SQL_INTEGER" value="#Machine_Seq#">
			<cfprocparam type="in" cfsqltype="CF_SQL_FLOAT" value="0">
			<cfprocparam type="in" cfsqltype="CF_SQL_INTEGER" value="#transac#">
			<cfprocparam type="in" cfsqltype="CF_SQL_INTEGER" value="0">
			<cfprocparam type="in" cfsqltype="CF_SQL_VARCHAR" value="">
			<cfprocparam type="in" cfsqltype="CF_SQL_INTEGER" value="#Val(trouveNOPSEQ.NISEQ)#">
			<cfprocparam type="in" cfsqltype="CF_SQL_INTEGER" value="#inventaireP#">
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
			<cfprocparam type="in" cfsqltype="CF_SQL_INTEGER" value="#copmachine#">
			<cfprocparam type="out" cfsqltype="CF_SQL_INTEGER" variable="LeTJSEQEPF">
			<cfprocparam type="out" cfsqltype="CF_SQL_INTEGER" variable="spErreur">
		</cfstoredproc>

		<!--- Update the new TEMPSPROD row (ProduitFini.cfc:1424-1433)
		      CRITICAL (I10a): CNOMENCOP must be set to mainNopseq (arguments.NOPSEQ),
		      NOT the component's dbNopseq. This ensures ajouteSM's qTJSEQPROD query finds
		      this fresh row instead of an older row with SMNOTRANS. --->
		<cfquery datasource="#datasourcePrimary#">
			UPDATE TEMPSPROD
			SET TJQTEPROD = <cfqueryparam cfsqltype="CF_SQL_FLOAT" value="#LaQteAjoutee#">,
				CNOMENCOP = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#mainNopseq#">,
				INVENTAIRE_C = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#inventaireP#">
				<cfif niseq NEQ 0>
					, cNOMENCLATURE = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#niseq#">
				</cfif>
			WHERE TJSEQ = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#Val(LeTJSEQEPF)#">
		</cfquery>
	<cfelse>
		<!--- Same-NOPSEQ: find existing PROD TEMPSPROD row (ProduitFini.cfc:1436-1450) --->
		<cfquery name="qExistingTP" datasource="#datasourcePrimary#">
			SELECT TOP 1 TJSEQ, TJQTEPROD, TJQTEDEFECT, SMNOTRANS, cNOMENCOP
			FROM TEMPSPROD
			WHERE TRANSAC = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#transac#">
			<cfif copmachine NEQ 0>
				AND cNomencOp_Machine = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#copmachine#">
			</cfif>
			AND cNOMENCOP = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#dbNopseq#">
			AND MODEPROD = 1
			AND TJNOTE LIKE 'Ecran de production pour Temps prod%'
			ORDER BY TJSEQ DESC
		</cfquery>

		<cfif qExistingTP.RecordCount GT 0>
			<cfset LeTJSEQEPF = Val(qExistingTP.TJSEQ)>
			<!--- Overwrite qty on existing row (ProduitFini.cfc:1505-1512).
			      Old software sets TJQTEPROD = arguments.Qte (current entry only, not accumulated).
			      Do NOT clear SMNOTRANS — within a session, SM is reused on 2nd "+" click.
			      Fresh Prod rows from changeStatus naturally have empty SMNOTRANS. --->
			<cfset LaQteAjoutee = qty>
			<cfquery datasource="#datasourcePrimary#">
				UPDATE TEMPSPROD
				SET TJQTEPROD = <cfqueryparam cfsqltype="CF_SQL_FLOAT" value="#LaQteAjoutee#">,
					INVENTAIRE_C = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#inventaireP#">
					<cfif niseq NEQ 0>
						, cNOMENCLATURE = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#niseq#">
					</cfif>
				WHERE TJSEQ = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#LeTJSEQEPF#">
			</cfquery>
		<cfelse>
			<cfset response["success"] = false>
			<cfset response["error"] = "No existing PROD TEMPSPROD row found for NOPSEQ=#dbNopseq#">
			<cfoutput>#SerializeJSON(response)#</cfoutput><cfabort>
		</cfif>
	</cfif>

	<!--- 5. Resolve EPF NiSeq (ProduitFini.cfc:1947-1959) --->
	<cfquery name="qEpfNiseq" datasource="#datasourcePrimary#">
		SELECT NISEQ FROM VOperationParTransac
		WHERE TRANSAC = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#transac#">
		AND NOPSEQ IN (
			SELECT NOPSEQ FROM CNOMENCOP
			WHERE TRANSAC = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#transac#">
			AND INVENTAIRE_P = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#inventaireP#">
		)
	</cfquery>
	<cfset epfNiseq = 0>
	<cfif qEpfNiseq.RecordCount GT 0>
		<cfset epfNiseq = Val(qEpfNiseq.NISEQ)>
	</cfif>

	<!--- 6. Create EPF header via AutoFab EXECUTE_TRANSACTION EPF/INS (ProduitFini.cfc:1882) --->
	<!--- Date in Clarion format: days since 28 Dec 1800 --->
	<cfset LaDateClarion = DateDiff("d", CreateDate(1800, 12, 28), Now())>
	<!--- Time in centiseconds since midnight --->
	<cfset LaHeureClarion = (Hour(Now()) * 3600 + Minute(Now()) * 60 + Second(Now())) * 100>

	<!--- Get employee name for EPF --->
	<cfquery name="qEmp" datasource="#datasourcePrimary#">
		SELECT TOP 1 EMNOM FROM EMPLOYE WHERE EMSEQ = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#employeeSeq#">
	</cfquery>
	<cfset empName = "">
	<cfif qEmp.RecordCount GT 0>
		<cfset empName = qEmp.EMNOM>
	</cfif>

	<cfset epfParams = "'';#LaDateClarion#;#LaHeureClarion#;'#empName#';'0';'Ecran de production pour EPF';'';0;0;;'';'';'';'';0;0;0;0;'';0;'';0;0;'';'';'';0">
	<cfset epfResult = autofabExecuteTransaction(datasourcePrimary, "EPF", "INS", epfParams)>

	<!--- Extract PFSEQ from result (retval contains the new PFSEQ) --->
	<cfset newPfseq = 0>
	<cfif StructKeyExists(epfResult, "retval") AND Val(epfResult.retval) GT 0>
		<cfset newPfseq = Val(epfResult.retval)>
	</cfif>

	<!--- 7. Query PFNOTRANS from ENTRERPRODFINI (ProduitFini.cfc:1902-1905) --->
	<cfset pfnotrans = "">
	<cfif newPfseq GT 0>
		<cfquery name="qPfno" datasource="#datasourcePrimary#">
			SELECT PFNOTRANS FROM ENTRERPRODFINI
			WHERE PFSEQ = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#newPfseq#">
		</cfquery>
		<cfif qPfno.RecordCount GT 0>
			<cfset pfnotrans = Trim(qPfno.PFNOTRANS)>
		</cfif>
	</cfif>

	<!--- 8. Create EPF detail rows via EXECUTE_TRANSACTION EPFDETAIL/INS
	      Called twice: DtrSeq=0 and DtrSeq=-1 (ProduitFini.cfc:1461-1490) --->
	<cfset CONOTRANS = trouveTRANSAC.TRNOORIGINE>
	<cfset TRITEM = trouveTRANSAC.TRITEM>
	<cfset epfEntrepot = trouveTRANSAC.ENTREPOT>
	<cfset TRNORELACHE = trouveTRANSAC.TRNO>

	<!--- Detail row 1: DtrSeq=0 --->
	<cfset detailParams1 = "'';0;#newPfseq#;#inventaireP#;#epfEntrepot#;#epfNiseq#;#CONOTRANS#;#TRITEM#;#qty#;;'';;'#TRNORELACHE#';'';0;0;0;0;0;0;0;0;'';0">
	<cfset detResult1 = autofabExecuteTransaction(datasourcePrimary, "EPFDETAIL", "INS", detailParams1)>

	<!--- Detail row 2: DtrSeq=-1 --->
	<cfset detailParams2 = "'';-1;#newPfseq#;#inventaireP#;#epfEntrepot#;#epfNiseq#;#CONOTRANS#;#TRITEM#;#qty#;;'';;'#TRNORELACHE#';'';0;0;0;0;0;0;0;0;'';0">
	<cfset detResult2 = autofabExecuteTransaction(datasourcePrimary, "EPFDETAIL", "INS", detailParams2)>

	<!--- 9. Update TEMPSPROD with EPF link (ProduitFini.cfc:1505-1513) --->
	<cfif Len(pfnotrans) GT 0>
		<cfquery datasource="#datasourcePrimary#">
			UPDATE TEMPSPROD
			SET ENTRERPRODFINI_PFNOTRANS = <cfqueryparam cfsqltype="CF_SQL_VARCHAR" value="#Left(pfnotrans, 9)#">,
				TJQTEPROD = <cfqueryparam cfsqltype="CF_SQL_FLOAT" value="#LaQteAjoutee#">
				<cfif niseq NEQ 0>
					, cNOMENCLATURE = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#niseq#">
				</cfif>
			WHERE TJSEQ = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#Val(LeTJSEQEPF)#">
		</cfquery>
	</cfif>

	<!--- 10. Container handling (ProduitFini.cfc:1516-1530) --->
	<cfif Len(container) GT 0>
		<!--- Check if container module is enabled --->
		<cfquery name="qContainerModule" datasource="#datasourcePrimary#">
			SELECT PCIVALEUR FROM PARA_CIE WHERE PCICODE LIKE '%UTILISE_MODULE_CONTENANT%'
		</cfquery>

		<cfif qContainerModule.RecordCount GT 0 AND Val(qContainerModule.PCIVALEUR) EQ 1>
			<!--- Check if container already exists --->
			<cfquery name="qContenant" datasource="#datasourcePrimary#">
				SELECT c.CON_SEQ, c.CON_NUMERO
				FROM CONTENANT c
				WHERE c.CON_NUMERO = <cfqueryparam cfsqltype="CF_SQL_VARCHAR" value="#Left(container, 10)#">
				AND c.CON_NUMERO <> ''
			</cfquery>

			<cfif qContenant.RecordCount EQ 0>
				<!--- Create new container via AutoFab SOAP --->
				<cfset contParams = "22,0,#epfEntrepot#,#Left(container, 10)#,1">
				<cfset contResult = autofabExecuteStoredProc(datasourcePrimary, "Nba_Insert_Contenant", contParams, "0")>
			</cfif>

			<!--- Link container to transaction detail --->
			<cfset contDetParams = "#pfnotrans#;#inventaireP#;#Left(container, 10)#;#qty#">
			<cfset contDetResult = autofabExecuteStoredProc(datasourcePrimary, "Nba_Insert_Det_Trans_Avec_Contenant", contDetParams, "0")>

			<!--- Update TRANSAC with container number --->
			<cfquery datasource="#datasourcePrimary#">
				UPDATE TRANSAC SET CONTENANT_CON_NUMERO = <cfqueryparam cfsqltype="CF_SQL_VARCHAR" value="#Left(container, 10)#">
				WHERE TRNO = <cfqueryparam cfsqltype="CF_SQL_VARCHAR" value="#pfnotrans#">
			</cfquery>
		</cfif>
	</cfif>

	<!--- Build session-scoped listeTjseq (D1, I6, I10a):
	      Old software builds ListeTJSEQ incrementally: starts with arguments.TJSEQ (current status
	      TJSEQ, typically a STOP row), then appends each new TJSEQ via ProduitFini.cfc:1451.
	      We replicate this by appending the new componentTjseq to the frontend-passed list. --->
	<cfparam name="requestBody.listeTjseq" default="">
	<cfset frontendListeTjseq = Trim(requestBody["listeTjseq"])>
	<cfif Len(frontendListeTjseq) GT 0>
		<cfset accListeTjseq = frontendListeTjseq & "," & Val(LeTJSEQEPF)>
	<cfelse>
		<cfset accListeTjseq = Val(LeTJSEQEPF)>
	</cfif>

	<!--- Return response --->
	<cfset data = StructNew("ordered")>
	<cfset data["tjseq"] = Val(LeTJSEQEPF)>
	<cfset data["pfseq"] = newPfseq>
	<cfset data["pfnotrans"] = pfnotrans>
	<cfset data["listeTjseq"] = accListeTjseq>

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
