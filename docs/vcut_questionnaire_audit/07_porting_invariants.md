# 07 — Porting Invariants

These are behaviors that **must be preserved** in the new stack to avoid functional drift. Each invariant is backed by evidence from the legacy CFC code.

## Required behavioral invariants

### I1 — Per-component TEMPSPROD rows

Each VCUT BOM child component gets its own `TEMPSPROD` row with separate `TJQTEPROD`, `TJQTEDEFECT`, `CNOMENCOP`, and `INVENTAIRE_C` values.

**Evidence:** `ProduitFini.cfc:1399-1433` — `Nba_Sp_Insert_Production` creates a new TEMPSPROD row per component when `NOPSEQ` differs from the main operation.

**Why:** VCUT cuts multiple different products from one big sheet. Each product's quantity must be tracked independently for the cNOMENCOP completion check.

---

### I2 — QTE_FORCEE as completion threshold

VCUT completion is determined by `QTE_FORCEE - LeTJQTEPROD <= 0`, where `QTE_FORCEE` comes from `AUTOFAB_FctSelectVar(@QTE_FORCE@)` falling back to `@TOTAL_BIGSHEET@`. This is NOT the standard `DCQTE_A_FAB`.

**Evidence:** `QuestionnaireSortie.cfc:1124-1128`, `vEcransProduction.sql:144`

**Why:** VCUT operations have a forced quantity that represents the number of big sheets to process, not the number of individual components.

---

### I3 — No TJPROD_TERMINE during EPF loop

VCUT does NOT set `TJPROD_TERMINE = 1` on individual TEMPSPROD rows during the EPF posting loop. This flag is only set in the batch completion block.

**Evidence:** `QuestionnaireSortie.cfc:918-932` — guarded by `PRODUIT_CODE NEQ "VCUT" AND NO_INVENTAIRE NEQ "VCUT"`

**Why:** Individual EPF additions are incremental — completion is a batch decision based on the total across all components.

---

### I4 — No cost recalculation (FctCalculTempsDeProduction)

VCUT skips the `FctCalculTempsDeProduction` cost recalculation entirely on STOP and COMP.

**Evidence:** `QuestionnaireSortie.cfc:1581` — guarded by `NO_INVENTAIRE NEQ "VCUT" AND PRODUIT_CODE NEQ "VCUT"`

**Why:** VCUT has a different cost structure — per-component costs are handled by the EPF/SM posting through AutoFab, not by the TEMPSPROD cost function.

---

### I5 — No auto-STOP→COMP promotion

When the quantity threshold is reached during a STOP, VCUT does NOT auto-promote to COMP. The worker must explicitly choose COMP.

**Evidence:** `QuestionnaireSortie.cfc:1130` — guarded by `NO_INVENTAIRE NEQ "VCUT"`

**Why:** VCUT completion triggers the cNOMENCOP update loop and TRANSAC closure — these should only run when the worker confirms the operation is done.

---

### I6 — Batch SM with MAX quantity (session-scoped)

SM quantity for VCUT is `MAX(TJQTEPROD)` across all `ListeTJSEQ` rows, not SUM. SM recalc uses weighted ratios from `cNOMENCLATURE` child rows.

**CRITICAL scope detail:** `ListeTJSEQ` is session-scoped (see D1) — on a fresh "+" click it only contains the STOP TJSEQ + newly created PROD TJSEQ. The STOP row is excluded by `MODEPROD_MPCODE = 'PROD'` filter, so MAX effectively equals the current entry's qty. If `ListeTJSEQ` incorrectly includes all historical PROD rows, MAX will reflect accumulated totals from previous sessions instead of the current entry.

**Evidence:** `SortieMateriel.cfc:1706-1718` (MAX), `SortieMateriel.cfc:1081-1115` (weighted ratio)

**Why:** Each component's quantity represents cuts from the same big sheets. MAX avoids double-counting material consumption.

---

### I7 — KeepTJSEQ on cancel

Cancel must preserve the active PROD TEMPSPROD row (highest TJSEQ with `MODEPROD_MPCODE = 'PROD'`). Only questionnaire-created rows are deleted.

