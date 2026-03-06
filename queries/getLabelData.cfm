<cfsilent>
<cfsetting enablecfoutputonly="true" showdebugoutput="false">
<cfcontent type="application/json">
<cfheader name="Access-Control-Allow-Origin" value="*">
<cfheader name="Access-Control-Allow-Methods" value="GET,OPTIONS">
<cfheader name="Access-Control-Allow-Headers" value="Content-Type">

<cfif cgi.REQUEST_METHOD EQ "OPTIONS">
	<cfoutput>{}</cfoutput><cfabort>
</cfif>

<cfset response = StructNew()>
<cfset response["success"] = false>
<cfset response["error"] = "Not initialized">

<cftry>
	<cfparam name="url.type"      default="operation">
	<cfparam name="url.transac"   default="0">
	<cfparam name="url.nopseq"    default="0">
	<cfparam name="url.tjseq"     default="0">
	<cfparam name="url.contenant" default="0">
	<cfparam name="url.innoinv"   default="">

	<cfif Val(url.transac) EQ 0>
		<cfthrow message="transac parameter is required">
	</cfif>

	<!--- ── Environment detection ─────────────────────────────────────────── --->
	<!--- Matches InitialiseConstantes.cfm path-based pattern:               --->
	<!---   D:\NBA\sites\test\  → AF_SEATPLY_TEST_EXT  (DB: TS_SEATPL_EXT)  --->
	<!---   D:\NBA\sites\prod\  → AF_SEATPLY_EXT       (DB: AF_SEATPLY_EXT) --->
	<cfif FindNoCase("sites\test", cgi.PATH_TRANSLATED)
	   OR FindNoCase("AUTOFABTEST", cgi.PATH_TRANSLATED)
	   OR FindNoCase("SEATPLY_TEST", cgi.PATH_TRANSLATED)>
		<cfset dsExt = "AF_SEATPLY_TEST_EXT">
	<cfelse>
		<cfset dsExt = "AF_SEATPLY_EXT">
	</cfif>

	<cfset labelData = StructNew()>

	<!--- ══════════════════════════════════════════════════════════════════ --->
	<!---  OPERATION label (PRESS / CNC / SAND)                             --->
	<!--- ══════════════════════════════════════════════════════════════════ --->
	<cfif url.type EQ "operation">

		<cfif Val(url.nopseq) EQ 0 OR Val(url.tjseq) EQ 0>
			<cfthrow message="nopseq and tjseq parameters are required for operation type">
		</cfif>

		<cfquery name="qLabel" datasource="#dsExt#">
			SELECT
				V.NOPSEQ,
				V.NO_PROD,
				V.QTE_PRODUITE,
				V.TRANSAC,
				V.NOM_CLIENT,
				V.Panneau,
				(SELECT DISTINCT VP.Panneau FROM [dbo].[vEtiquettesProduction] AS VP
				 WHERE VP.TRANSAC = V.TRANSAC AND VP.PRODUIT_SEQ = V.INVENTAIRE_SEQ
				   AND VP.Panneau IS NOT NULL AND LEN(VP.Panneau) > 0) AS CNC_Panel,
				V.INVENTAIRE_S,
				V.Presses,
				V.QTE_COMMANDEE,
				V.QTE_A_LIVRER,
				V.NO_INVENTAIRE,
				V.NEXTOPERATION_S,
				V.NEXTOPERATION_P,
				V.SCDESC_S,
				V.REVISION,
				V.DeDescription_P,
				V.EQDEBUTQUART,
				V.PRODUIT_CODE,
				V.PRODUIT_S,
				V.EMPLOYE_EMNO,
				V.EMPLOYE_EMNOM
			FROM vEtiquettesProduction AS V WITH (NOLOCK)
			WHERE V.TRANSAC = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#Val(url.transac)#">
			  AND V.NOPSEQ  = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#Val(url.nopseq)#">
			  AND V.TJSEQ   = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#Val(url.tjseq)#">
		</cfquery>

		<cfif qLabel.RecordCount EQ 0>
			<cfthrow message="No operation label data found for TRANSAC=#Val(url.transac)# NOPSEQ=#Val(url.nopseq)# TJSEQ=#Val(url.tjseq)#">
		</cfif>

		<!--- Build operation label struct --->
		<cfset labelData["NOPSEQ"]           = qLabel.NOPSEQ>
		<cfset labelData["NO_PROD"]          = Trim(qLabel.NO_PROD)>
		<cfset labelData["QTE_PRODUITE"]     = qLabel.QTE_PRODUITE>
		<cfset labelData["TRANSAC"]          = qLabel.TRANSAC>
		<cfset labelData["NOM_CLIENT"]       = Trim(qLabel.NOM_CLIENT)>
		<!--- Panneau can be NULL for CNC rows due to view row ordering.
		      Fall back to CNC_Panel (same TRANSAC + PRODUIT_SEQ = INVENTAIRE_SEQ). --->
		<cfif Len(Trim(qLabel.Panneau)) GT 0>
			<cfset labelData["Panneau"] = Trim(qLabel.Panneau)>
		<cfelse>
			<cfset labelData["Panneau"] = Trim(qLabel.CNC_Panel)>
		</cfif>
		<cfset labelData["INVENTAIRE_S"]     = Trim(qLabel.INVENTAIRE_S)>
		<cfset labelData["Presses"]          = Trim(qLabel.Presses)>
		<cfset labelData["QTE_COMMANDEE"]    = qLabel.QTE_COMMANDEE>
		<cfset labelData["QTE_A_LIVRER"]     = qLabel.QTE_A_LIVRER>
		<cfset labelData["NO_INVENTAIRE"]    = Trim(qLabel.NO_INVENTAIRE)>
		<cfset labelData["NEXTOPERATION_S"]  = Trim(qLabel.NEXTOPERATION_S)>
		<cfset labelData["NEXTOPERATION_P"]  = Trim(qLabel.NEXTOPERATION_P)>
		<cfset labelData["SCDESC_S"]         = Trim(qLabel.SCDESC_S)>
		<cfset labelData["REVISION"]         = qLabel.REVISION>
		<cfset labelData["DeDescription_P"]  = Trim(qLabel.DeDescription_P)>
		<cfset labelData["EQDEBUTQUART"]     = qLabel.EQDEBUTQUART>
		<cfset labelData["PRODUIT_CODE"]     = Trim(qLabel.PRODUIT_CODE)>
		<cfset labelData["PRODUIT_S"]        = Trim(qLabel.PRODUIT_S)>
		<cfset labelData["EMPLOYE_EMNO"]     = qLabel.EMPLOYE_EMNO>
		<cfset labelData["EMPLOYE_EMNOM"]    = Trim(qLabel.EMPLOYE_EMNOM)>

	<!--- ══════════════════════════════════════════════════════════════════ --->
	<!---  PACK label (finished product / container)                        --->
	<!--- ══════════════════════════════════════════════════════════════════ --->
	<cfelseif url.type EQ "pack">

		<cfif Val(url.contenant) EQ 0 OR Len(Trim(url.innoinv)) EQ 0>
			<cfthrow message="contenant and innoinv parameters are required for pack type">
		</cfif>

		<cfquery name="qLabel" datasource="#dsExt#">
			SELECT TOP 1
				T_EPF.TRSEQ,
				CON.CON_SEQ,
				CON.CON_NUMERO,
				DC.DCO_QTE_INV,
				DC.NO_SERIE_NSNO_SERIE,
				INV.INNOINV,
				COM.CLIENT_CLNOM,
				COM.CONOPO,
				T_CO.TRNO,
				T_CO.TRITEM,
				T_CO.PRIXCLIENT_PPINNOINV,
				T_CO.INVENTAIRE_INDESC1,
				T_CO.INVENTAIRE_INDESC2,
				T_CO.INVENTAIRE_INDESC3,
				DC.DCO_SEQ
			FROM AUTOFAB_CONTENANT AS CON
			INNER JOIN AUTOFAB_DET_CONTENANT AS DC  ON DC.CONTENANT  = CON.CON_SEQ
			INNER JOIN AUTOFAB_DET_TRANS     AS DTR ON DTR.CONTENANT = CON.CON_SEQ
			INNER JOIN AUTOFAB_INVENTAIRE    AS INV ON INV.INSEQ     = DC.INVENTAIRE
			INNER JOIN AUTOFAB_TRANSAC       AS T_EPF ON T_EPF.TRSEQ  = DTR.TRANSAC
			INNER JOIN AUTOFAB_TRANSAC       AS T_CO  ON T_CO.TRSEQ   = T_EPF.TRANSAC
			INNER JOIN AUTOFAB_COMMANDE      AS COM  ON COM.CONOTRANS = T_CO.TRNO
			WHERE T_CO.TRSEQ = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#Val(url.transac)#">
			  AND CON.CON_SEQ = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#Val(url.contenant)#">
			  AND INV.INNOINV  = <cfqueryparam cfsqltype="CF_SQL_VARCHAR" value="#Trim(url.innoinv)#">
		</cfquery>

		<cfif qLabel.RecordCount EQ 0>
			<cfthrow message="No pack label data found for TRANSAC=#Val(url.transac)# CONTENANT=#Val(url.contenant)# INNOINV=#url.innoinv#">
		</cfif>

		<!--- Build pack label struct --->
		<cfset labelData["TRSEQ"]                 = qLabel.TRSEQ>
		<cfset labelData["CON_SEQ"]               = qLabel.CON_SEQ>
		<cfset labelData["CON_NUMERO"]            = Trim(qLabel.CON_NUMERO)>
		<cfset labelData["DCO_QTE_INV"]           = qLabel.DCO_QTE_INV>
		<cfset labelData["NO_SERIE_NSNO_SERIE"]   = Trim(qLabel.NO_SERIE_NSNO_SERIE)>
		<cfset labelData["INNOINV"]               = Trim(qLabel.INNOINV)>
		<cfset labelData["CLIENT_CLNOM"]          = Trim(qLabel.CLIENT_CLNOM)>
		<cfset labelData["CONOPO"]                = Trim(qLabel.CONOPO)>
		<cfset labelData["TRNO"]                  = Trim(qLabel.TRNO)>
		<cfset labelData["TRITEM"]                = Trim(qLabel.TRITEM)>
		<cfset labelData["PRIXCLIENT_PPINNOINV"]  = Trim(qLabel.PRIXCLIENT_PPINNOINV)>
		<cfset labelData["INVENTAIRE_INDESC1"]    = Trim(qLabel.INVENTAIRE_INDESC1)>
		<cfset labelData["INVENTAIRE_INDESC2"]    = Trim(qLabel.INVENTAIRE_INDESC2)>
		<cfset labelData["INVENTAIRE_INDESC3"]    = Trim(qLabel.INVENTAIRE_INDESC3)>
		<cfset labelData["DCO_SEQ"]               = qLabel.DCO_SEQ>

	<cfelse>
		<cfthrow message="Unknown type: #url.type#">
	</cfif>

	<cfset response["success"] = true>
	<cfset response["data"]    = labelData>
	<cfset response["message"] = "Label data retrieved">

	<cfcatch type="any">
		<cfset response["success"] = false>
		<cfset response["error"]   = cfcatch.message & " | " & cfcatch.detail>
	</cfcatch>
</cftry>

</cfsilent><cfoutput>#SerializeJSON(response)#</cfoutput>
