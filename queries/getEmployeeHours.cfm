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

	<!--- Read URL parameters --->
	<cfset theEmployeeCode = Val(url.employeeCode)>
	<cfset theDate = url.date>

	<!--- Exact replica of afficheTempsEmploye (operation.cfc:5582-5584)
	      Create date range from single date: midnight to midnight+1 day --->
	<cfset arguments_DateDebut = CreateDateTime(Year(theDate), Month(theDate), Day(theDate), '00', '00', '00')>
	<cfset arguments_DateFin = DateAdd('d', 1, arguments_DateDebut)>
	<cfset arguments_DateFin = CreateDateTime(Year(arguments_DateFin), Month(arguments_DateFin), Day(arguments_DateFin), '00', '00', '00')>

	<!--- Exact replica of afficheTempsEmploye (operation.cfc:5585-5603)
	      Query EMPLOYE_HEURES on EXT datasource with AutoFAB_ view joins --->
	<cfquery name="trouveTempsHomme" datasource="#datasourceExt#">
		SELECT EH.EMPHSEQ, EH.EMPHDATEDEBUT, EH.EMPHDATEFIN, EH.DEPARTEMENT, EH.MACHINE,
			EH.EMPLOYE, EH.EMPHEFFORT_HOMME,
			D.deDescription_P, D.DeDescription_S,
			M.MADESC_P, M.MADESC_S, M.MACODE,
			E.EMNOM
		FROM EMPLOYE_HEURES EH
		INNER JOIN AutoFAB_DEPARTEMENT D ON EH.DEPARTEMENT = D.DESEQ
		INNER JOIN AutoFAB_MACHINE M ON EH.MACHINE = M.MASEQ
		INNER JOIN AutoFAB_EMPLOYE E ON EH.EMPLOYE = E.EMSEQ
		WHERE 0=0
		AND EH.EMPHDATEDEBUT >= <cfqueryparam cfsqltype="cf_sql_timestamp" value="#CreateODBCDateTime(arguments_DateDebut)#">
		AND EH.EMPHDATEFIN <= <cfqueryparam cfsqltype="cf_sql_timestamp" value="#CreateODBCDateTime(arguments_DateFin)#">
		<cfif theEmployeeCode GT 0>
		AND EH.EMPLOYE = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#theEmployeeCode#">
		</cfif>
		ORDER BY EH.EMPHDATEDEBUT DESC, EH.EMPHDATEFIN DESC
	</cfquery>

	<!--- Exact replica of afficheTempsEmploye (operation.cfc:5604-5608)
	      Get employee name from primary datasource --->
	<cfquery name="trouveCetEmploye" datasource="#datasourcePrimary#">
		SELECT EMNOM
		FROM EMPLOYE
		WHERE EMSEQ = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#theEmployeeCode#">
	</cfquery>

	<!--- Build response array with computed fields
	      Exact replica of duration/effort calculations (operation.cfc:5650-5658) --->
	<cfset dataArray = []>
	<cfloop query="trouveTempsHomme">
		<cfset row = StructNew("ordered")>
		<cfset row["EHSEQ"] = trouveTempsHomme.EMPHSEQ>
		<cfset row["EHDEBUT"] = DateFormat(trouveTempsHomme.EMPHDATEDEBUT, 'yyyy-mm-dd') & ' ' & TimeFormat(trouveTempsHomme.EMPHDATEDEBUT, 'HH:nn:ss')>
		<cfset row["EHFIN"] = DateFormat(trouveTempsHomme.EMPHDATEFIN, 'yyyy-mm-dd') & ' ' & TimeFormat(trouveTempsHomme.EMPHDATEFIN, 'HH:nn:ss')>
		<!--- Duration in minutes: exact replica of DateDiff('n',...) at operation.cfc:5653 --->
		<cfset LaDuree = DateDiff('n', trouveTempsHomme.EMPHDATEDEBUT, trouveTempsHomme.EMPHDATEFIN)>
		<cfset row["EHDUREE"] = LaDuree>
		<cfset row["DEPARTEMENT"] = trouveTempsHomme.DEPARTEMENT>
		<cfset row["DECODE"] = trouveTempsHomme.deDescription_P>
		<cfset row["DECODE_S"] = trouveTempsHomme.DeDescription_S>
		<cfset row["MACHINE"] = trouveTempsHomme.MACHINE>
		<cfset row["MACODE"] = trouveTempsHomme.MACODE>
		<cfset row["MACHINE_P"] = trouveTempsHomme.MADESC_P>
		<cfset row["MACHINE_S"] = trouveTempsHomme.MADESC_S>
		<cfset row["EMNOM"] = trouveTempsHomme.EMNOM>
		<cfset row["EMNOIDENT"] = trouveTempsHomme.EMPLOYE>
		<!--- Effort: stored as 0.00-1.00, returned as 0-100 (operation.cfc:5656,5690) --->
		<cfset row["EFFORTRATE"] = trouveTempsHomme.EMPHEFFORT_HOMME * 100>
		<!--- Hours worked = duration * effort (operation.cfc:5656-5658) --->
		<cfset LaDureeEffort = LaDuree * trouveTempsHomme.EMPHEFFORT_HOMME>
		<cfset row["HOURSWORKED"] = Int(LaDureeEffort)>
		<cfset ArrayAppend(dataArray, row)>
	</cfloop>

	<cfset response["success"] = true>
	<cfset response["data"] = dataArray>
	<cfset response["message"] = "Employee hours retrieved">

	<cfcatch type="any">
		<cfset response = StructNew()>
		<cfset response["success"] = false>
		<cfset response["data"] = []>
		<cfset response["error"] = cfcatch.message & " " & cfcatch.detail>
	</cfcatch>
</cftry>

<cfoutput>#SerializeJSON(response)#</cfoutput>
</cfsilent>
