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
	<cfset transac = Val(requestBody["transac"])>
	<cfset copmachine = Val(requestBody["copmachine"])>
	<cfset nopseq = Val(requestBody["nopseq"])>

	<!--- Optional fields --->
	<cfset isVcut = false>
	<cfif StructKeyExists(requestBody, "isVcut")><cfset isVcut = requestBody["isVcut"]></cfif>
	<cfset listeTjseq = "">
	<cfif StructKeyExists(requestBody, "listeTjseq")><cfset listeTjseq = Trim(requestBody["listeTjseq"])></cfif>
	<cfset listeEpfSeq = "">
	<cfif StructKeyExists(requestBody, "listeEpfSeq")><cfset listeEpfSeq = Trim(requestBody["listeEpfSeq"])></cfif>
	<cfset listeSmseq = "">
	<cfif StructKeyExists(requestBody, "listeSmseq")><cfset listeSmseq = Trim(requestBody["listeSmseq"])></cfif>
	<cfset smnotrans = "">
	<cfif StructKeyExists(requestBody, "smnotrans")><cfset smnotrans = Trim(requestBody["smnotrans"])></cfif>

	<!--- Find the main TJSEQ (current PROD row) --->
	<cfquery name="qMainTj" datasource="#datasourcePrimary#">
		SELECT TOP 1 TJSEQ
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
	<cfif qMainTj.RecordCount GT 0>
		<cfset mainTjseq = Val(qMainTj.TJSEQ)>
	</cfif>

	<!--- ============================================================ --->
	<!--- Step 1: Find KeepTJSEQ (VCUT only) (QuestionnaireSortie.cfc:348-374) --->
	<!--- Highest TJSEQ with MODEPROD_MPCODE='PROD'; fallback: highest of any mode (I7) --->
	<!--- ============================================================ --->
	<cfset KeepTJSEQ = 0>
	<cfif isVcut>
		<!--- Build combined list of all candidate TJSEQ values --->
		<cfset allTjseqs = listeTjseq>
		<cfif mainTjseq GT 0>
			<cfif Len(allTjseqs) GT 0>
				<cfset allTjseqs = allTjseqs & "," & mainTjseq>
			<cfelse>
				<cfset allTjseqs = mainTjseq>
			</cfif>
		</cfif>

		<cfif Len(allTjseqs) GT 0>
			<!--- Prefer highest PROD row --->
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

	<!--- ============================================================ --->
	<!--- Step 2: Delete ListeTJSEQ rows (skip KeepTJSEQ) --->
	<!--- (QuestionnaireSortie.cfc:394-423) --->
	<!--- ============================================================ --->
	<cfif Len(listeTjseq) GT 0>
		<cfloop list="#listeTjseq#" index="CeTJSEQ">
			<cfif isVcut AND Val(CeTJSEQ) EQ KeepTJSEQ>
				<cfcontinue>
			</cfif>

			<cfquery datasource="#datasourcePrimary#">
				DELETE FROM TEMPSPRODEX WHERE TEMPSPROD = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#Val(CeTJSEQ)#">
			</cfquery>
			<cfquery datasource="#datasourcePrimary#">
				DELETE FROM TEMPSPROD WHERE TJSEQ = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#Val(CeTJSEQ)#">
			</cfquery>
			<cfquery datasource="#datasourcePrimary#">
				DELETE FROM DET_DEFECT WHERE TEMPSPROD = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#Val(CeTJSEQ)#">
			</cfquery>
		</cfloop>
	</cfif>

	<!--- Step 3: Delete primary TJSEQ (skip if = KeepTJSEQ) --->
	<!--- (QuestionnaireSortie.cfc:430-446) --->
	<cfif mainTjseq GT 0 AND (NOT isVcut OR mainTjseq NEQ KeepTJSEQ)>
		<cfquery datasource="#datasourcePrimary#">
			DELETE FROM TEMPSPRODEX WHERE TEMPSPROD = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#mainTjseq#">
		</cfquery>
		<cfquery datasource="#datasourcePrimary#">
			DELETE FROM TEMPSPROD WHERE TJSEQ = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#mainTjseq#">
		</cfquery>
		<cfquery datasource="#datasourcePrimary#">
			DELETE FROM DET_DEFECT WHERE TEMPSPROD = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#mainTjseq#">
		</cfquery>
	</cfif>

	<!--- ============================================================ --->
	<!--- Step 4: Delete SM records (QuestionnaireSortie.cfc:478-523) --->
	<!--- ============================================================ --->
	<!--- Build SM list from listeSmseq OR from smnotrans --->
	<cfset smTrnosToDelete = "">

	<cfif Len(listeSmseq) GT 0>
		<cfloop list="#listeSmseq#" index="CeSmseq">
			<!--- Lookup SMNOTRANS from SORTIEMATERIEL --->
			<cfquery name="qSmTrno" datasource="#datasourcePrimary#">
				SELECT LEFT(SMNOTRANS, 9) AS SMNOTRANS FROM SORTIEMATERIEL
				WHERE SMSEQ = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#Val(CeSmseq)#">
			</cfquery>
			<cfif qSmTrno.RecordCount GT 0 AND Len(Trim(qSmTrno.SMNOTRANS)) GT 0>
				<cfset ceSmnotrans = Left(Trim(qSmTrno.SMNOTRANS), 9)>

				<cfquery datasource="#datasourcePrimary#">
					DELETE FROM SORTIEMATERIEL WHERE SMNOTRANS = <cfqueryparam cfsqltype="CF_SQL_VARCHAR" maxlength="9" value="#ceSmnotrans#">
				</cfquery>
				<cfquery datasource="#datasourcePrimary#">
					DELETE FROM TRANSAC WHERE TRNO = <cfqueryparam cfsqltype="CF_SQL_VARCHAR" maxlength="9" value="#ceSmnotrans#">
				</cfquery>
				<cfquery datasource="#datasourcePrimary#">
					DELETE FROM DET_TRANS WHERE TRANSAC_TRNO = <cfqueryparam cfsqltype="CF_SQL_VARCHAR" maxlength="9" value="#ceSmnotrans#">
				</cfquery>
				<cfquery datasource="#datasourcePrimary#">
					UPDATE TEMPSPROD SET SMNOTRANS = ''
					WHERE SMNOTRANS = <cfqueryparam cfsqltype="CF_SQL_VARCHAR" maxlength="9" value="#ceSmnotrans#">
				</cfquery>
			</cfif>
		</cfloop>
	<cfelseif Len(smnotrans) GT 0>
		<!--- Single SMNOTRANS from frontend state --->
		<cfset ceSmnotrans = Left(smnotrans, 9)>
		<cfquery datasource="#datasourcePrimary#">
			DELETE FROM SORTIEMATERIEL WHERE SMNOTRANS = <cfqueryparam cfsqltype="CF_SQL_VARCHAR" maxlength="9" value="#ceSmnotrans#">
		</cfquery>
		<cfquery datasource="#datasourcePrimary#">
			DELETE FROM TRANSAC WHERE TRNO = <cfqueryparam cfsqltype="CF_SQL_VARCHAR" maxlength="9" value="#ceSmnotrans#">
		</cfquery>
		<cfquery datasource="#datasourcePrimary#">
			DELETE FROM DET_TRANS WHERE TRANSAC_TRNO = <cfqueryparam cfsqltype="CF_SQL_VARCHAR" maxlength="9" value="#ceSmnotrans#">
		</cfquery>
		<cfquery datasource="#datasourcePrimary#">
			UPDATE TEMPSPROD SET SMNOTRANS = ''
			WHERE SMNOTRANS = <cfqueryparam cfsqltype="CF_SQL_VARCHAR" maxlength="9" value="#ceSmnotrans#">
		</cfquery>
	</cfif>

	<!--- ============================================================ --->
	<!--- Step 5: Delete EPF records (QuestionnaireSortie.cfc:526-577) --->
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
	<!--- Step 6: Reset surviving PROD row (QuestionnaireSortie.cfc:580-595) --->
	<!--- ============================================================ --->
	<cfset resetTjseq = 0>
	<cfif isVcut AND KeepTJSEQ GT 0>
		<cfset resetTjseq = KeepTJSEQ>
	<cfelseif mainTjseq GT 0>
		<!--- For non-VCUT, check if mainTjseq still exists --->
		<cfquery name="qStillExists" datasource="#datasourcePrimary#">
			SELECT TJSEQ FROM TEMPSPROD WHERE TJSEQ = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#mainTjseq#">
		</cfquery>
		<cfif qStillExists.RecordCount GT 0>
			<cfset resetTjseq = mainTjseq>
		</cfif>
	</cfif>

	<cfif resetTjseq GT 0>
		<cfquery datasource="#datasourcePrimary#">
			UPDATE TEMPSPROD
			SET TJFINDATE = NULL,
				TJQTEPROD = 0,
				TJQTEDEFECT = 0,
				SMNOTRANS = '',
				ENTRERPRODFINI_PFNOTRANS = ''
			WHERE TJSEQ = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#resetTjseq#">
		</cfquery>
		<cfquery datasource="#datasourcePrimary#">
			DELETE FROM DET_DEFECT WHERE TEMPSPROD = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#resetTjseq#">
		</cfquery>
	</cfif>

	<!--- Return response --->
	<cfset response["success"] = true>
	<cfset response["data"] = StructNew()>
	<cfset response["message"] = "Questionnaire cancelled — write-as-you-go artifacts cleaned up">

	<cfcatch type="any">
		<cfset response = StructNew()>
		<cfset response["success"] = false>
		<cfset response["data"] = StructNew()>
		<cfset response["error"] = cfcatch.message & " " & cfcatch.detail>
	</cfcatch>
</cftry>

<cfoutput>#SerializeJSON(response)#</cfoutput>
</cfsilent>
