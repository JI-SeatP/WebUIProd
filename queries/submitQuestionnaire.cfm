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

	<!--- Read JSON body --->
	<cfset requestBody = DeserializeJSON(GetHttpRequestData().content)>

	<!--- Extract fields from request body --->
	<cfset transac = Val(requestBody["transac"])>
	<cfset copmachine = requestBody["copmachine"]>
	<cfset qtype = requestBody["type"]><!--- "stop" or "comp" --->
	<cfset employeeCode = requestBody["employeeCode"]>
	<cfset goodQty = Val(requestBody["goodQty"])>

	<!--- Optional fields --->
	<cfset primaryCause = "">
	<cfif StructKeyExists(requestBody, "primaryCause")>
		<cfset primaryCause = requestBody["primaryCause"]>
	</cfif>
	<cfset secondaryCause = "">
	<cfif StructKeyExists(requestBody, "secondaryCause")>
		<cfset secondaryCause = requestBody["secondaryCause"]>
	</cfif>
	<cfset notes = "">
	<cfif StructKeyExists(requestBody, "notes")>
		<cfset notes = requestBody["notes"]>
	</cfif>
	<cfset moldAction = "">
	<cfif StructKeyExists(requestBody, "moldAction")>
		<cfset moldAction = requestBody["moldAction"]>
	</cfif>

	<!--- Defects array --->
	<cfset defects = []>
	<cfif StructKeyExists(requestBody, "defects")>
		<cfset defects = requestBody["defects"]>
	</cfif>

	<!--- Finished products array --->
	<cfset finishedProducts = []>
	<cfif StructKeyExists(requestBody, "finishedProducts")>
		<cfset finishedProducts = requestBody["finishedProducts"]>
	</cfif>

	<!--- TODO: Implement actual database writes.
	      This will involve:
	      1. For STOP: Update TEMPSPROD status to STOP, record stop cause in CAUSE_ARRET_PROD
	      2. For COMP: Update TEMPSPROD status to COMP, record good qty + defects
	      3. Insert defect records into DEFAUT_PROD table
	      4. Insert finished product records if applicable
	      5. Handle mold action if applicable (PRESS/CNC)

	      For now, return success to allow frontend testing of the flow.
	      Actual DB writes will be implemented after verifying the read queries work correctly. --->

	<cfset response["success"] = true>
	<cfset response["data"] = StructNew()>
	<cfset response["data"]["transac"] = transac>
	<cfset response["data"]["type"] = qtype>
	<cfset response["message"] = "Questionnaire submitted successfully (stub — DB writes pending)">

	<cfcatch type="any">
		<cfset response = StructNew()>
		<cfset response["success"] = false>
		<cfset response["data"] = StructNew()>
		<cfset response["error"] = cfcatch.message & " " & cfcatch.detail>
	</cfcatch>
</cftry>

<cfoutput>#SerializeJSON(response)#</cfoutput>
</cfsilent>
