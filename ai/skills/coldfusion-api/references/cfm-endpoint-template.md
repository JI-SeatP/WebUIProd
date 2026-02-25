# CFM Endpoint Template

Every `.cfm` endpoint follows this exact pattern. Copy and adapt for new endpoints.

## GET Endpoint (Read Data)

```cfm
<!--- getWorkOrders.cfm --->
<!--- Returns work orders for the current shift --->
<cfsilent>

<!--- 1. Set response content type --->
<cfcontent type="application/json">

<!--- 2. Always include CORS header --->
<cfheader name="Access-Control-Allow-Origin" value="*">
<cfheader name="Access-Control-Allow-Methods" value="GET, POST, OPTIONS">
<cfheader name="Access-Control-Allow-Headers" value="Content-Type">

<!--- 3. Handle preflight OPTIONS request --->
<cfif CGI.REQUEST_METHOD EQ "OPTIONS">
    <cfoutput>{"success": true}</cfoutput>
    <cfabort>
</cfif>

<!--- 4. Initialize response --->
<cfset response = {}>
<cfset response["success"] = false>
<cfset response["data"] = []>
<cfset response["message"] = "">

<cftry>

    <!--- 5. Call stored procedure (NOT inline SQL) --->
    <cfstoredproc procedure="sp_GetWorkOrders" datasource="#APPLICATION.dsn#">
        <cfprocparam type="in" cfsqltype="cf_sql_integer" value="#SESSION.shiftId#">
        <cfprocresult name="qOrders">
    </cfstoredproc>

    <!--- 6. Build data array from query result --->
    <cfset dataArray = []>
    <cfloop query="qOrders">
        <cfset row = {}>
        <cfset row["id"] = qOrders.woId>
        <cfset row["woNumber"] = qOrders.woNumber>
        <cfset row["product"] = qOrders.productName>
        <cfset row["qtyRequired"] = qOrders.qtyRequired>
        <cfset row["qtyProduced"] = qOrders.qtyProduced>
        <cfset row["status"] = qOrders.status>
        <cfset arrayAppend(dataArray, row)>
    </cfloop>

    <!--- 7. Set success response --->
    <cfset response["success"] = true>
    <cfset response["data"] = dataArray>
    <cfset response["message"] = "Retrieved #qOrders.recordCount# work orders">

    <cfcatch type="any">
        <!--- 8. Error response --->
        <cfset response["success"] = false>
        <cfset response["error"] = cfcatch.message>
        <cfset response["detail"] = cfcatch.detail>
    </cfcatch>
</cftry>

</cfsilent>
<!--- 9. Output JSON --->
<cfoutput>#serializeJSON(response)#</cfoutput>
```

## POST Endpoint (Write Data)

```cfm
<!--- saveQuantity.cfm --->
<!--- Saves produced quantity for a work order --->
<cfsilent>

<cfcontent type="application/json">
<cfheader name="Access-Control-Allow-Origin" value="*">
<cfheader name="Access-Control-Allow-Methods" value="GET, POST, OPTIONS">
<cfheader name="Access-Control-Allow-Headers" value="Content-Type">

<cfif CGI.REQUEST_METHOD EQ "OPTIONS">
    <cfoutput>{"success": true}</cfoutput>
    <cfabort>
</cfif>

<cfset response = {}>
<cfset response["success"] = false>

<cftry>

    <!--- 1. Read JSON body --->
    <cfset requestBody = deserializeJSON(toString(getHTTPRequestData().content))>
    <cfset woId = requestBody.woId>
    <cfset quantity = requestBody.quantity>

    <!--- 2. Server-side validation --->
    <cfif NOT isNumeric(quantity) OR quantity LTE 0>
        <cfset response["error"] = "Invalid quantity">
        <cfoutput>#serializeJSON(response)#</cfoutput>
        <cfabort>
    </cfif>

    <!--- 3. Call stored procedure --->
    <cfstoredproc procedure="sp_SaveProductionQuantity" datasource="#APPLICATION.dsn#">
        <cfprocparam type="in" cfsqltype="cf_sql_integer" value="#woId#">
        <cfprocparam type="in" cfsqltype="cf_sql_integer" value="#quantity#">
        <cfprocparam type="in" cfsqltype="cf_sql_integer" value="#SESSION.userId#">
        <cfprocresult name="qResult">
    </cfstoredproc>

    <!--- 4. Success response --->
    <cfset response["success"] = true>
    <cfset response["data"] = {"saved": true, "newTotal": qResult.newTotal}>
    <cfset response["message"] = "Quantity saved successfully">

    <cfcatch type="any">
        <cfset response["success"] = false>
        <cfset response["error"] = cfcatch.message>
    </cfcatch>
</cftry>

</cfsilent>
<cfoutput>#serializeJSON(response)#</cfoutput>
```

## Response Structure

Every endpoint returns this shape:

```json
// Success
{
  "success": true,
  "data": { ... },      // or [] for arrays
  "message": "Optional human-readable message"
}

// Error
{
  "success": false,
  "error": "What went wrong",
  "detail": "Optional technical detail"
}
```

The `data` field type varies by endpoint:
- Array for list endpoints (`getWorkOrders.cfm` → `[]`)
- Object for single-item endpoints (`getWorkOrder.cfm` → `{}`)
- Object for write confirmations (`saveQuantity.cfm` → `{ saved: true }`)

## Key Rules

1. **`<cfsilent>`** wraps all logic to prevent whitespace in JSON output
2. **CORS headers on every file** — the React frontend may be served from a different port
3. **OPTIONS handling** — browsers send preflight requests for POST with JSON body
4. **`serializeJSON()`** for output — never build JSON strings manually
5. **`deserializeJSON()`** for input — read POST body from `getHTTPRequestData().content`
6. **Struct keys in bracket notation** — `response["success"]` not `response.success` to 
   preserve casing in JSON output (ColdFusion uppercases dot-notation keys)
7. **Always try/catch** — never let an unhandled error return raw ColdFusion error HTML
