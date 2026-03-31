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

	<!--- Get TRANSAC info for TRITEM, CONOTRANS, TRNORELACHE --->
	<cfquery name="qTransacInfo" datasource="#datasourcePrimary#">
		SELECT TRSEQ, TRNO, TRITEM, INVENTAIRE, ENTREPOT, TRNOORIGINE, TRNORELACHE
		FROM TRANSAC
		WHERE TRSEQ = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#transac#">
	</cfquery>
	<cfset TRITEM = Val(qTransacInfo.TRITEM)>
	<cfset TRNORELACHE = Val(qTransacInfo.TRNORELACHE)>

	<!--- CONOTRANS: from TRNOORIGINE matching TRITEM --->
	<cfset CONOTRANS = qTransacInfo.TRNOORIGINE>
	<cfquery name="qTransacOrigine" datasource="#datasourcePrimary#">
		SELECT TRNO, TRITEM, TRNORELACHE
		FROM TRANSAC
		WHERE TRNO = <cfqueryparam cfsqltype="CF_SQL_VARCHAR" maxlength="9" value="#Left(qTransacInfo.TRNOORIGINE, 9)#">
		AND TRITEM = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#TRITEM#">
	</cfquery>
	<cfif qTransacOrigine.RecordCount GT 0>
		<cfset CONOTRANS = qTransacOrigine.TRNO>
		<cfset TRNORELACHE = Val(qTransacOrigine.TRNORELACHE)>
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

	<!--- Get employee name --->
	<cfset empName = "WebUI">

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
			<cfset insertSmParams = "#TRITEM#,'#Left(CONOTRANS, 9)#','#dateStr#','#timeStr#',#TotalQteVCUT#,'#Left(empName, 50)#','','Ecran de production pour SM',0,'0'">
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

	<cfelse>
		<!--- ============================================================ --->
		<!--- NON-VCUT SM PATH (standard) --->
		<!--- ============================================================ --->
		<!--- Update TEMPSPROD with good qty --->
		<cfquery name="qProdRow" datasource="#datasourcePrimary#">
			SELECT TOP 1 TJSEQ, SMNOTRANS
			FROM TEMPSPROD
			WHERE TRANSAC = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#transac#">
			AND CNOMENCOP = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#nopseq#">
			AND MODEPROD_MPCODE = 'PROD'
			AND TJNOTE LIKE 'Ecran de production pour Temps prod%'
			ORDER BY TJSEQ DESC
		</cfquery>

		<cfif qProdRow.RecordCount GT 0>
			<cfquery datasource="#datasourcePrimary#">
				UPDATE TEMPSPROD
				SET TJQTEPROD = <cfqueryparam cfsqltype="CF_SQL_FLOAT" value="#qteBonne#">
				WHERE TJSEQ = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#Val(qProdRow.TJSEQ)#">
			</cfquery>

			<cfset SmNoTransCible = Trim(qProdRow.SMNOTRANS)>

			<!--- Create or update SM --->
			<cfif Len(SmNoTransCible) EQ 0 AND Len(smnotransInput) GT 0>
				<cfset SmNoTransCible = smnotransInput>
			</cfif>

			<cfif Len(SmNoTransCible) EQ 0>
				<!--- Create new SM --->
				<cfset insertSmParams = "#TRITEM#,'#Left(CONOTRANS, 9)#','#dateStr#','#timeStr#',#qteBonne#,'#Left(empName, 50)#','','Ecran de production pour SM',0,'0'">
				<cfset insertSmResult = autofabExecuteStoredProc(datasourcePrimary, "Nba_Sp_Insert_Sortie_Materiel", insertSmParams, "0")>
				<cfif StructKeyExists(insertSmResult, "outputs") AND StructKeyExists(insertSmResult.outputs, "NEWSMNOTRANS")>
					<cfset SmNoTransCible = Trim(insertSmResult.outputs.NEWSMNOTRANS)>
				</cfif>

				<cfif Len(SmNoTransCible) GT 0>
					<cfset sortieSmParams = "'#Left(SmNoTransCible, 9)#',#TRITEM#,'#Left(CONOTRANS, 9)#',#qteBonne#,#operationSeq#,'#Left(empName, 50)#','#Left(nistrNiveau, 500)#','',#TRNORELACHE#">
					<cfset sortieSmResult = autofabExecuteStoredProc(datasourcePrimary, "Nba_Sp_Sortie_Materiel", sortieSmParams, "0")>

					<!--- Link SMNOTRANS to TEMPSPROD --->
					<cfquery datasource="#datasourcePrimary#">
						UPDATE TEMPSPROD
						SET SMNOTRANS = <cfqueryparam cfsqltype="CF_SQL_VARCHAR" maxlength="9" value="#Left(SmNoTransCible, 9)#">
						WHERE TJSEQ = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#Val(qProdRow.TJSEQ)#">
					</cfquery>
				</cfif>
			<cfelse>
				<!--- Update existing SM --->
				<cfset updateSmParams = "'#Left(SmNoTransCible, 9)#',#TRITEM#,'#Left(CONOTRANS, 9)#',#qteBonne#,#operationSeq#,'#Left(empName, 50)#','#Left(nistrNiveau, 500)#','',#TRNORELACHE#">
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
		</cfif>
	</cfif>

	<!--- Query material output rows for display --->
	<cfset materials = []>
	<cfif Len(SmNoTransCible) GT 0>
		<cfquery name="qMaterials" datasource="#datasourcePrimary#">
			SELECT dt.DTRSEQ, dt.DTRQTE, dt.TRANSAC AS DT_TRSEQ,
				i.INNOINV AS code, i.INDESC1 AS description_P, i.INDESC2 AS description_S,
				u.UNDESC_P AS unit_P, u.UNDESC_S AS unit_S,
				t.TRQTETRANSAC, t.TRQTEUNINV, t.ENTREPOT AS ent,
				e.ENCODE AS warehouse, e.ENDESC_P AS warehouse_P, e.ENDESC_S AS warehouse_S
			FROM DET_TRANS dt
			INNER JOIN TRANSAC t ON dt.TRANSAC = t.TRSEQ
			LEFT JOIN INVENTAIRE i ON dt.INVENTAIRE = i.INSEQ
			LEFT JOIN UNITE u ON i.UNITE = u.UNSEQ
			LEFT JOIN ENTREPOT e ON t.ENTREPOT = e.ENSEQ
			WHERE t.TRNO = <cfqueryparam cfsqltype="CF_SQL_VARCHAR" maxlength="9" value="#Left(SmNoTransCible, 9)#">
			ORDER BY dt.DTRSEQ
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
			<cfset mat["correctedQty"] = Val(qMaterials.TRQTETRANSAC)>
			<cfset mat["warehouse"] = qMaterials.warehouse>
			<cfset mat["warehouse_P"] = qMaterials.warehouse_P>
			<cfset mat["warehouse_S"] = qMaterials.warehouse_S>
			<cfset mat["container"] = "">
			<cfset ArrayAppend(materials, mat)>
		</cfloop>
	</cfif>

	<!--- Build response --->
	<cfset data = StructNew("ordered")>
	<cfset data["smnotrans"] = SmNoTransCible>
	<cfset data["smseq"] = smseqResult>
	<cfset data["materials"] = materials>

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
