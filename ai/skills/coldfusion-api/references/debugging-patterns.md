# Debugging Patterns

Common ColdFusion gotchas when building JSON API endpoints, and how to fix them.

## JSON Serialization Gotchas

### Problem: Uppercase Keys

ColdFusion uppercases struct keys when using dot notation:

```cfm
<!--- BAD: produces {"SUCCESS": true, "DATA": [...]} --->
<cfset response.success = true>

<!--- GOOD: preserves casing {"success": true, "data": [...]} --->
<cfset response["success"] = true>
```

**Rule:** Always use bracket notation for struct keys that will be serialized to JSON.

### Problem: Numeric Strings Serialized as Numbers

ColdFusion's `serializeJSON()` converts numeric-looking strings to numbers:

```cfm
<!--- "woNumber": "001" becomes "woNumber": 1 --->
<cfset row["woNumber"] = qOrders.woNumber>
```

Fix by prefixing with a non-numeric character and stripping it in JS, or by using 
`setMetadata()` to force string type. The simplest approach:

```cfm
<!--- Force string output --->
<cfset row["woNumber"] = javaCast("string", qOrders.woNumber)>
```

### Problem: Empty Query Returns Wrong Structure

An empty query result serialized directly gives an unexpected structure. Always 
build your own array:

```cfm
<!--- GOOD: always returns [] for empty results --->
<cfset dataArray = []>
<cfloop query="qOrders">
    <cfset arrayAppend(dataArray, row)>
</cfloop>
<cfset response["data"] = dataArray>
```

### Problem: Boolean Values

ColdFusion booleans serialize as `true`/`false` strings in some versions. 
Force proper booleans:

```cfm
<cfset response["success"] = javaCast("boolean", true)>
```

### Problem: Date Formatting

ColdFusion dates serialize with timezone info. Standardize to ISO 8601:

```cfm
<cfset row["createdDate"] = dateFormat(qOrders.createdDate, "yyyy-mm-dd") & 
    "T" & timeFormat(qOrders.createdDate, "HH:mm:ss")>
```

## CORS Troubleshooting

### Problem: CORS Error on POST Requests

The browser sends a preflight `OPTIONS` request before any POST with a JSON body. 
If the `.cfm` file doesn't handle it, the browser blocks the actual POST.

**Fix:** Handle OPTIONS at the top of every POST endpoint:

```cfm
<cfif CGI.REQUEST_METHOD EQ "OPTIONS">
    <cfheader name="Access-Control-Allow-Origin" value="*">
    <cfheader name="Access-Control-Allow-Methods" value="GET, POST, OPTIONS">
    <cfheader name="Access-Control-Allow-Headers" value="Content-Type">
    <cfcontent type="application/json">
    <cfoutput>{"success": true}</cfoutput>
    <cfabort>
</cfif>
```

### Problem: CORS Headers Missing on Error

If ColdFusion throws an unhandled error, the CORS headers don't get set because 
execution stops before reaching them. That's why CORS headers must be set **before** 
any logic, and all logic must be wrapped in try/catch.

### Problem: Credentials and Wildcards

If the frontend sends cookies (for session management), `Access-Control-Allow-Origin: *` 
won't work. You need the exact origin:

```cfm
<cfheader name="Access-Control-Allow-Origin" value="#CGI.HTTP_ORIGIN#">
<cfheader name="Access-Control-Allow-Credentials" value="true">
```

## Query Debugging

### Logging Slow Queries

Add timing to identify slow stored procedures:

```cfm
<cfset tickStart = getTickCount()>

<cfstoredproc procedure="sp_GetWorkOrders" datasource="#APPLICATION.dsn#">
    <cfprocparam type="in" cfsqltype="cf_sql_integer" value="#shiftId#">
    <cfprocresult name="qOrders">
</cfstoredproc>

<cfset tickEnd = getTickCount()>
<cfset queryTime = tickEnd - tickStart>

<!--- Log if slow (> 1000ms) --->
<cfif queryTime GT 1000>
    <cflog file="webui-prod-slow-queries" 
        text="sp_GetWorkOrders took #queryTime#ms for shiftId=#shiftId#">
</cfif>
```

### Dumping Response for Debugging

Temporarily output the response struct for inspection (remove before production):

```cfm
<!--- Debug mode: append to response --->
<cfif isDefined("URL.debug") AND URL.debug EQ "true">
    <cfset response["_debug"] = {
        "queryTime": queryTime,
        "recordCount": qOrders.recordCount,
        "requestMethod": CGI.REQUEST_METHOD
    }>
</cfif>
```

Access via: `getWorkOrders.cfm?debug=true`

## Common Error Messages

| Error | Likely Cause | Fix |
|-------|-------------|-----|
| "Element X is undefined in SESSION" | Session expired or not set | Check session management, add null check |
| "Invalid data source" | Wrong datasource name | Verify `APPLICATION.dsn` in Application.cfm |
| "The value cannot be converted to a number" | Type mismatch in cfprocparam | Check `cfsqltype` matches the SQL parameter type |
| "Connection refused" from frontend | ColdFusion server not running | Check server status, verify proxy config |
| `Unexpected token < in JSON` in browser | ColdFusion returning HTML error | Check for unhandled exceptions, missing `<cfsilent>` |
