# 01 - State Model

## Key Insight: COPMACHINE Can Be 0 for Unstarted Orders

When an order has been planned but production has not yet started:
- The order has a `CNOMENCOP` row (operation definition) with a `NOPSEQ`
- A `PL_RESULTAT` row may exist (scheduling) with a `MACHINE` assignment
- **No `TEMPSPROD` row exists** — production hasn't begun
- `COPMACHINE` (from `CNOMENCOP_MACHINE`) may be `0` or `NULL` in the view

The `vEcransProduction` view uses `OUTER APPLY` to get the most recent TEMPSPROD:
```sql
OUTER APPLY (
  SELECT TOP 1 TP.MODEPROD_MPCODE AS STATUT_CODE, TP.TJFINDATE, TP.TJSEQ
  FROM AUTOFAB_TEMPSPROD TP
  WHERE TP.TRANSAC = T.TRANSAC AND TP.CNOMENCOP = CNOP.NOPSEQ
  ORDER BY TP.TJSEQ DESC
) AS TPROD
```

When no TEMPSPROD exists: `STATUT_CODE = NULL`, `TJSEQ = NULL`, `TJFINDATE = NULL`.

## State Variables

### COPMACHINE
- **Source:** `CNOMENCOP_MACHINE.CNOM_SEQ` (machine-specific operation subdivision)
- **When 0/NULL:** Order's operation has not been subdivided into machine-specific units, OR no production has started
- **Old code behavior:** Every query conditionally skips the COPMACHINE filter when `Val(COPMACHINE) = 0`
- **New code behavior:** `getOperation.cfm` correctly skips COPMACHINE filter in Step 1 (line 42-44) but has other issues

### TJSEQ
- **Source:** `TEMPSPROD.TJSEQ` — the sequential ID of the most recent production time record
- **When 0/NULL:** No production has started on this operation
- **Old code behavior:** `trouveUneOperation` returns the row from `vEcransProduction` regardless of TJSEQ value. The UI shows "PRET" (ready) status with active buttons to start production.
- **New code behavior:** `getOperation.cfm` Step 1 (line 48) rejects the row when `Val(TJSEQ) = 0`, returning an error instead of allowing the operation screen to load.

### STATUT_CODE
- **When NULL:** No production has started → old software shows status "PRET" (ready) with white background
- **When "PROD"/"SETUP"/"PAUSE"/"STOP"/"COMP":** Active production status

## State Transition

| Order State | TEMPSPROD exists? | TJSEQ | COPMACHINE | Old Software | New Software |
|-------------|-------------------|-------|------------|-------------|-------------|
| Planned, not started | No | NULL | 0 | Opens DivOperation, shows PRET | **ERROR: "Operation not found"** |
| In production | Yes | >0 | >0 | Opens DivOperation, shows current status | Works correctly |
| Completed | Yes | >0 | >0 | Go button hidden (COMP) | Go button always shown (separate bug) |
