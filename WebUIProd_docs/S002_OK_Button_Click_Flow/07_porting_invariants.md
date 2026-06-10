# 07 - Porting Invariants

## INV-1: COPMACHINE=0 Must Not Block Operation Loading

When COPMACHINE is 0 (or NULL), every query that filters by COPMACHINE must conditionally skip that filter. The operation must be resolvable by TRANSAC + NOPSEQ alone.

**Old code pattern (replicate in all queries):**
```coldfusion
<cfif Val(COPMACHINE) NEQ 0>
  AND v.COPMACHINE = <COPMACHINE>
</cfif>
```

**Status:** `getOperation.cfm` Step 1 (line 42-44) correctly has this guard. Step 2 does not need it because it joins by TJSEQ. But Step 2's INNER JOIN TEMPSPROD is the blocker — see INV-3.

---

## INV-2: Orders Without TEMPSPROD Must Load Successfully

Orders that have not started production have no TEMPSPROD record. The operation screen must still load for these orders, showing:
- Status: "PRET" / ready
- All order info from CNOMENCOP, PL_RESULTAT, COMMANDE, DET_COMM
- Active footer buttons (when Type='Go') allowing the user to start production

**This is the primary workflow for starting production on a new order.**

---

## INV-3: TEMPSPROD Join Must Be OUTER, Not INNER

The old code uses `OUTER APPLY` for TEMPSPROD in the `vEcransProduction` view. Any query that joins TEMPSPROD for the operation screen must use LEFT JOIN or OUTER APPLY, not INNER JOIN.

---

## INV-4: NOPSEQ Must Be Passed to the Operation Screen

NOPSEQ is required to disambiguate which operation to load when COPMACHINE=0. A TRANSAC can have multiple operations.

The React route must include NOPSEQ either in the path or as a query parameter.

---

## INV-5: Datasource for vEcransProduction Must Be EXT

`vEcransProduction` is queried from the EXT datasource in the old code (`dsClientEXT`). The new endpoint must use `datasourceExt`.

---

## INV-6: Type Parameter (Go vs Consulter) Must Propagate

The old code distinguishes between `Type='Go'` (active footer buttons) and `Type='Consulter'` (disabled footer buttons). The React migration must pass this mode to the operation screen so the status action buttons are enabled/disabled appropriately.

---

## INV-7: Step 2 Query Design

The current `getOperation.cfm` uses a two-step approach (find TJSEQ first, then query by TJSEQ) that fundamentally breaks for unstarted orders. Two approaches to fix:

### Option A: Match old code pattern
Query `vEcransProduction` on EXT datasource directly by TRANSAC + NOPSEQ (+ optional COPMACHINE), returning all fields including NULL status fields for unstarted orders. Then use that data directly.

### Option B: Fix the two-step approach
1. Step 1: Remove TJSEQ=0 guard, allow NULL TJSEQ through
2. Step 2: Change TEMPSPROD to LEFT JOIN, make TJSEQ filter conditional
3. Handle NULL status fields in the frontend (show "PRET" status)

**Recommendation:** Option A is simpler and matches the old code exactly. Option B requires careful handling of NULLs across the entire query.

---

## Incidental Details (NOT invariants)

- The old code saves session state via `modifieDonneesSession` before the AJAX call. The React migration uses URL params and React context — this is fine and does not need to match.
- The old code makes 3 separate AJAX calls (main + header + footer). The React migration can combine these into a single API call.
- Button styling (38px x 50px) — not relevant to the data flow.
