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
	EXACT replica of legacy QuestionnaireSortie.cfc -> retireQuestionnaireSortie (lines 314-597).
	The status change (close PROD + insert STOP/COMP) happened BEFORE the questionnaire opened
	(changeStatus.cfm = old ajouteModifieStatut). Cancel reverts it:
	  1. KeepTJSEQ resolution (VCUT only - old [FIX][VCUT], pool = stopTjseq + listeTjseq)
	  2. (VCUT only) delete listeTjseq rows <> KeepTJSEQ (TEMPSPRODEX+TEMPSPROD+DET_DEFECT)
	  3. Delete the STOP/COMP row (stopTjseq) - TEMPSPRODEX + TEMPSPROD only (old :430-446)
	  4. Re-find latest PROD row (LeTJSEQ, old :448-456); VCUT: override to KeepTJSEQ
	  5. Append the PROD row's own SM to the delete list (old :470-477)
	  6. Per SMSEQ (UNCONDITIONAL): DELETE SORTIEMATERIEL / TRANSAC / DET_TRANS +
	     clear TEMPSPROD.SMNOTRANS (old :478-524)
	  7. EPF cleanup from listeEpfSeq (old :526-577)
	  8. RESET LeTJSEQ (TJFINDATE=NULL, qtys=0, SMNOTRANS='', PFNOTRANS='') +
	     DELETE its DET_DEFECT (old :580-595) -> PROD row reopened
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

	<!--- Parse JSON body --->
	<cfset requestBody = DeserializeJSON(GetHttpRequestData().content)>
	<cfset transac = Val(requestBody["transac"])>
	<cfset copmachine = Val(requestBody["copmachine"])>
	<cfset nopseq = Val(requestBody["nopseq"])>

	<!--- Optional fields --->
	<cfset stopTjseq = 0>
	<cfif StructKeyExists(requestBody, "stopTjseq")><cfset stopTjseq = Val(requestBody["stopTjseq"])></cfif>
	<cfset isVcut = false>
	<cfif StructKeyExists(requestBody, "isVcut")><cfset isVcut = requestBody["isVcut"]></cfif>
	<cfset listeTjseq = "">
	<cfif StructKeyExists(requestBody, "listeTjseq")><cfset listeTjseq = Trim(requestBody["listeTjseq"])></cfif>
	<cfset listeEpfSeq = "">
	<cfif StructKeyExists(requestBody, "listeEpfSeq")><cfset listeEpfSeq = Trim(requestBody["listeEpfSeq"])></cfif>
	<cfset listeSmseq = "">
	<cfif StructKeyExists(requestBody, "listeSmseq")><cfset listeSmseq = Trim(requestBody["listeSmseq"])></cfif>

	<!--- Resolve the STOP/COMP row (old arguments.TJSEQ). Fallback when the
	      frontend didn't pass it (e.g. page reload lost the URL param). --->
	<cfset TheTJSEQ = stopTjseq>
	<cfif TheTJSEQ EQ 0>
		<cfquery name="qStopFallback" datasource="#datasourcePrimary#">
			SELECT TOP 1 TJSEQ
			FROM TEMPSPROD
			WHERE TRANSAC = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#transac#">
			AND CNOMENCOP = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#nopseq#">
			AND MODEPROD_MPCODE IN ('STOP', 'COMP', 'HOLD')
			AND TJNOTE LIKE 'Ecran de production pour Temps prod%'
			ORDER BY TJSEQ DESC
		</cfquery>
		<cfif qStopFallback.RecordCount GT 0>
			<cfset TheTJSEQ = Val(qStopFallback.TJSEQ)>
		</cfif>
	</cfif>

	<!--- ============================================================ --->
	<!--- Step 1: KeepTJSEQ (VCUT only) - old pool is stopTjseq + listeTjseq --->
	<!--- (QuestionnaireSortie.cfc:336-374, [FIX][VCUT]) --->
	<!--- ============================================================ --->
	<cfset KeepTJSEQ = TheTJSEQ>
	<cfif isVcut>
		<cfset allTjseqs = "">
		<cfif TheTJSEQ GT 0>
			<cfset allTjseqs = ListAppend(allTjseqs, TheTJSEQ)>
		</cfif>
		<cfif Len(listeTjseq) GT 0>
			<cfset allTjseqs = ListAppend(allTjseqs, listeTjseq)>
		</cfif>
		<cfset allTjseqs = ListRemoveDuplicates(allTjseqs)>

		<cfif ListLen(allTjseqs) GT 0>
			<cfset KeepTJSEQ = 0>
			<!--- Prefer highest PROD row among candidates --->
			<cfquery name="qKeepProd" datasource="#datasourcePrimary#">
				SELECT TOP 1 TJSEQ FROM TEMPSPROD
				WHERE TJSEQ IN (<cfqueryparam cfsqltype="CF_SQL_INTEGER" list="true" value="#allTjseqs#">)
				AND MODEPROD_MPCODE = 'PROD'
				ORDER BY TJSEQ DESC
			</cfquery>
			<cfif qKeepProd.RecordCount GT 0>
				<cfset KeepTJSEQ = Val(qKeepProd.TJSEQ)>
			<cfelse>
				<!--- Fallback: highest of any mode --->
				<cfquery name="qKeepAny" datasource="#datasourcePrimary#">
					SELECT TOP 1 TJSEQ FROM TEMPSPROD
					WHERE TJSEQ IN (<cfqueryparam cfsqltype="CF_SQL_INTEGER" list="true" value="#allTjseqs#">)
					ORDER BY TJSEQ DESC
				</cfquery>
				<cfif qKeepAny.RecordCount GT 0>
					<cfset KeepTJSEQ = Val(qKeepAny.TJSEQ)>
				</cfif>
			</cfif>
		</cfif>
	</cfif>

	<!--- Old: empty ListeTJSEQ defaults to [arguments.TJSEQ] --->
	<cfif ListLen(listeTjseq) EQ 0 AND TheTJSEQ GT 0>
		<cfset listeTjseq = TheTJSEQ>
	</cfif>

	<!--- ============================================================ --->
	<!--- Step 2: (VCUT only) delete listeTjseq rows <> KeepTJSEQ --->
	<!--- (QuestionnaireSortie.cfc:394-423 - the loop body is VCUT-gated) --->
	<!--- ============================================================ --->
	<cfif Len(listeTjseq) GT 0>
		<cfloop list="#listeTjseq#" index="CeTJSEQ">
			<cfif isVcut AND Val(CeTJSEQ) NEQ KeepTJSEQ>
				<cfquery datasource="#datasourcePrimary#">
					DELETE FROM TEMPSPRODEX WHERE TEMPSPROD = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#Val(CeTJSEQ)#">
				</cfquery>
				<cfquery datasource="#datasourcePrimary#">
					DELETE FROM TEMPSPROD WHERE TJSEQ = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#Val(CeTJSEQ)#">
				</cfquery>
				<cfquery datasource="#datasourcePrimary#">
					DELETE FROM DET_DEFECT WHERE TEMPSPROD = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#Val(CeTJSEQ)#">
				</cfquery>
			</cfif>
		</cfloop>
	</cfif>

	<!--- ============================================================ --->
	<!--- Step 3: Delete the STOP/COMP row (old :430-446 - no DET_DEFECT here) --->
	<!--- ============================================================ --->
	<cfif TheTJSEQ GT 0 AND (NOT isVcut OR TheTJSEQ NEQ KeepTJSEQ)>
		<cfquery datasource="#datasourcePrimary#">
			DELETE FROM TEMPSPRODEX WHERE TEMPSPROD = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#TheTJSEQ#">
		</cfquery>
		<cfquery datasource="#datasourcePrimary#">
			DELETE FROM TEMPSPROD WHERE TJSEQ = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#TheTJSEQ#">
		</cfquery>
	</cfif>

	<!--- ============================================================ --->
	<!--- Step 4: Re-find the latest PROD row (old :448-456 - no copmachine filter) --->
	<!--- ============================================================ --->
	<cfquery name="trouveDernierStatut" datasource="#datasourcePrimary#">
		SELECT TOP 1 TJSEQ, MODEPROD_MPCODE, TJQTEPROD, TJQTEDEFECT, TJDEBUTDATE, SMNOTRANS, cNOMENCOP, CNOMENCLATURE
		FROM TEMPSPROD
		WHERE TRANSAC = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#transac#">
		AND cNOMENCOP = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#nopseq#">
		AND MODEPROD_MPCODE = 'PROD'
		AND TJNOTE LIKE 'Ecran de production pour Temps prod%'
		ORDER BY TJSEQ DESC
	</cfquery>
	<cfset LeTJSEQ = Val(trouveDernierStatut.TJSEQ)>

	<!--- VCUT: force the reset target to KeepTJSEQ if it still exists (old :459-468) --->
	<cfif isVcut AND KeepTJSEQ GT 0>
		<cfquery name="qKeepExists" datasource="#datasourcePrimary#">
			SELECT COUNT(1) AS CNT
			FROM TEMPSPROD
			WHERE TJSEQ = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#KeepTJSEQ#">
		</cfquery>
		<cfif qKeepExists.CNT GT 0>
			<cfset LeTJSEQ = KeepTJSEQ>
		</cfif>
	</cfif>

	<!--- ============================================================ --->
	<!--- Step 5: Append the PROD row's own SM to the delete list (old :470-477) --->
	<!--- ============================================================ --->
	<cfif Len(Trim(trouveDernierStatut.SMNOTRANS)) GT 0>
		<cfquery name="trouveSMSEQ" datasource="#datasourcePrimary#">
			SELECT SMSEQ
			FROM SORTIEMATERIEL
			WHERE SMNOTRANS = <cfqueryparam cfsqltype="CF_SQL_VARCHAR" maxlength="9" value="#Left(trouveDernierStatut.SMNOTRANS, 9)#">
		</cfquery>
		<cfif trouveSMSEQ.RecordCount GT 0>
			<cfset listeSmseq = ListAppend(listeSmseq, trouveSMSEQ.SMSEQ)>
		</cfif>
	</cfif>
	<cfset listeSmseq = ListRemoveDuplicates(listeSmseq)>

	<!--- ============================================================ --->
	<!--- Step 6: SM cleanup - UNCONDITIONAL per SMSEQ (old :478-524) --->
	<!--- ============================================================ --->
	<cfif ListLen(listeSmseq) GT 0>
		<cfloop list="#listeSmseq#" index="LeSMSEQ">
			<!--- Primary lookup: SORTIEMATERIEL by SMSEQ --->
			<cfquery name="trouveSMNOTRANS" datasource="#datasourcePrimary#">
				SELECT TOP 1 LEFT(SMNOTRANS, 9) AS SMNOTRANS
				FROM SORTIEMATERIEL
				WHERE SMSEQ = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#Val(LeSMSEQ)#">
				AND ISNULL(NULLIF(LTRIM(RTRIM(SMNOTRANS)), ''), '') <> ''
			</cfquery>
			<cfif trouveSMNOTRANS.RecordCount EQ 0>
				<!--- Fallback (compat): legacy lists sometimes carried TRSEQ values --->
				<cfquery name="trouveSMNOTRANS" datasource="#datasourcePrimary#">
					SELECT TRNO AS SMNOTRANS
					FROM TRANSAC
					WHERE TRSEQ = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#Val(LeSMSEQ)#">
				</cfquery>
			</cfif>
			<cfif trouveSMNOTRANS.RecordCount GT 0 AND Len(Trim(trouveSMNOTRANS.SMNOTRANS)) GT 0>
				<cfquery datasource="#datasourcePrimary#">
					DELETE FROM SORTIEMATERIEL
					WHERE SMNOTRANS = <cfqueryparam cfsqltype="CF_SQL_VARCHAR" maxlength="9" value="#Left(Trim(trouveSMNOTRANS.SMNOTRANS), 9)#">
				</cfquery>
				<cfquery datasource="#datasourcePrimary#">
					DELETE FROM TRANSAC
					WHERE TRNO = <cfqueryparam cfsqltype="CF_SQL_VARCHAR" maxlength="9" value="#Left(Trim(trouveSMNOTRANS.SMNOTRANS), 9)#">
				</cfquery>
				<cfquery datasource="#datasourcePrimary#">
					DELETE FROM DET_TRANS
					WHERE TRANSAC_TRNO = <cfqueryparam cfsqltype="CF_SQL_VARCHAR" maxlength="9" value="#Left(Trim(trouveSMNOTRANS.SMNOTRANS), 9)#">
				</cfquery>
				<cfquery datasource="#datasourcePrimary#">
					UPDATE TEMPSPROD
					SET SMNOTRANS = ''
					WHERE SMNOTRANS = <cfqueryparam cfsqltype="CF_SQL_VARCHAR" maxlength="9" value="#Left(Trim(trouveSMNOTRANS.SMNOTRANS), 9)#">
				</cfquery>
			</cfif>
		</cfloop>
	</cfif>

	<!--- ============================================================ --->
	<!--- Step 7: Delete EPF records (old :526-577) --->
	<!--- ============================================================ --->
	<cfif Len(listeEpfSeq) GT 0>
		<cfloop list="#listeEpfSeq#" index="CePfseq">
			<!--- Lookup PFNOTRANS --->
			<cfquery name="qPfno" datasource="#datasourcePrimary#">
				SELECT PFNOTRANS FROM ENTRERPRODFINI
				WHERE PFSEQ = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#Val(CePfseq)#">
			</cfquery>

			<cfif qPfno.RecordCount GT 0 AND Len(Trim(qPfno.PFNOTRANS)) GT 0>
				<cfset cePfnotrans = Trim(qPfno.PFNOTRANS)>

				<!--- Get TRSEQ for the EPF TRANSAC --->
				<cfquery name="qEpfTrseq" datasource="#datasourcePrimary#">
					SELECT TRSEQ FROM TRANSAC
					WHERE TRNO = <cfqueryparam cfsqltype="CF_SQL_VARCHAR" maxlength="9" value="#Left(cePfnotrans, 9)#">
				</cfquery>

				<!--- Unpost EPF --->
				<cfquery datasource="#datasourcePrimary#">
					UPDATE ENTRERPRODFINI SET PFPOSTER = 0
					WHERE PFSEQ = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#Val(CePfseq)#">
				</cfquery>

				<!--- Delete EPF --->
				<cfquery datasource="#datasourcePrimary#">
					DELETE FROM ENTRERPRODFINI
					WHERE PFSEQ = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#Val(CePfseq)#">
				</cfquery>

				<!--- Unlink parent references --->
				<cfif qEpfTrseq.RecordCount GT 0>
					<cfquery datasource="#datasourcePrimary#">
						UPDATE TRANSAC SET TRANSAC_PERE = NULL
						WHERE TRANSAC_PERE = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#Val(qEpfTrseq.TRSEQ)#">
					</cfquery>
				</cfif>

				<!--- Delete EPF transaction and detail rows --->
				<cfquery datasource="#datasourcePrimary#">
					DELETE FROM TRANSAC WHERE TRNO = <cfqueryparam cfsqltype="CF_SQL_VARCHAR" maxlength="9" value="#Left(cePfnotrans, 9)#">
				</cfquery>
				<cfquery datasource="#datasourcePrimary#">
					DELETE FROM DET_TRANS WHERE TRANSAC_TRNO = <cfqueryparam cfsqltype="CF_SQL_VARCHAR" maxlength="9" value="#Left(cePfnotrans, 9)#">
				</cfquery>

				<!--- Unlink TEMPSPROD --->
				<cfquery datasource="#datasourcePrimary#">
					UPDATE TEMPSPROD SET ENTRERPRODFINI_PFNOTRANS = ''
					WHERE ENTRERPRODFINI_PFNOTRANS = <cfqueryparam cfsqltype="CF_SQL_VARCHAR" maxlength="9" value="#Left(cePfnotrans, 9)#">
				</cfquery>
			</cfif>
		</cfloop>
	</cfif>

	<!--- ============================================================ --->
	<!--- Step 8: RESET the PROD row -> reopened (old :580-595) --->
	<!--- ============================================================ --->
	<cfif LeTJSEQ GT 0>
		<cfquery datasource="#datasourcePrimary#">
			UPDATE TEMPSPROD
			SET TJFINDATE = NULL,
				TJQTEPROD = 0,
				TJQTEDEFECT = 0,
				SMNOTRANS = '',
				ENTRERPRODFINI_PFNOTRANS = ''
			WHERE TJSEQ = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#LeTJSEQ#">
		</cfquery>
		<cfquery datasource="#datasourcePrimary#">
			DELETE FROM DET_DEFECT WHERE TEMPSPROD = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#LeTJSEQ#">
		</cfquery>
	</cfif>

	<!--- Return response --->
	<cfset response["success"] = true>
	<cfset response["data"] = StructNew()>
	<cfset response["message"] = "Questionnaire cancelled — status change reverted">

	<cfcatch type="any">
		<cfset response = StructNew()>
		<cfset response["success"] = false>
		<cfset response["data"] = StructNew()>
		<cfset response["error"] = cfcatch.message & " " & cfcatch.detail>
	</cfcatch>
</cftry>

<cfoutput>#SerializeJSON(response)#</cfoutput>
</cfsilent>
