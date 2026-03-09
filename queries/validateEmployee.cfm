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

	<!--- Set datasources based on environment ----->
	<cfset isProduction = (GetEnvironmentVariable("CF_ENVIRONMENT", "test") EQ "production")>
	<cfif isProduction>
		<cfset datasourcePrimary = "AF_SEATPLY">
	<cfelse>
		<cfset datasourcePrimary = "TS_SEATPL">
	</cfif>

	<!--- Read JSON body --->
	<cfset requestBody = DeserializeJSON(GetHttpRequestData().content)>
	<cfset employeeCode = requestBody["employeeCode"]>

	<!--- Exact query from initialise.cfc → initialiseEmploye()
	      Tables: EMPLOYE, EQUIPE, MACHINE, EMP_FCT
	      Returns both _P and _S descriptions so frontend can pick by language --->
	<cfquery name="trouveEmploye" datasource="#datasourcePrimary#">
		SELECT em.EMSEQ, em.EMNO, em.EMNOM, em.EMACTIF, em.EMNOIDENT, em.MACHINE, em.EMEMAIL, em.EQUIPE,
			e.EQDESC_P AS NOMEQUIPE_P, e.EQDESC_S AS NOMEQUIPE_S, e.EQDEBUTQUART, e.EQFINQUART,
			m.DEPARTEMENT, m.ENTREPOT, m.POSTE,
			f.EFCTDESC_P AS Fonction_P, f.EFCTDESC_S AS Fonction_S, f.EFCTCODE AS CodeFonction
		FROM EMPLOYE em
		LEFT JOIN EQUIPE e ON em.EQUIPE = e.EQSEQ
		LEFT JOIN MACHINE m ON em.MACHINE = m.MASEQ
		LEFT JOIN EMP_FCT f ON em.EMP_FCT = f.EFCTSEQ
		WHERE em.EMNOIDENT = <cfqueryparam cfsqltype="CF_SQL_VARCHAR" maxlength="5" value="#Left(employeeCode, 5)#">
	</cfquery>

	<cfif trouveEmploye.RecordCount EQ 1 AND trouveEmploye.EMACTIF EQ 1>
		<cfset row = StructNew("ordered")>
		<cfset row["EMSEQ"] = trouveEmploye.EMSEQ>
		<cfset row["EMNO"] = trouveEmploye.EMNO>
		<cfset row["EMNOM"] = trouveEmploye.EMNOM>
		<cfset row["EMACTIF"] = trouveEmploye.EMACTIF>
		<cfset row["EMNOIDENT"] = trouveEmploye.EMNOIDENT>
		<cfset row["MACHINE"] = trouveEmploye.MACHINE>
		<cfset row["EMEMAIL"] = trouveEmploye.EMEMAIL>
		<cfset row["EQUIPE"] = trouveEmploye.EQUIPE>
		<cfset row["NOMEQUIPE_P"] = trouveEmploye.NOMEQUIPE_P>
		<cfset row["NOMEQUIPE_S"] = trouveEmploye.NOMEQUIPE_S>
		<cfset row["EQDEBUTQUART"] = trouveEmploye.EQDEBUTQUART>
		<cfset row["EQFINQUART"] = trouveEmploye.EQFINQUART>
		<cfset row["DEPARTEMENT"] = trouveEmploye.DEPARTEMENT>
		<cfset row["ENTREPOT"] = trouveEmploye.ENTREPOT>
		<cfset row["POSTE"] = trouveEmploye.POSTE>
		<cfset row["Fonction_P"] = trouveEmploye.Fonction_P>
		<cfset row["Fonction_S"] = trouveEmploye.Fonction_S>
		<cfset row["CodeFonction"] = trouveEmploye.CodeFonction>

		<cfset response["success"] = true>
		<cfset response["data"] = row>
		<cfset response["message"] = "Employee found">
	<cfelseif trouveEmploye.RecordCount EQ 1 AND trouveEmploye.EMACTIF NEQ 1>
		<cfset response["success"] = false>
		<cfset response["data"] = "">
		<cfset response["error"] = "Employee is inactive">
	<cfelse>
		<cfset response["success"] = false>
		<cfset response["data"] = "">
		<cfset response["error"] = "Employee not found">
	</cfif>

	<cfcatch type="any">
		<cfset response = StructNew()>
		<cfset response["success"] = false>
		<cfset response["data"] = "">
		<cfset response["error"] = cfcatch.message & " " & cfcatch.detail>
	</cfcatch>
</cftry>

<cfoutput>#SerializeJSON(response)#</cfoutput>
</cfsilent>
