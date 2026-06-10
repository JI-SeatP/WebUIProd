# Open Questions

## Q1: Does vEcransProduction Exist on Primary Datasource?

**Question:** Does the `vEcransProduction` view exist in the primary database (`TS_SEATPL` / `AF_SEATPLY`), or only in the EXT database?

**Impact:** If it only exists in EXT, `getOperation.cfm` Step 1 would fail for ALL orders (not just unstarted ones) — meaning the endpoint has never worked against the real CF server and was only tested with the mock handler.

**If it exists in both:** Step 1 might return rows from primary but with different data (e.g., the OUTER APPLY subqueries reference `AUTOFAB_TEMPSPROD` which may be in a different schema on primary vs EXT).

---

## Q2: What Happens When NOPSEQ=0 in the Old Code?

**Question:** The NOPSEQ guard in `support.cfc:3611-3613` skips the NOPSEQ filter when `Val(NOPSEQ)=0`. If both COPMACHINE=0 and NOPSEQ=0, the query resolves by TRANSAC alone, potentially returning multiple operations. Is this a real scenario?

**Impact:** Low — from the evidence, NOPSEQ is always populated in the `trouveTableau` query results. But the guard exists, suggesting it was considered possible at some point.

---

## Q3: Step 2 Query Scope

**Question:** The Step 2 query in `getOperation.cfm` (lines 59-147) was designed as a "RequeteAlternative" replica. It uses `INNER JOIN MACHINE` (line 138) and `INNER JOIN TEMPSPROD` (line 145). Were these intentional constraints (only show operations with assigned machines and active production) or bugs?

**Impact:** The `INNER JOIN MACHINE` via `PL_RESULTAT` means operations without a schedule also fail to load. The old code's view handles this via `OUTER APPLY`.

---

## Q4: Mock Handler Match Logic

**Question:** The mock handler in `src/mocks/handlers/operations.ts:20-30` matches by `COPMACHINE === Number(copmachine)`. When `copmachine="0"`, this checks `COPMACHINE === 0`. If mock work orders don't have `COPMACHINE=0` (e.g., it's undefined or null), the match fails.

**Impact:** During development/testing with mocks, the error would also appear. This may have masked the CFM bug during initial development.
