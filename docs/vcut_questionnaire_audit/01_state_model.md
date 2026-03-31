# 01 — State Model

## TEMPSPROD lifecycle for VCUT

A VCUT operation creates **multiple TEMPSPROD rows** — one per BOM child component — unlike standard operations which have one TEMPSPROD row per status change. The MODEPROD field tracks the status of each row.

### States

| MODEPROD_MPCODE | Meaning | Created by |
|-----------------|---------|------------|
| `PROD` | Active production | Status change to PROD |
| `STOP` | Stopped | Questionnaire submit (STOP) |
| `COMP` | Completed | Questionnaire submit (COMP), or VCUT-complete block |
| `PAUSE` | Paused | Status change to PAUSE |
| `Setup` | Setup | Status change to SETUP |

### VCUT-specific state variables

The questionnaire tracks these VCUT-specific accumulations during the write-as-you-go flow:

| Variable | Type | Purpose |
|----------|------|---------|
| `ListeTJSEQ` | CSV of integers | All TEMPSPROD.TJSEQ values created for this VCUT session |
| `ListeEPFSEQ` | CSV of integers | All ENTRERPRODFINI.PFSEQ values created |
| `ListeSMSEQ` | CSV of integers | All SORTIEMATERIEL.SMSEQ values created |
| `SMNOTRANS` | String (9 chars) | Current SM transaction number |

These are passed between CFC methods and the client-side JavaScript across the questionnaire session.

## QTE_FORCEE — completion threshold

### Finding
VCUT uses `QTE_FORCEE` (not `DCQTE_A_FAB`) as the quantity threshold for determining whether the operation is complete.

### Confidence
Direct

### Evidence
- Source: `QuestionnaireSortie.cfc:1124-1128`
  - Observation: `LaQteTotale = trouveOperation.QTE_FORCEE` when VCUT; else `LaQteTotale = val(local.Statut.LaQuantiteAFab)`
- Source: `vEcransProduction.sql:144`
  - Observation: `QTE_FORCEE` is computed as `AUTOFAB_FctSelectVar(T.TRSEQ, CNOP.NOPSEQ, '@QTE_FORCE@')`, falling back to `AUTOFAB_FctSelectVar(T.TRSEQ, NULL, '@TOTAL_BIGSHEET@')` when the forced value is 0 or NULL.

### Notes
- `@QTE_FORCE@` is a per-operation variable (keyed by TRSEQ + NOPSEQ)
- `@TOTAL_BIGSHEET@` is a per-transaction variable (keyed by TRSEQ, NOPSEQ = NULL)
- Both are resolved by `DBO.AUTOFAB_FctSelectVar`, a scalar function whose internal table is not source-controlled in this repo

### Porting implication
The new stack must resolve `QTE_FORCEE` using the same `FctSelectVar` logic. If the function is not accessible from the new backend, the underlying variable-store table must be identified and queried directly.

## TJPROD_TERMINE flag

### Finding
VCUT does NOT set `TJPROD_TERMINE = 1` during the EPF posting loop in `ModifieTEMPSPROD`. For non-VCUT operations, each EPF iteration sets this flag on the TEMPSPROD row.

### Confidence
Direct

### Evidence
- Source: `QuestionnaireSortie.cfc:918-932`
  - Observation: The `TJPROD_TERMINE = 1` UPDATE and `PL_RESULTAT.PR_TERMINE = 1` UPDATE are both inside `<cfif trouveOperation.PRODUIT_CODE NEQ "VCUT" AND trouveOperation.NO_INVENTAIRE NEQ "VCUT">`.

### Notes
- VCUT sets `TJPROD_TERMINE = 1` only in the VCUT-complete block (line 1255) when `QTE_FORCEE - LeTJQTEPROD <= 0`, and it does so for ALL rows in `ListeTJSEQ` at once.
- This means individual EPF additions do NOT mark rows as terminated — only the final completion pass does.

### Porting implication
Do not set `TJPROD_TERMINE` per-EPF for VCUT. Only set it in the batch completion block.

## KeepTJSEQ — cancel protection

### Finding
When the questionnaire is cancelled, the highest-sequence TEMPSPROD row with `MODEPROD_MPCODE = 'PROD'` is preserved. All other questionnaire-created rows are deleted.

### Confidence
Direct

### Evidence
- Source: `QuestionnaireSortie.cfc:348-374`
  - Observation: Queries all candidate TJSEQs from `ListeTJSEQ ∪ TJSEQ`, finds the highest TJSEQ where `MODEPROD_MPCODE = 'PROD'`. Fallback: highest TJSEQ of any mode.