**Evidence:** `QuestionnaireSortie.cfc:348-374` (KeepTJSEQ identification), `QuestionnaireSortie.cfc:394-446` (deletion guard)

**Why:** The PROD row predates the questionnaire and represents the ongoing production session. Deleting it would orphan the operation.

---

### I8 — EPF and SM posting via AutoFab SOAP (`EXECUTE_TRANSACTION`)

ALL EPF transactions (both VCUT and non-VCUT) are posted via `EXECUTE_TRANSACTION EPF/REPORT` (AutoFab SOAP) through the `ReportEntreeProduitFini` function. SM transactions are posted via `EXECUTE_TRANSACTION SM/REPORT` through `ReportSortieMateriel`. The stored procedure `Nba_ReporteUnTransac` does **not appear anywhere** in the CFC questionnaire source files.

**Evidence:** `QuestionnaireSortie.cfc` — `ReportEntreeProduitFini` (lines 2115-2143) sets `LeTraitement = "EPF"`, `LaOperation = "REPORT"`, `LaCommande = "EXECUTE_TRANSACTION"` and calls `support.envoiXMLGet`. `ReportSortieMateriel` (lines 1743-1785) does the same for SM. A grep for `ReporteUnTransac` across all files in `src/old/EcransSeatPly/cfc/` returns zero matches. The only similar function found is `Nba_ReporteLesTransac` in `support.cfc:3258` which is used for warehouse transfers, not questionnaire submission.

**Why:** Both VCUT and non-VCUT call the same `ReportEntreeProduitFini` function which uses AutoFab SOAP. The difference is that VCUT iterates over `ListeEPFSEQ` (known at submission time) while non-VCUT queries unposted EPFs from the database. The posting mechanism itself is identical.

---

### I9 — VCUT-complete block writes

When the operation is complete, the following writes must occur in this order:
1. Per-EPF: query TEMPSPROD by `INVENTAIRE_C`, update `cNOMENCOP` (`NOPQTETERMINE`, `NOPQTESCRAP`)
2. `PL_RESULTAT SET PR_TERMINE = 1` per cNOMENCOP
3. All `ListeTJSEQ`: `MODEPROD_MPCODE = 'COMP'`, `TJFINDATE = NOW()`, `TJPROD_TERMINE = 1`
4. Hardcode: `TEMPSPROD SET TJQTEPROD = 1 WHERE INVENTAIRE_C = 10525`
5. `TRANSAC SET TRSTATUTITEM = 1`

**Evidence:** `QuestionnaireSortie.cfc:1186-1290`

---

### I10a — Cross-NOPSEQ TEMPSPROD row uses MAIN nopseq for CNOMENCOP

When AjouteEPF creates a new TEMPSPROD row for a component whose `trouveNOPSEQ.NOPSEQ` differs from `arguments.NOPSEQ` (the main operation), the subsequent UPDATE at `ProduitFini.cfc:1427` sets `CNOMENCOP = arguments.NOPSEQ` (the **main** nopseq), overwriting whatever the SP used.

**Evidence:** `ProduitFini.cfc:1424-1433` — `CNOMENCOP = #Val(arguments.NOPSEQ)#`

**Why:** The SM lookup in Flow C (`qTJSEQPROD` at `SortieMateriel.cfc:1651`) queries `WHERE CNOMENCOP = @nopseq` using the main nopseq. If the new row's CNOMENCOP were set to the component's nopseq, this query would skip it and find an older row that may already have SMNOTRANS populated, causing SM reuse instead of creation.

---

### I10 — changeTEMPSPROD is skipped

VCUT does NOT call `changeTEMPSPROD` (which updates `TJQTEPROD`, `TJQTEDEFECT`, `TJNOTE`, `CNOMENCOP`, `INVENTAIRE_C` on the main PROD row). Each component sets its own values during EPF creation.

**Evidence:** `QuestionnaireSortie.cfc:708-730` — guarded by `PRODUIT_CODE NEQ "VCUT" AND NO_INVENTAIRE NEQ "VCUT"`

