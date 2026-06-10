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
	<cfset dtrseq = Val(requestBody["dtrseq"])>
	<cfset conSeq = Val(requestBody["conSeq"])>
	<cfset smnotrans = "">
	<cfif StructKeyExists(requestBody, "smnotrans")>
		<cfset smnotrans = Trim(requestBody["smnotrans"])>
	</cfif>

	<cfif dtrseq EQ 0 OR conSeq EQ 0>
		<cfset response["success"] = false>
		<cfset response["error"] = "dtrseq and conSeq required">
		<cfoutput>#SerializeJSON(response)#</cfoutput><cfabort>
	</cfif>

	<!--- Step 1: Find parent DET_TRANS for the selected container (SortieMateriel.cfc:1487-1497) --->
	<cfquery name="qParent" datasource="#datasourcePrimary#">
		SELECT TOP 1 DTRSEQ, ENTREPOT, ENTREPOT_ENCODE,
			ENTREPOT_ENDESC_P, ENTREPOT_ENDESC_S, CONTENANT_CON_NUMERO
		FROM DET_TRANS
		WHERE CONTENANT = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#conSeq#">
			AND DTRSEQ_PERE IS NULL
			AND TRANSAC_TRNO_EQUATE = 15
			AND TRANSAC IN (SELECT TRSEQ FROM TRANSAC WHERE TRANSAC = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#transac#">)
	</cfquery>

	<cfset parentDtrseq = 0>
	<cfset parentEntrepot = 0>
	<cfset parentEncode = "">
	<cfset parentDescP = "">
	<cfset parentDescS = "">
	<cfset parentConNumero = "">
	<cfif qParent.RecordCount GT 0>
		<cfset parentDtrseq = Val(qParent.DTRSEQ)>
		<cfset parentEntrepot = Val(qParent.ENTREPOT)>
		<cfset parentEncode = qParent.ENTREPOT_ENCODE>
		<cfset parentDescP = qParent.ENTREPOT_ENDESC_P>
		<cfset parentDescS = qParent.ENTREPOT_ENDESC_S>
		<cfset parentConNumero = qParent.CONTENANT_CON_NUMERO>
	</cfif>

	<!--- Step 2: Update target DET_TRANS row (SortieMateriel.cfc:1499-1509) --->
	<cfquery datasource="#datasourcePrimary#">
		UPDATE DET_TRANS
		SET CONTENANT            = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#conSeq#">,
			CONTENANT_CON_NUMERO = <cfqueryparam cfsqltype="CF_SQL_VARCHAR" maxlength="30" value="#parentConNumero#">,
			DTRSEQ_PERE          = <cfif parentDtrseq GT 0><cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#parentDtrseq#"><cfelse>NULL</cfif>,
			ENTREPOT             = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#parentEntrepot#">,
			ENTREPOT_ENCODE      = <cfqueryparam cfsqltype="CF_SQL_VARCHAR" maxlength="12" value="#parentEncode#">,
			ENTREPOT_ENDESC_P    = <cfqueryparam cfsqltype="CF_SQL_VARCHAR" maxlength="60" value="#parentDescP#">,
			ENTREPOT_ENDESC_S    = <cfqueryparam cfsqltype="CF_SQL_VARCHAR" maxlength="60" value="#parentDescS#">
		WHERE DTRSEQ = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#dtrseq#">
	</cfquery>

	<!--- Step 3: Re-fetch materials (mirrors ajouteSM.cfm Step 7) --->
	<cfset materials = []>
	<cfif Len(smnotrans) GT 0>
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
			WHERE DT.TRANSAC_TRNO = <cfqueryparam cfsqltype="CF_SQL_VARCHAR" maxlength="9" value="#Left(smnotrans, 9)#">
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

	<cfset data = StructNew("ordered")>
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
