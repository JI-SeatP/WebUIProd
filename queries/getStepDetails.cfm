<cfparam name="url.metseq" default="0">
<cfparam name="url.lang" default="FR">

<cfheader name="Access-Control-Allow-Origin" value="*">
<cfheader name="Access-Control-Allow-Methods" value="GET, OPTIONS">
<cfheader name="Access-Control-Allow-Headers" value="Content-Type">
<cfheader name="Content-Type" value="application/json; charset=utf-8">

<cftry>
  <cfquery name="trouveImages" datasource="#application.dsClient#">
    SELECT DM.DMDESC_P, DM.DMDESC_S, DM.DMFICHIER
    FROM DET_METHODE DM
    WHERE DM.METHODE = <cfqueryparam cfsqltype="CF_SQL_INTEGER" value="#val(url.metseq)#">
    ORDER BY DM.DMDESC_P
  </cfquery>

  <cfset images = []>
  <cfloop query="trouveImages">
    <cfset imgRaw = DMFICHIER>
    <cfset imgUrl = ReplaceNoCase(imgRaw, application.CheminFichier, application.RacineDocuments, "ONE")>
    <cfset imgUrl = Replace(imgUrl, "\", "/", "ALL")>
    <cfset arrayAppend(images, {
      "descP": DMDESC_P,
      "descS": DMDESC_S,
      "url": imgUrl
    })>
  </cfloop>

  <cfset result = {
    "success": javaCast("boolean", true),
    "data": {
      "images": images
    }
  }>

  <cfoutput>#serializeJSON(result)#</cfoutput>

  <cfcatch type="any">
    <cfoutput>{"success":false,"error":"#JSStringFormat(cfcatch.message)#"}</cfoutput>
  </cfcatch>
</cftry>
