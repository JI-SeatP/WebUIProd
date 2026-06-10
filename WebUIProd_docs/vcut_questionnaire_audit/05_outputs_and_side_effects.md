# 05 — Outputs and Side Effects

## What changes after a successful VCUT questionnaire submit

### Per-component EPF transactions

For each component in the VCUT BOM, a finished product (EPF) transaction is created during the write-as-you-go phase and posted during submit.

**Created artifacts per component:**
- 1 `ENTRERPRODFINI` row (EPF header) with `PFSEQ`, `PFNOTRANS`
- 2 `DET_TRANS` rows (EPF detail) linked by `TRANSAC_TRNO = PFNOTRANS`
- 1 `TEMPSPROD` row (if cross-NOPSEQ) with `MODEPROD_MPCODE = 'PROD'`
- 1 `CONTENANT` row (if new container)

**Posted via:** AutoFab SOAP `EXECUTE_TRANSACTION EPF/REPORT` — one call per EPF.

### Batch material output (SM)

A single SM is shared across all VCUT components, created or updated as EPFs are added.

**Created artifacts:**
- 1 `SORTIEMATERIEL` row (SM header) with `SMSEQ`, `SMNOTRANS`
- N `DET_TRANS` rows (SM detail) linked by `TRANSAC_TRNO`
- 1 `TRANSAC` row for the SM

**Posted via:** AutoFab SOAP `EXECUTE_TRANSACTION SM/REPORT` — one call for the entire batch.

**Quantity calculation:** `MAX(TJQTEPROD)` across all TEMPSPROD rows in `ListeTJSEQ`, not SUM. The SM recalc uses a weighted ratio from `cNOMENCLATURE` child rows.

### TEMPSPROD state after submit

| Row type | Final state |
|----------|-------------|
| Original PROD row | Closed by `Nba_Sp_Update_Production` (TJFINDATE set) |
| Per-component PROD rows | If VCUT complete: `MODEPROD_MPCODE = 'COMP'`, `TJPROD_TERMINE = 1`, `TJFINDATE = NOW()` |
| New STOP/COMP row | Created by `Nba_Sp_Insert_Production` with the exit status |
| INVENTAIRE_C=10525 row | `TJQTEPROD = 1` (hardcoded) |

### cNOMENCOP state after submit

| Condition | State |
|-----------|-------|
| VCUT complete (`QTE_FORCEE - LeTJQTEPROD <= 0`) | `NOPQTETERMINE` and `NOPQTESCRAP` set from TEMPSPROD aggregates |
| VCUT incomplete | `NOPQTETERMINE = 0`, `NOPQTESCRAP = 0`, `NOPQTERESTE = 0` |

### PL_RESULTAT state after submit

| Field | Value | Condition |
|-------|-------|-----------|
| `PR_TERMINE` | `1` | VCUT complete only (per cNOMENCOP) |
| `PR_DEBUTE` | `1` | Always (status change) |
| `MODEPROD` | New MPSEQ | Always (status change) |

### TRANSAC state after submit

| Field | Value | Condition |
|-------|-------|-----------|
| `TRSTATUTITEM` | `1` | VCUT complete only |

### TEMPSPRODEX (stop causes)

| Field | Value |
|-------|-------|
| `TEMPSPROD` | TJSEQ of the main TEMPSPROD row |
| `QA_CAUSEP` | Primary stop cause code |
| `QA_CAUSES` | Secondary stop cause code |
| `EXTPRD_NOTE` | Free-text note |

Created only if stop causes were entered (STOP status).

## Side-effect ordering

The submit flow writes in this order:

1. `UPDATE TEMPSPROD` — employee fields (line 700)
2. `INSERT/UPDATE TEMPSPRODEX` — stop causes (line 752)
3. AutoFab SOAP `EPF/REPORT` — post each EPF (loop over ListeEPFSEQ)
4. AutoFab SOAP `SM/REPORT` — post SM
5. `UPDATE cNOMENCOP` — quantities (VCUT complete block, line 1186)
6. `UPDATE PL_RESULTAT` — PR_TERMINE (VCUT complete block)
7. `UPDATE TEMPSPROD` — MODEPROD='COMP', TJPROD_TERMINE=1 (all ListeTJSEQ, VCUT complete)
8. `UPDATE TEMPSPROD` — TJQTEPROD=1 for INVENTAIRE_C=10525 (VCUT complete)
9. `UPDATE TRANSAC` — TRSTATUTITEM=1 (VCUT complete)
10. `Nba_Sp_Update_Production` — close PROD row (status change)
11. `Nba_Sp_Insert_Production` — create STOP/COMP row (status change)
12. `UPDATE TEMPSPROD` — CNOMENCOP, INVENTAIRE_C on new row (status change)
13. `UPDATE PL_RESULTAT` — PR_DEBUTE, MODEPROD (status change)
14. `UPDATE TEMPSPROD` — zero cost fields (status change)

Each step is an independent database operation — no wrapping transaction.

## What changes after cancel

All write-as-you-go artifacts are cleaned up:

1. TEMPSPRODEX rows deleted (for non-KeepTJSEQ rows)
2. TEMPSPROD rows deleted (for non-KeepTJSEQ rows)
3. DET_DEFECT rows deleted
4. SORTIEMATERIEL rows deleted
5. TRANSAC rows deleted (both SM and EPF transactions)
6. DET_TRANS rows deleted (both SM and EPF details)
7. ENTRERPRODFINI rows deleted (with PFPOSTER reset first)
8. Surviving PROD row reset: quantities zeroed, SM/EPF references cleared

## Events and notifications

No emitted events, queued jobs, or notifications are triggered by the VCUT questionnaire submit in the CFC code. The AutoFab SOAP calls are synchronous (with 2-second sleeps).

**Exception:** The `SM/REPORT` and `EPF/REPORT` SOAP calls may trigger downstream AutoFab processing (e.g., inventory updates, cost calculations), but this is opaque to the CFC layer — the CFC code does not wait for or react to those downstream effects beyond checking the `retval` response.

## Consumers of outputs

| Output | Consumer |
|--------|----------|
| `TEMPSPROD.TJPROD_TERMINE = 1` | Dashboard queries filter completed operations |
| `PL_RESULTAT.PR_TERMINE = 1` | Operation list marks operation as complete |
| `TRANSAC.TRSTATUTITEM = 1` | Work order status tracking |
| `cNOMENCOP.NOPQTETERMINE` | Quantity tracking for operation scheduling |
| `SORTIEMATERIEL.SMQTEPRODUIT` | Inventory deduction calculations |
| AutoFab `EPF/REPORT` | AutoFab ERP — inventory adjustments, cost posting |
| AutoFab `SM/REPORT` | AutoFab ERP — material consumption posting |
