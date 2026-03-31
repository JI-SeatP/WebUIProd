<cfsilent>
<cfsetting enablecfoutputonly="true" showdebugoutput="false">
<cfcontent type="application/json">
<cfheader name="Access-Control-Allow-Origin" value="*">
<cfheader name="Access-Control-Allow-Methods" value="GET,OPTIONS">
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

	<cfparam name="url.transac" default="0">
	<cfparam name="url.nopseq" default="0">
	<cfparam name="url.copmachine" default="0">

	<cfset transacId = Val(url.transac)>
	<cfset nopseqId = Val(url.nopseq)>
	<cfset copmachineId = Val(url.copmachine)>

	<cfif transacId EQ 0>
		<cfset response["success"] = false>
		<cfset response["error"] = "transac parameter is required">
		<cfoutput>#SerializeJSON(response)#</cfoutput><cfabort>
	</cfif>

	<!--- Query 1: VCUT BOM components from CNOMENCLATURE (same as getVcutData.cfm query D) --->
	<cfquery name="qComponents" datasource="#datasourcePrimary#">
		SELECT CN.NISEQ, CN.NIQTE, CN.INVENTAIRE_M,
			CN.INVENTAIRE_M_INNOINV, I.INDESC1, I.INDESC2
		FROM CNOMENCLATURE CN
		LEFT OUTER JOIN INVENTAIRE I ON (I.INSEQ = CN.INVENTAIRE_M)
		WHERE CN.TRANSAC = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#transacId#">
		AND CN.NISEQ_PERE IS NULL
	</cfquery>

	<!--- Query 2: Get NOPSEQ mapping for each component via VOperationParTransac + cNOMENCOP --->
	<!--- This maps each BOM component (by INVENTAIRE_P) to its operation NOPSEQ and COPMACHINE --->
	<cfquery name="qNopMapping" datasource="#datasourcePrimary#">
		SELECT c.NOPSEQ, c.INVENTAIRE_P, c.CNOMENCLATURE AS CNOMENCLATURE_SEQ,
			cm.cNOM_SEQ AS COPMACHINE
		FROM cNOMENCOP c
		LEFT JOIN cNOMENCOP_Machine cm ON cm.cNOMENCOP = c.NOPSEQ
		WHERE c.TRANSAC = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#transacId#">
	</cfquery>

	<!--- Query 3: All TEMPSPROD rows for this transaction that are PROD mode
	      (write-as-you-go rows created by addVcutQty.cfm) --->
	<cfquery name="qTempsProd" datasource="#datasourcePrimary#">
		SELECT TJSEQ, TJQTEPROD, TJQTEDEFECT, INVENTAIRE_C, CNOMENCOP,
			cNOMENCLATURE, ENTRERPRODFINI_PFNOTRANS, SMNOTRANS, MODEPROD_MPCODE
		FROM TEMPSPROD
		WHERE TRANSAC = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#transacId#">
		AND MODEPROD_MPCODE = 'PROD'
		AND TJNOTE LIKE 'Ecran de production pour Temps prod%'
		ORDER BY TJSEQ
	</cfquery>

	<!--- Build components array with per-component NOPSEQ, cumulative qty, and default qty --->
	<cfset components = []>
	<cfloop query="qComponents">
		<cfset comp = StructNew("ordered")>
		<cfset comp["niseq"] = qComponents.NISEQ>
		<cfset comp["niqte"] = qComponents.NIQTE>
		<cfset comp["inventaireM"] = qComponents.INVENTAIRE_M>
		<cfset comp["code"] = qComponents.INVENTAIRE_M_INNOINV>
		<cfset comp["desc_P"] = qComponents.INDESC1>
		<cfset comp["desc_S"] = qComponents.INDESC2>

		<!--- Find matching NOPSEQ for this component --->
		<cfset comp["nopseq"] = 0>
		<cfset comp["copmachine"] = 0>
		<cfloop query="qNopMapping">
			<cfif Val(qNopMapping.INVENTAIRE_P) EQ Val(qComponents.INVENTAIRE_M)>
				<cfset comp["nopseq"] = qNopMapping.NOPSEQ>
				<cfset comp["copmachine"] = Val(qNopMapping.COPMACHINE)>
				<cfbreak>
			</cfif>
		</cfloop>

		<!--- Compute cumulative produced qty for this component --->
		<cfset cumQty = 0>
		<cfloop query="qTempsProd">
			<cfif Val(qTempsProd.INVENTAIRE_C) EQ Val(qComponents.INVENTAIRE_M)>
				<cfset cumQty = cumQty + Val(qTempsProd.TJQTEPROD)>
			</cfif>
		</cfloop>
		<cfset comp["cumQty"] = cumQty>

		<!--- Default qty: NIQTE (BOM qty) minus cumulative produced (remaining) --->
		<cfset remaining = Val(qComponents.NIQTE) - cumQty>
		<cfif remaining LT 0><cfset remaining = 0></cfif>
		<cfset comp["defaultQty"] = remaining>

		<cfset ArrayAppend(components, comp)>
	</cfloop>

	<!--- Build produced items list from TEMPSPROD rows with EPF links --->
	<cfset producedItems = []>
	<cfset listeTjseq = "">
	<cfset listeEpfSeq = "">
	<cfset foundSmnotrans = "">

	<cfloop query="qTempsProd">
		<!--- Accumulate TJSEQ list --->
		<cfif Len(listeTjseq) GT 0>
			<cfset listeTjseq = listeTjseq & "," & qTempsProd.TJSEQ>
		<cfelse>
			<cfset listeTjseq = qTempsProd.TJSEQ>
		</cfif>

		<!--- Track SMNOTRANS --->
		<cfif Len(Trim(qTempsProd.SMNOTRANS)) GT 0 AND Len(foundSmnotrans) EQ 0>
			<cfset foundSmnotrans = Trim(qTempsProd.SMNOTRANS)>
		</cfif>

		<!--- If this row has an EPF link, query the EPF for details --->
		<cfif Len(Trim(qTempsProd.ENTRERPRODFINI_PFNOTRANS)) GT 0>
			<cfquery name="qEpf" datasource="#datasourcePrimary#">
				SELECT PFSEQ, PFNOTRANS
				FROM ENTRERPRODFINI
				WHERE PFNOTRANS = <cfqueryparam cfsqltype="CF_SQL_VARCHAR" value="#Trim(qTempsProd.ENTRERPRODFINI_PFNOTRANS)#">
			</cfquery>

			<cfif qEpf.RecordCount GT 0>
				<!--- Accumulate EPF SEQ list --->
				<cfif Len(listeEpfSeq) GT 0>
					<cfset listeEpfSeq = listeEpfSeq & "," & qEpf.PFSEQ>
				<cfelse>
					<cfset listeEpfSeq = qEpf.PFSEQ>
				</cfif>
			</cfif>

			<!--- Get product description for this produced item --->
			<cfquery name="qInv" datasource="#datasourcePrimary#">
				SELECT INNOINV, INDESC1, INDESC2
				FROM INVENTAIRE
				WHERE INSEQ = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#Val(qTempsProd.INVENTAIRE_C)#">
			</cfquery>

			<cfset item = StructNew("ordered")>
			<cfset item["tjseq"] = qTempsProd.TJSEQ>
			<cfset item["qty"] = Val(qTempsProd.TJQTEPROD)>
			<cfset item["defectQty"] = Val(qTempsProd.TJQTEDEFECT)>
			<cfset item["epfTrno"] = Trim(qTempsProd.ENTRERPRODFINI_PFNOTRANS)>
			<cfif qInv.RecordCount GT 0>
				<cfset item["code"] = qInv.INNOINV>
				<cfset item["desc_P"] = qInv.INDESC1>
				<cfset item["desc_S"] = qInv.INDESC2>
			<cfelse>
				<cfset item["code"] = "">
				<cfset item["desc_P"] = "">
				<cfset item["desc_S"] = "">
			</cfif>
			<cfset item["container"] = "">
			<cfset item["dtrseq"] = 0>

			<cfset ArrayAppend(producedItems, item)>
		</cfif>
	</cfloop>

	<!--- Build response --->
	<cfset data = StructNew("ordered")>
	<cfset data["components"] = components>
	<cfset data["producedItems"] = producedItems>
	<cfset data["listeTjseq"] = listeTjseq>
	<cfset data["listeEpfSeq"] = listeEpfSeq>
	<cfset data["smnotrans"] = foundSmnotrans>

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