- Source: `QuestionnaireSortie.cfc:394-423`
  - Observation: Loop skips deletion when `CeTJSEQ = KeepTJSEQ`.
- Source: `QuestionnaireSortie.cfc:430-446`
  - Observation: Primary TJSEQ deletion is guarded by `NOT local.IsVCUT OR Val(arguments.TJSEQ) NEQ Val(local.KeepTJSEQ)`.

### Porting implication
The cancel endpoint must identify and protect the active PROD row. It must not delete all TEMPSPROD rows blindly — the PROD row predates the questionnaire and represents the ongoing production session.

## State transition table

### During questionnaire (write-as-you-go)

| Action | State change | Affected rows |
|--------|-------------|---------------|
| User adds EPF for component N | New TEMPSPROD row created (MODEPROD='PROD') via `Nba_Sp_Insert_Production` | Component N's TEMPSPROD |
| SM created/updated | TEMPSPROD.SMNOTRANS linked | All batch TEMPSPROD rows |
| SM recalculated | SORTIEMATERIEL.SMQTEPRODUIT updated | SM header + TRANSAC |

### On submit (`ModifieTEMPSPROD` + `ajouteModifieStatut`)

| Condition | State change |
|-----------|-------------|
| Always | Employee updated on TEMPSPROD |
| Always | Stop causes saved in TEMPSPRODEX |
| `changeTEMPSPROD` | **SKIPPED** for VCUT |
| EPF loop | Posted via AutoFab SOAP `EPF/REPORT` (no TJPROD_TERMINE) |
| SM posting | Posted via AutoFab SOAP `SM/REPORT` |
| `QTE_FORCEE - LeTJQTEPROD <= 0` | VCUT-complete block fires (see below) |
| `QTE_FORCEE - LeTJQTEPROD > 0` | cNOMENCOP reset to zero |
| Status write | `Nba_Sp_Update_Production` closes PROD row, `Nba_Sp_Insert_Production` creates STOP/COMP row |
| Cost recalc | **SKIPPED** for VCUT |

### VCUT-complete block (`QuestionnaireSortie.cfc:1186-1290`)

Fires only when `NO_INVENTAIRE EQ "VCUT"` AND `QTE_FORCEE - LeTJQTEPROD <= 0`:

1. For each PFSEQ in `ListeEPFSEQ`:
   - Query TEMPSPROD quantities by `INVENTAIRE_C` matching the EPF's inventory
   - Update `cNOMENCOP` row: set `NOPQTETERMINE`, `NOPQTESCRAP`
2. Update `PL_RESULTAT SET PR_TERMINE = 1` for each cNOMENCOP
3. For each TJSEQ in `ListeTJSEQ`: set `MODEPROD_MPCODE = 'COMP'`, `TJFINDATE = NOW()`, `TJPROD_TERMINE = 1`
4. **Hardcode**: `UPDATE TEMPSPROD SET TJQTEPROD = 1 WHERE INVENTAIRE_C = 10525` (for the VCUT material item)
5. `UPDATE TRANSAC SET TRSTATUTITEM = 1` (closes the VCUT transaction item)

### On cancel (`retireQuestionnaireSortie`)

| Step | Action | VCUT guard |
|------|--------|------------|
| 1 | Find KeepTJSEQ (highest PROD TJSEQ) | VCUT only |
| 2 | Delete ListeTJSEQ rows (TEMPSPRODEX, TEMPSPROD, DET_DEFECT) | Skip KeepTJSEQ |
| 3 | Delete primary TJSEQ row | Skip if = KeepTJSEQ |
| 4 | Delete SM records (SORTIEMATERIEL, TRANSAC, DET_TRANS) | All operations |
| 5 | Delete EPF records (ENTRERPRODFINI, TRANSAC, DET_TRANS) | All operations |
| 6 | Reset surviving PROD row to zero quantities | All operations |

### Rejected transitions

| Transition | Guard | Source |
|-----------|-------|--------|
| Auto-STOP→COMP when qty threshold met | `AND trouveOperation.NO_INVENTAIRE NEQ "VCUT"` | `QuestionnaireSortie.cfc:1130` |
| TJPROD_TERMINE during EPF loop | `PRODUIT_CODE NEQ "VCUT" AND NO_INVENTAIRE NEQ "VCUT"` | `QuestionnaireSortie.cfc:918` |
| Cost recalculation on STOP/COMP | `NO_INVENTAIRE NEQ "VCUT" AND PRODUIT_CODE NEQ "VCUT"` | `QuestionnaireSortie.cfc:1581` |
