---
name: coldfusion-api
description: >
  Best practices for creating ColdFusion .cfm endpoint files that serve JSON to the WebUIProd 
  React frontend. No formal API framework — just clean .cfm files that return consistent JSON, 
  include CORS headers, and keep query logic in stored procedures. Use this skill when creating 
  new .cfm files, modifying existing ColdFusion endpoints, writing stored procedures, debugging 
  CORS issues, fixing JSON serialization problems, or when the React frontend needs a new data 
  endpoint. Also trigger when the user mentions ColdFusion, .cfm files, stored procedures, 
  CORS headers, or backend data endpoints for the WebUIProd project.
---

# ColdFusion .cfm Endpoint Patterns

WebUIProd's backend consists of simple `.cfm` files on the same ColdFusion server that hosts 
the existing WebUI project. No formal API framework — the philosophy is:

1. **Always return consistent JSON structure**
2. **Always include the CORS header**
3. **Keep query logic in stored procedures** — not inline SQL

This gives 80% of the benefit with none of the overhead of a formal API structure.

## Creating an Endpoint

**Read** `references/cfm-endpoint-template.md` for the annotated template with the consistent 
JSON response structure, CORS header, try/catch pattern, and stored procedure call pattern.

Every `.cfm` endpoint file follows this structure:
1. Set content type to JSON
2. Add CORS header
3. Wrap logic in try/catch
4. Call stored procedure (not inline SQL)
5. Return `{ success, data, message }` or `{ success, error }`

## Stored Procedures

**Read** `references/stored-procedure-conventions.md` for naming conventions, parameter handling, 
error returns, and when inline SQL is acceptable (rarely).

Rule of thumb: if a query does anything beyond `SELECT * FROM single_table WHERE id = ?`, 
it should be a stored procedure.

## Debugging

**Read** `references/debugging-patterns.md` for common ColdFusion gotchas with JSON serialization, 
CORS troubleshooting, and query debugging.

## File Organization

`.cfm` endpoint files for WebUIProd live in a dedicated directory on the ColdFusion server, 
separate from the WebUI files:

```
queries/
├── getWorkOrders.cfm
├── saveQuantity.cfm
├── getProductionSummary.cfm
└── ...
```

Naming convention: `camelCase.cfm` matching the action (verb + noun).