---

### I11 — Defect section suppressed

VCUT questionnaire does NOT render the defect quantity section.

**Evidence:** `QuestionnaireSortie.cfc:54` — `afficheQteDefectueusesQS` is inside `PRODUIT_CODE NEQ "VCUT" AND NO_INVENTAIRE NEQ "VCUT"` guard.

---

### I12 — Material exit always shown

VCUT always shows the material exit section regardless of `UtiliseInventaire`.

**Evidence:** `QuestionnaireSortie.cfc:83` — `OR NO_INVENTAIRE EQ "VCUT" OR PRODUIT_CODE EQ "VCUT"` forces the section visible.

---

## Timing and ordering invariants

### O1 — EPF before SM

EPF creation (Flow B) must complete before SM creation/update (Flow C). The SM needs the TEMPSPROD rows and quantities established by EPF creation.

### O2 — Write-as-you-go before submit

EPFs and SMs are created incrementally during the questionnaire session. Submit posts them (EPF/REPORT, SM/REPORT) and then runs the completion check. The submit flow does NOT create EPFs or SMs — it only posts and finalizes what was already created.

### O3 — VCUT-complete block before status change

The cNOMENCOP/TEMPSPROD/TRANSAC completion writes (in `ModifieTEMPSPROD`) must execute before `ajouteModifieStatut` (which closes the PROD row and creates the new STOP/COMP row).

## Data-shape invariants

### D1 — ListeTJSEQ is session-scoped CSV of integers

TEMPSPROD TJSEQ values accumulated during the current questionnaire session, comma-separated. Used in IN clauses across multiple queries.

**CRITICAL scope detail:** On the first "+" click, `ListeTJSEQ` is initialized to `arguments.TJSEQ` (the current status row's TJSEQ — typically a STOP row) at `ProduitFini.cfc:1534`. Each subsequent "+" click appends the newly created TJSEQ (`ProduitFini.cfc:1451`). The JS frontend stores this in a DOM hidden field and passes it forward.

This means `ListeTJSEQ` does NOT contain all historical PROD rows for the transaction — only the current STOP row + freshly created rows from the current session. When used in Flow C's pass 3 (`WHERE TJSEQ IN (ListeTJSEQ) AND MODEPROD_MPCODE = 'PROD' AND SMNOTRANS <> ''`), the STOP row is filtered out by `MODEPROD_MPCODE = 'PROD'`, and the fresh rows have no SMNOTRANS yet, so pass 3 returns empty and a new SM is created.

**Evidence:** `ProduitFini.cfc:1534` (initialization), `ProduitFini.cfc:1451` (append), `sp_js.cfm:1580,1601` (DOM storage and update).

### D2 — ListeEPFSEQ is CSV of integers

All ENTRERPRODFINI PFSEQ values created, comma-separated. Used for EPF posting and cancel cleanup.

### D3 — SMNOTRANS is 9-character string

SM transaction number, truncated to 9 characters via `Left(..., 9)` in some operations.

### D4 — AutoFab SOAP parameters are semicolon-delimited

`EXECUTE_TRANSACTION` parameters are positional, semicolon-separated strings. `EXECUTE_STORED_PROC` concatenates SP name and arguments as `<sQuery>SP_NAME arg1, arg2, ...</sQuery>`.

## Incidental implementation details (NOT invariants)

These are legacy artifacts that should NOT be preserved:

| Detail | Why it's incidental |
|--------|-------------------|
| 2-second sleep between AutoFab SOAP calls | Throttling artifact; the new stack can batch or pipeline |
| ColdFusion struct notation (`##`, `Val()`, `ListGetAt()`) | Language-specific; use equivalent TypeScript constructs |
| `trouveOPERATIONPARTRANSAC..ENTREPF` double-dot typo | ColdFusion ignores it; no behavioral significance |
| `CFML returnFormat="PLAIN"` vs `"JSON"` | Serialization detail; the new stack uses JSON consistently |
| `#application.AutoFabServeur#` scoping | CF application scope; the new stack will configure the AutoFab URL differently |
