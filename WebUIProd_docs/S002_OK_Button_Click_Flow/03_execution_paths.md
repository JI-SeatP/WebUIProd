# 03 - Execution Paths

## Old Software: Complete Path

### Step 1: JS `afficheDiv` (sp_js.cfm:324-472)

1. Reads filter state from DOM (lines 339-351)
2. Hides all div panels, shows "Please wait" in DivOperation (lines 352-368)
3. Guards: converts `'undefined'` NOPSEQ/MASEQ to `''` (lines 369-370)
4. Fires 14+ `modifieDonneesSession()` AJAX calls to persist state in CF session (lines 376-398)
5. Main AJAX GET to `operation.cfc?method=afficheDiv` with all parameters (line 418)

### Step 2: CFC `operation.cfc:afficheDiv` (lines 9-401)

```
arguments received: Div='DivOperation', Type='Go', TRANSAC=1068109, COPMACHINE=0, NOPSEQ=12345, MASEQ=67, ...
```

- Line 381: `<cfelseif arguments.Div EQ "DivOperation">`
- Line 382: Delegates to `tableau.cfc:afficheTableauOperation` passing all args unchanged
- **COPMACHINE=0 is passed through — no transformation**

### Step 3: CFC `tableau.cfc:afficheTableauOperation`

Calls multiple sub-methods to build the operation screen HTML:

#### 3a. `support.cfc:trouveUneOperation(TRANSAC, COPMACHINE, NOPSEQ)` (support.cfc:3595-3617)

**THE KEY QUERY — uses `dsClientEXT` datasource:**
```sql
SELECT DISTINCT TOP 50 v.*, VBE.*
FROM vEcransProduction v
LEFT OUTER JOIN dbo.VSP_BonTravail_Entete AS VBE ON ...
WHERE v.TRANSAC = <TRANSAC>
  -- COPMACHINE GUARD: skipped when Val(COPMACHINE) = 0
  <cfif val(arguments.COPMACHINE) NEQ 0>
    AND v.COPMACHINE = <COPMACHINE>
  </cfif>
  -- NOPSEQ GUARD: skipped when Val(NOPSEQ) = 0
  <cfif val(arguments.NOPSEQ) NEQ 0>
    AND v.NOPSEQ = <NOPSEQ>
  </cfif>
  AND (v.OPERATION <> 'FINSH')
```

**When COPMACHINE=0:** The COPMACHINE filter is dropped. Operation is found by TRANSAC + NOPSEQ.

**When NOPSEQ is also provided (always >0):** The query resolves to exactly one operation.

**The `vEcransProduction` view uses `OUTER APPLY` for TEMPSPROD**, so orders with no production record still return rows — STATUT_CODE and TJSEQ are NULL, which the UI renders as "PRET" (ready).

#### 3b. `tableau.cfc:trouveLesDetailsOperation` (tableau.cfc:162-165)

Same COPMACHINE guard:
```sql
WHERE VC.TRANSAC = <TRANSAC>
<cfif Val(arguments.COPMACHINE) NEQ 0>
  AND VC.CNOMENCOP_MACHINE = <COPMACHINE>
</cfif>
AND VC.CNOMENCOP = <NOPSEQ>
```

#### 3c. `tableau.cfc:trouveDernierStatutOperation` (tableau.cfc:277-279)

Same guard:
```sql
WHERE TRANSAC = <TRANSAC>
AND cNOMENCOP = <NOPSEQ>
<cfif Val(arguments.COPMACHINE) NEQ 0>
  AND cNOMENCOP_MACHINE = <COPMACHINE>
</cfif>
```

### Step 4: JS success callback (sp_js.cfm:420-469)

1. Injects returned HTML into `DivOperation`
2. Calls `afficheEntete(Type, TRANSAC, COPMACHINE, NOPSEQ, ...)` — renders header
3. Calls `affichePiedDePage(Type, TRANSAC, COPMACHINE, NOPSEQ, ...)` — renders footer with **active** status buttons (because Type='Go')

**Result for unstarted orders:** DivOperation loads successfully showing order info, operation details, and active footer buttons (wrench/SETUP, play/PROD, pause/PAUSE, stop/STOP, checkmark/COMP). The user can tap a status button to start production.

---

## New Software: Current (Broken) Path

### Step 1: React Navigation

`ActionsDropdown.tsx:67` → `navigate('/orders/1068109/operation/0')`

### Step 2: `useOperation.ts:17-18`

Fetches `GET /api/getOperation.cfm?transac=1068109&copmachine=0`

### Step 3: `getOperation.cfm` Step 1 (lines 37-53)

```sql
SELECT TOP 1 v.TJSEQ
FROM vEcransProduction v
WHERE v.TRANSAC = 1068109
AND v.OPERATION <> 'FINSH'
-- COPMACHINE guard: correctly skipped when copmachine=0
ORDER BY v.TJSEQ DESC
```

**BUG 1 — Wrong datasource:** Uses `datasourcePrimary` (line 37) but old code uses `dsClientEXT` (support.cfc:3602).

**BUG 2 — TJSEQ=0 rejection:** Line 48 checks `Val(qLookup.TJSEQ) EQ 0`. For unstarted orders, TJSEQ is NULL (no TEMPSPROD record). `Val(NULL) = 0` in ColdFusion. This guard **rejects the order** and returns the error.

**BUG 3 — Missing NOPSEQ:** Without NOPSEQ in the WHERE clause, if a TRANSAC has multiple operations, the query returns an arbitrary one (ordered by TJSEQ DESC).

### Step 3 never reached: `getOperation.cfm` Step 2 (lines 59-147)

Even if Step 1 were fixed, Step 2 has:
```sql
INNER JOIN TEMPSPROD TPROD ON T.TRSEQ = TPROD.TRANSAC AND CNOP.NOPSEQ = TPROD.CNOMENCOP
WHERE TPROD.TJSEQ = <theTJSEQ>
```

**BUG 4 — INNER JOIN TEMPSPROD:** Uses `INNER JOIN` instead of `OUTER APPLY` / `LEFT JOIN`. Orders with no TEMPSPROD record return 0 rows.

### Result: Error displayed to user
```
Operation not found for transac=1068109 copmachine=0
```
