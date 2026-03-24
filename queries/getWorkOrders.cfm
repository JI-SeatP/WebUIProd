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

	<!--- Set datasources based on environment ----->
	<cfset isProduction = (GetEnvironmentVariable("CF_ENVIRONMENT", "test") EQ "production")>
	<cfif isProduction>
		<cfset datasourcePrimary = "AF_SEATPLY">
		<cfset datasourceExt = "AF_SEATPLY_EXT">
	<cfelse>
		<cfset datasourcePrimary = "TS_SEATPL">
		<cfset datasourceExt = "TS_SEATPL_EXT">
	</cfif>

	<!--- Read optional query parameters --->
	<cfparam name="url.departement" default="">
	<cfparam name="url.machine" default="">
	<cfparam name="url.search" default="">
	<cfparam name="url.status" default="">

	<!--- Main work order list query
	      Uses vEcransProduction view (EXT db) + AUTOFAB_DET_COMM for priority + VSP_BonTravail_Entete for detail quantities.
	      Inline SQL for now — will be moved to stored procedure after testing. --->
	<cfquery name="qWorkOrders" datasource="#datasourceExt#">
		SELECT DISTINCT
			v.TRANSAC,
			v.COPMACHINE,
			v.NOPSEQ,
			v.TJSEQ,
			v.NO_PROD,
			v.NOM_CLIENT,
			v.CODE_CLIENT,
			VBE.CONOPO,
			v.TREPOSTER_TRANSFERT,
			v.OPERATION,
			v.OPERATION_P,
			v.OPERATION_S,
			v.OPERATION_SEQ,
			v.MACHINE,
			v.MACODE,
			v.MACHINE_P,
			v.MACHINE_S,
			v.DEPARTEMENT,
			v.DESEQ,
			v.DECODE,
			v.DeDescription_P,
			v.DeDescription_S,
			v.FAMILLEMACHINE,
			v.FMCODE,
			v.NO_INVENTAIRE,
			v.INVENTAIRE_SEQ,
			v.INVENTAIRE_P,
			v.INVENTAIRE_S,
			v.PRODUIT_CODE,
			v.PRODUIT_SEQ,
			v.PRODUIT_P,
			v.PRODUIT_S,
			v.MATERIEL_CODE,
			v.MATERIEL_SEQ,
			v.MATERIEL_P,
			v.MATERIEL_S,
			v.Panneau,
			v.MOULE_CODE,
			v.GROUPE,
			v.REVISION,
			v.DATE_DEBUT_PREVU,
			v.DATE_FIN_PREVU,
			v.TJFINDATE,
			v.PR_DEBUTE,
			v.PR_TERMINE,
			v.TERMINE,
			v.QTE_A_FAB,
			v.QTE_PRODUITE,
			v.QTE_RESTANTE,
			v.QTE_FORCEE,
			v.QTY_REQ,
			v.STATUT_CODE,
			v.STATUT_P,
			v.STATUT_S,
			dc.DCPRIORITE,
			v.ESTKIT,
			v.ENTREPOT,
			v.ENTREPOT_CODE,
			v.ENTREPOT_P,
			v.ENTREPOT_S,
			<!--- Detail quantities from VSP_BonTravail_Entete --->
			VBE.DCQTE_A_FAB AS VBE_DCQTE_A_FAB,
			VBE.DCQTE_A_PRESSER,
			VBE.DCQTE_PRESSED,
			VBE.DCQTE_PENDING_TO_PRESS,
			VBE.DCQTE_PENDING_TO_MACHINE,
			VBE.DCQTE_FINISHED,
			VBE.DCQTE_REJET,
			VBE.PCS_PER_PANEL,
			VBE.SHARE_PRESSING,
			VBE.PAGE_COMPO,
			VBE.Panel_NiSeq,
			<!--- V-CUT fields from the view --->
			v.VCUT_INNOINV,
			v.VCUT_INDESC1,
			v.VCUT_INDESC2
		FROM vEcransProduction v
		INNER JOIN AUTOFAB_DET_COMM dc ON v.TRANSAC = dc.TRANSAC
		LEFT OUTER JOIN dbo.VSP_BonTravail_Entete AS VBE ON VBE.TRANSAC = v.TRANSAC
		WHERE v.OPERATION <> 'FINSH'
		AND (dc.DCPRIORITE < 100000 OR v.DATE_DEBUT_PREVU IS NOT NULL)
		AND v.MACODE <> 'PRESS_NS'

		<!--- Department filter --->
		<cfif Val(url.departement) NEQ 0>
			AND v.DESEQ = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#Val(url.departement)#">
		</cfif>

		<!--- Machine filter --->
		<cfif Val(url.machine) NEQ 0>
			AND v.MACHINE = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#Val(url.machine)#">
		</cfif>

		<!--- Status filter (comma-separated codes like "PROD,PAUSE,STOP") --->
		<cfif url.status NEQ "">
			AND v.STATUT_CODE IN (
				<cfloop list="#url.status#" index="s">
					<cfqueryparam cfsqltype="CF_SQL_VARCHAR" value="#Trim(s)#"><cfif s NEQ ListLast(url.status)>,</cfif>
				</cfloop>
			)
		</cfif>

		<!--- Search filter (LIKE across multiple fields) --->
		<cfif url.search NEQ "">
			AND (
				v.NO_PROD LIKE <cfqueryparam cfsqltype="CF_SQL_VARCHAR" value="%#Left(url.search, 50)#%">
				OR v.NOM_CLIENT LIKE <cfqueryparam cfsqltype="CF_SQL_VARCHAR" value="%#Left(url.search, 50)#%">
				OR v.CODE_CLIENT LIKE <cfqueryparam cfsqltype="CF_SQL_VARCHAR" value="%#Left(url.search, 20)#%">
				OR v.PRODUIT_P LIKE <cfqueryparam cfsqltype="CF_SQL_VARCHAR" value="%#Left(url.search, 150)#%">
				OR v.PRODUIT_S LIKE <cfqueryparam cfsqltype="CF_SQL_VARCHAR" value="%#Left(url.search, 150)#%">
				OR v.PRODUIT_CODE LIKE <cfqueryparam cfsqltype="CF_SQL_VARCHAR" value="%#Left(url.search, 20)#%">
				OR v.INVENTAIRE_P LIKE <cfqueryparam cfsqltype="CF_SQL_VARCHAR" value="%#Left(url.search, 150)#%">
				OR v.INVENTAIRE_S LIKE <cfqueryparam cfsqltype="CF_SQL_VARCHAR" value="%#Left(url.search, 150)#%">
				OR v.NO_INVENTAIRE LIKE <cfqueryparam cfsqltype="CF_SQL_VARCHAR" value="%#Left(url.search, 20)#%">
				OR v.MATERIEL_P LIKE <cfqueryparam cfsqltype="CF_SQL_VARCHAR" value="%#Left(url.search, 150)#%">
				OR v.MATERIEL_S LIKE <cfqueryparam cfsqltype="CF_SQL_VARCHAR" value="%#Left(url.search, 150)#%">
				OR v.MATERIEL_CODE LIKE <cfqueryparam cfsqltype="CF_SQL_VARCHAR" value="%#Left(url.search, 20)#%">
				OR v.GROUPE LIKE <cfqueryparam cfsqltype="CF_SQL_VARCHAR" value="%#Left(url.search, 50)#%">
				OR v.MOULE_CODE LIKE <cfqueryparam cfsqltype="CF_SQL_VARCHAR" value="%#Left(url.search, 50)#%">
				OR v.PANNEAU LIKE <cfqueryparam cfsqltype="CF_SQL_VARCHAR" value="%#Left(url.search, 50)#%">
				OR v.MACHINE_P LIKE <cfqueryparam cfsqltype="CF_SQL_VARCHAR" value="%#Left(url.search, 50)#%">
				OR v.MACHINE_S LIKE <cfqueryparam cfsqltype="CF_SQL_VARCHAR" value="%#Left(url.search, 50)#%">
				OR v.MACODE LIKE <cfqueryparam cfsqltype="CF_SQL_VARCHAR" value="%#Left(url.search, 20)#%">
			)
		</cfif>

		ORDER BY dc.DCPRIORITE, v.NO_PROD, v.DATE_DEBUT_PREVU
	</cfquery>

	<!--- Convert query to array of structs with bracket notation to preserve casing --->
	<cfset rows = []>
	<cfloop query="qWorkOrders">
		<cfset row = StructNew("ordered")>
		<cfset row["TRANSAC"] = qWorkOrders.TRANSAC>
		<cfset row["COPMACHINE"] = qWorkOrders.COPMACHINE>
		<cfset row["NOPSEQ"] = qWorkOrders.NOPSEQ>
		<cfset row["TJSEQ"] = qWorkOrders.TJSEQ>
		<cfset row["NO_PROD"] = qWorkOrders.NO_PROD>
		<cfset row["NOM_CLIENT"] = qWorkOrders.NOM_CLIENT>
		<cfset row["CODE_CLIENT"] = qWorkOrders.CODE_CLIENT>
		<cfset row["CONOPO"] = qWorkOrders.CONOPO>
		<cfset row["TREPOSTER_TRANSFERT"] = qWorkOrders.TREPOSTER_TRANSFERT>
		<cfset row["OPERATION"] = qWorkOrders.OPERATION>
		<cfset row["OPERATION_P"] = qWorkOrders.OPERATION_P>
		<cfset row["OPERATION_S"] = qWorkOrders.OPERATION_S>
		<cfset row["OPERATION_SEQ"] = qWorkOrders.OPERATION_SEQ>
		<cfset row["MACHINE"] = qWorkOrders.MACHINE>
		<cfset row["MACODE"] = qWorkOrders.MACODE>
		<cfset row["MACHINE_P"] = qWorkOrders.MACHINE_P>
		<cfset row["MACHINE_S"] = qWorkOrders.MACHINE_S>
		<cfset row["DEPARTEMENT"] = qWorkOrders.DEPARTEMENT>
		<cfset row["DESEQ"] = qWorkOrders.DESEQ>
		<cfset row["DECODE"] = qWorkOrders.DECODE>
		<cfset row["DeDescription_P"] = qWorkOrders.DeDescription_P>
		<cfset row["DeDescription_S"] = qWorkOrders.DeDescription_S>
		<cfset row["FAMILLEMACHINE"] = qWorkOrders.FAMILLEMACHINE>
		<cfset row["FMCODE"] = qWorkOrders.FMCODE>
		<cfset row["NO_INVENTAIRE"] = qWorkOrders.NO_INVENTAIRE>
		<cfset row["INVENTAIRE_SEQ"] = qWorkOrders.INVENTAIRE_SEQ>
		<cfset row["INVENTAIRE_P"] = qWorkOrders.INVENTAIRE_P>
		<cfset row["INVENTAIRE_S"] = qWorkOrders.INVENTAIRE_S>
		<cfset row["PRODUIT_CODE"] = qWorkOrders.PRODUIT_CODE>
		<cfset row["PRODUIT_SEQ"] = qWorkOrders.PRODUIT_SEQ>
		<cfset row["PRODUIT_P"] = qWorkOrders.PRODUIT_P>
		<cfset row["PRODUIT_S"] = qWorkOrders.PRODUIT_S>
		<cfset row["MATERIEL_CODE"] = qWorkOrders.MATERIEL_CODE>
		<cfset row["MATERIEL_SEQ"] = qWorkOrders.MATERIEL_SEQ>
		<cfset row["MATERIEL_P"] = qWorkOrders.MATERIEL_P>
		<cfset row["MATERIEL_S"] = qWorkOrders.MATERIEL_S>
		<cfset row["Panneau"] = qWorkOrders.Panneau>
		<cfset row["MOULE_CODE"] = qWorkOrders.MOULE_CODE>
		<cfset row["GROUPE"] = qWorkOrders.GROUPE>
		<cfset row["REVISION"] = qWorkOrders.REVISION>
		<cfset row["DATE_DEBUT_PREVU"] = qWorkOrders.DATE_DEBUT_PREVU>
		<cfset row["DATE_FIN_PREVU"] = qWorkOrders.DATE_FIN_PREVU>
		<cfset row["TJFINDATE"] = qWorkOrders.TJFINDATE>
		<cfset row["PR_DEBUTE"] = qWorkOrders.PR_DEBUTE>
		<cfset row["PR_TERMINE"] = qWorkOrders.PR_TERMINE>
		<cfset row["TERMINE"] = qWorkOrders.TERMINE>
		<cfset row["QTE_A_FAB"] = qWorkOrders.QTE_A_FAB>
		<cfset row["QTE_PRODUITE"] = qWorkOrders.QTE_PRODUITE>
		<cfset row["QTE_RESTANTE"] = qWorkOrders.QTE_RESTANTE>
		<cfset row["QTE_FORCEE"] = qWorkOrders.QTE_FORCEE>
		<cfset row["QTY_REQ"] = qWorkOrders.QTY_REQ>
		<cfset row["STATUT_CODE"] = qWorkOrders.STATUT_CODE>
		<cfset row["STATUT_P"] = qWorkOrders.STATUT_P>
		<cfset row["STATUT_S"] = qWorkOrders.STATUT_S>
		<cfset row["DCPRIORITE"] = qWorkOrders.DCPRIORITE>
		<cfset row["ESTKIT"] = qWorkOrders.ESTKIT>
		<cfset row["ENTREPOT"] = qWorkOrders.ENTREPOT>
		<cfset row["ENTREPOT_CODE"] = qWorkOrders.ENTREPOT_CODE>
		<cfset row["ENTREPOT_P"] = qWorkOrders.ENTREPOT_P>
		<cfset row["ENTREPOT_S"] = qWorkOrders.ENTREPOT_S>
		<!--- Detail quantities --->
		<cfset row["VBE_DCQTE_A_FAB"] = qWorkOrders.VBE_DCQTE_A_FAB>
		<cfset row["DCQTE_A_PRESSER"] = qWorkOrders.DCQTE_A_PRESSER>
		<cfset row["DCQTE_PRESSED"] = qWorkOrders.DCQTE_PRESSED>
		<cfset row["DCQTE_PENDING_TO_PRESS"] = qWorkOrders.DCQTE_PENDING_TO_PRESS>
		<cfset row["DCQTE_PENDING_TO_MACHINE"] = qWorkOrders.DCQTE_PENDING_TO_MACHINE>
		<cfset row["DCQTE_FINISHED"] = qWorkOrders.DCQTE_FINISHED>
		<cfset row["DCQTE_REJET"] = qWorkOrders.DCQTE_REJET>
		<cfset row["PCS_PER_PANEL"] = qWorkOrders.PCS_PER_PANEL>
		<cfset row["SHARE_PRESSING"] = qWorkOrders.SHARE_PRESSING>
		<cfset row["PAGE_COMPO"] = qWorkOrders.PAGE_COMPO>
		<cfset row["Panel_NiSeq"] = qWorkOrders.Panel_NiSeq>
		<!--- V-CUT fields --->
		<cfset row["VCUT_INNOINV"] = qWorkOrders.VCUT_INNOINV>
		<cfset row["VCUT_INDESC1"] = qWorkOrders.VCUT_INDESC1>
		<cfset row["VCUT_INDESC2"] = qWorkOrders.VCUT_INDESC2>
		<cfset ArrayAppend(rows, row)>
	</cfloop>

	<!--- V-CUT: compute big sheet qty used per TRANSAC (matches old trouveQteBigSheets query) --->
	<cfset vcutTransacs = []>
	<cfloop array="#rows#" index="r">
		<cfif (r["NO_INVENTAIRE"] EQ "VCUT" OR r["PRODUIT_CODE"] EQ "VCUT") AND NOT ArrayFind(vcutTransacs, r["TRANSAC"])>
			<cfset ArrayAppend(vcutTransacs, r["TRANSAC"])>
		</cfif>
	</cfloop>
	<cfif ArrayLen(vcutTransacs) GT 0>
		<cfset vcutMap = StructNew()>
		<cfloop array="#vcutTransacs#" index="tr">
			<cfquery name="qBigSheet" datasource="#datasourcePrimary#">
				SELECT SUM(det.DTRQTE) AS TotalBigSheet
				FROM DET_TRANS det
				INNER JOIN TRANSAC t ON det.TRANSAC = t.TRSEQ
				WHERE t.TRANSAC = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#Val(tr)#">
				AND t.TRNO_EQUATE = 7
			</cfquery>
			<cfset vcutMap[tr] = Val(qBigSheet.TotalBigSheet)>
		</cfloop>
		<!--- Inject VCUT_QTE_UTILISEE into matching rows --->
		<cfloop from="1" to="#ArrayLen(rows)#" index="i">
			<cfif StructKeyExists(vcutMap, rows[i]["TRANSAC"])>
				<cfset rows[i]["VCUT_QTE_UTILISEE"] = vcutMap[rows[i]["TRANSAC"]]>
			</cfif>
		</cfloop>
	</cfif>

	<!--- Big sheet inventory info per TRANSAC (matches old trouveInfoBIGSHEET query) --->
	<cfif ArrayLen(vcutTransacs) GT 0>
		<cfloop array="#vcutTransacs#" index="tr">
			<cfquery name="qBigSheetInfo" datasource="#datasourcePrimary#">
				SELECT TOP 1 INVENTAIRE, INVENTAIRE_INNOINV, INVENTAIRE_INDESC1, INVENTAIRE_INDESC2
				FROM cNOMENCOP
				WHERE TRANSAC = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#Val(tr)#">
				AND INVENTAIRE_P NOT IN (SELECT INSEQ FROM INVENTAIRE WHERE INNOINV='VCUT')
			</cfquery>
			<cfif qBigSheetInfo.RecordCount GT 0>
				<cfloop from="1" to="#ArrayLen(rows)#" index="i">
					<cfif rows[i]["TRANSAC"] EQ tr>
						<cfset rows[i]["BIGSHEET_INNOINV"] = qBigSheetInfo.INVENTAIRE_INNOINV>
						<cfset rows[i]["BIGSHEET_INDESC1"] = qBigSheetInfo.INVENTAIRE_INDESC1>
						<cfset rows[i]["BIGSHEET_INDESC2"] = qBigSheetInfo.INVENTAIRE_INDESC2>
					</cfif>
				</cfloop>
			</cfif>
		</cfloop>
	</cfif>

	<!--- Row grouping: replicate old ColdFusion <cfloop GROUP="..."> behavior.
	      Dept 9 (Sanding) and 11: group by NO_PROD (one row per order).
	      All other depts: group by NOPSEQ (one row per nomenclature operation).
	      Keeps the first row encountered per group key (query is already sorted by DCPRIORITE, NO_PROD). --->
	<cfset groupedRows = []>
	<cfset seenKeys = StructNew()>
	<cfloop from="1" to="#ArrayLen(rows)#" index="i">
		<cfset r = rows[i]>
		<cfif Val(r["DESEQ"]) EQ 9 OR Val(r["DESEQ"]) EQ 11>
			<cfset groupKey = r["NO_PROD"]>
		<cfelse>
			<cfset groupKey = r["NOPSEQ"]>
		</cfif>
		<cfif NOT StructKeyExists(seenKeys, groupKey)>
			<cfset seenKeys[groupKey] = true>
			<cfset ArrayAppend(groupedRows, r)>
		</cfif>
	</cfloop>

	<cfset response["success"] = true>
	<cfset response["data"] = groupedRows>
	<cfset response["message"] = "Retrieved " & ArrayLen(groupedRows) & " work orders">

	<cfcatch type="any">
		<cfset response = StructNew()>
		<cfset response["success"] = false>
		<cfset response["data"] = []>
		<cfset response["error"] = cfcatch.message & " " & cfcatch.detail>
	</cfcatch>
</cftry>

<cfoutput>#SerializeJSON(response)#</cfoutput>
</cfsilent>
