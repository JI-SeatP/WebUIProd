# 06 - Edge Cases & Failure Modes

## BUG ANALYSIS: "Operation not found for transac=1068109 copmachine=0"

### Reproduction

1. Order CO-016923-002 (TRANSAC=1068109) has not started production
2. No TEMPSPROD record exists → TJSEQ=NULL, STATUT_CODE=NULL
3. COPMACHINE=0 (or NULL, coalesced to 0 by React `?? 0`)
4. User taps Go → navigates to `/orders/1068109/operation/0`
5. `getOperation.cfm` returns error

### Root Causes (3 bugs + 1 missing parameter)

---

#### BUG 1: Wrong Datasource for Step 1

**File:** `queries/getOperation.cfm:37`

```coldfusion
<cfquery name="qLookup" datasource="#datasourcePrimary#">
```

**Should be:** `datasource="#datasourceExt#"`

**Evidence:** The old code in `support.cfc:3602` queries `vEcransProduction` from `#THIS.dsClientEXT#`. The comment on line 36 of `getOperation.cfm` even says "(EXT datasource)" but uses `datasourcePrimary`.

**Confidence:** Direct — the comment acknowledges the intent to use EXT.

---

#### BUG 2: TJSEQ=0 Rejection Guard

**File:** `queries/getOperation.cfm:48`

```coldfusion
<cfif qLookup.RecordCount EQ 0 OR Val(qLookup.TJSEQ) EQ 0>
```

**Problem:** For unstarted orders, `TJSEQ` is NULL in `vEcransProduction` (OUTER APPLY returns no TEMPSPROD row). `Val(NULL) = 0` in ColdFusion. This guard rejects the order.

**Fix needed:** Remove the `Val(qLookup.TJSEQ) EQ 0` check. The old code does NOT require TJSEQ to be non-zero to load the operation screen. A NULL TJSEQ simply means "not started" and the screen should show "PRET" status.

**Evidence:** The old code (`support.cfc:3602-3616`) has NO TJSEQ guard at all — it returns whatever `vEcransProduction` provides.

**Confidence:** Direct.

---

#### BUG 3: INNER JOIN TEMPSPROD in Step 2

**File:** `queries/getOperation.cfm:145`

```coldfusion
INNER JOIN TEMPSPROD TPROD ON T.TRSEQ = TPROD.TRANSAC AND CNOP.NOPSEQ = TPROD.CNOMENCOP
```

**Problem:** `INNER JOIN` excludes orders with no TEMPSPROD record. Even if Bug 2 were fixed (allowing TJSEQ=0 through), this join would return 0 rows for unstarted orders.

**Fix needed:** Change to `LEFT OUTER JOIN` and make line 146 conditional:
```coldfusion
<cfif Val(theTJSEQ) NEQ 0>
  WHERE TPROD.TJSEQ = <cfqueryparam value="#theTJSEQ#" ...>
<cfelse>
  WHERE 1=1  -- no TEMPSPROD filter for unstarted orders
</cfif>
```

Or better: adopt the old code's approach of querying `vEcransProduction` directly (which already handles this via OUTER APPLY).

**Evidence:** The old code's `RequeteAlternative.cfm` and `vEcransProduction` view both use `OUTER APPLY` for TEMPSPROD, not `INNER JOIN`.

**Confidence:** Direct.

---

#### MISSING PARAMETER: NOPSEQ Not Passed

**File:** `src/features/work-orders/components/ActionsDropdown.tsx:66-70`

```typescript
const handleGo = () => {
  navigate(`/orders/${order.TRANSAC}/operation/${order.COPMACHINE ?? 0}`);
};
```

**Problem:** `NOPSEQ` is not included in the URL. The old code passes NOPSEQ as a critical parameter to disambiguate which operation to load. A TRANSAC can have multiple operations (e.g., pressing, cutting, finishing). Without NOPSEQ, when COPMACHINE=0, the query cannot uniquely identify the target operation.

**Fix needed:** Include NOPSEQ in the route:
```
/orders/:transac/operation/:copmachine/:nopseq
```
Or pass it as a query parameter:
```
/orders/:transac/operation/:copmachine?nopseq=12345
```

**Evidence:** The old code's `Tableau_principal.cfm:12` passes `NOPSEQ` as the 5th parameter to `afficheDiv`, and `support.cfc:3611-3613` uses it in the WHERE clause.

**Confidence:** Direct.

---

## How the Old Software Handles Unstarted Orders

1. `vEcransProduction` view returns the row with `STATUT_CODE=NULL`, `TJSEQ=NULL`
2. `trouveUneOperation` returns this row — no TJSEQ guard
3. `trouveDernierStatutOperation` returns 0 rows (no TEMPSPROD) — handled gracefully
4. The template renders:
   - Status: "PRET" (ready) — white background
   - Quantities: from `PL_RESULTAT` and `DET_COMM` (not dependent on TEMPSPROD)
   - Footer: Active buttons (SETUP, PROD, etc.) enabled for the user to start production
5. The user taps SETUP or PROD → `changeStatut` creates the first `TEMPSPROD` record

---

## Summary of Fixes Required

| # | Bug | File | Line | Fix |
|---|-----|------|------|-----|
| 1 | Wrong datasource | `queries/getOperation.cfm` | 37 | Change `datasourcePrimary` → `datasourceExt` |
| 2 | TJSEQ=0 rejection | `queries/getOperation.cfm` | 48 | Remove `Val(qLookup.TJSEQ) EQ 0` check |
| 3 | INNER JOIN TEMPSPROD | `queries/getOperation.cfm` | 145 | Change to `LEFT OUTER JOIN` + conditional WHERE |
| 4 | Missing NOPSEQ | `ActionsDropdown.tsx` | 67 | Add NOPSEQ to route/query params |
| 4b | Missing NOPSEQ in CFM | `queries/getOperation.cfm` | 37-46 | Add NOPSEQ filter to Step 1 query |
