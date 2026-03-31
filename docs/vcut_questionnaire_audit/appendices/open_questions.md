# Appendix: Open Questions

Unresolved questions, contradictions with existing documentation, and recommended follow-up probes.

## Unresolved questions

### Q1 — FctSelectVar internal table

**Question:** What table does `DBO.AUTOFAB_FctSelectVar(TRSEQ, NOPSEQ, '@QTE_FORCE@')` read from internally? How is the variable store keyed (by TRSEQ alone, or TRSEQ + NOPSEQ)?

**Why it matters:** The new stack needs to resolve `QTE_FORCEE` without calling the scalar function (which may not be accessible from a Node.js/Express backend). Understanding the underlying table allows a direct SQL query.

**Evidence so far:**
- `vEcransProduction.sql:144` calls it with TRSEQ + NOPSEQ for `@QTE_FORCE@`, and with TRSEQ + NULL for `@TOTAL_BIGSHEET@`
- `vEcransProduction.sql:39` comment: "QTE_FORCEE vient de la quantité forcée ou du total de QTE_BIGSHEET si forcée est null ou 0"
- A comment in `VSP_BonTravail_Entete.sql` mentions "Optimisation, changement des FctSelectVar pour des SELECTs directement", implying the function reads from a queryable table

**Recommended probe:** Inspect the SQL Server database for the function definition (`sp_helptext 'AUTOFAB_FctSelectVar'`) or search for an AutoFab variable store table (likely named `VARIABLE`, `AUTOFAB_VARIABLE`, or similar).

---

### Q2 — INVENTAIRE_C = 10525 origin

**Question:** Is the hardcoded inventory sequence 10525 environment-specific? Does the test database use the same INSEQ?

**Why it matters:** If this value differs between test and production, the VCUT-complete block will silently fail to update the material item row in one environment.

**Evidence so far:**
- `QuestionnaireSortie.cfc:1270` — hardcoded in the UPDATE WHERE clause
- No configuration, variable, or dynamic lookup resolves this value

**Recommended probe:** Query `SELECT INSEQ, INNOINV, INDESC1 FROM INVENTAIRE WHERE INSEQ = 10525` in both test and production databases. Also check if this is the VCUT parent material record.

---

### Q3 — PRODUIT_CODE-only VCUT operations

**Question:** Do operations exist in production where `PRODUIT_CODE = "VCUT"` but `NO_INVENTAIRE != "VCUT"`?

**Why it matters:** The VCUT-complete block (line 1186) only checks `NO_INVENTAIRE`. Such operations would miss the completion logic.

**Evidence so far:** Both detection fields are set from `vEcransProduction` which derives them from different sources. No evidence that they always agree.

**Recommended probe:** Query production database: `SELECT COUNT(*) FROM vEcransProduction WHERE PRODUIT_CODE = 'VCUT' AND NO_INVENTAIRE != 'VCUT'`

---

### Q4 — AutoFab SOAP downstream effects

**Question:** What does AutoFab do internally when processing `EPF/REPORT` and `SM/REPORT` transactions? Are there inventory adjustments, cost postings, or other side effects?

**Why it matters:** The CFC code treats AutoFab SOAP calls as opaque — it sends parameters and checks `retval`. The new stack must produce the same downstream effects.

**Evidence so far:** `support.cfc::envoiXMLGet` sends SOAP XML and parses the response struct. The response `retval` is checked for success. No documentation of AutoFab's internal processing.

**Recommended probe:** Review AutoFab server documentation or inspect AutoFab logs after a VCUT questionnaire submit.

---

### Q5 — SMNOTRANS 9-character truncation

**Question:** Why is `SMNOTRANS` truncated to 9 characters via `Left(..., 9)` in some operations?

**Why it matters:** If the SP returns a longer transaction number, truncation could cause mismatches in subsequent lookups.

**Evidence so far:** `QuestionnaireSortie.cfc` cancel flow uses `Left(SMNOTRANS, 9)` when building DELETE queries.

**Recommended probe:** Check the `SORTIEMATERIEL.SMNOTRANS` column definition (length, type) and whether `Nba_Sp_Insert_Sortie_Materiel` ever returns values longer than 9 characters.

---

## Contradictions with existing docs/vcut/

### C1 — Nba_ReporteUnTransac usage claim

**Existing docs:** `docs/vcut/09-database-tables.md` line 130 states "Both use `Nba_ReporteUnTransac` to post (set `TRPOSTER = 1`)".

**Audit finding:** `Nba_ReporteUnTransac` does **not appear anywhere** in the CFC questionnaire source files — not for VCUT, and not for non-VCUT either. A grep for `ReporteUnTransac` (case-insensitive) across all files in `src/old/EcransSeatPly/cfc/` returns **zero matches**. The only similar function is `Nba_ReporteLesTransac` in `support.cfc:3258`, used for warehouse transfers (unrelated to questionnaire submission).

Both VCUT and non-VCUT use the same posting mechanism: `EXECUTE_TRANSACTION EPF/REPORT` via AutoFab SOAP, called through `QuestionnaireSortie.cfc::ReportEntreeProduitFini` (lines 2115-2143). SM posting uses `EXECUTE_TRANSACTION SM/REPORT` via `ReportSortieMateriel` (lines 1743-1785).

**Note:** `docs/vcut/07-submit-flow.md` line 129 correctly states that both use AutoFab SOAP, contradicting `docs/vcut/09-database-tables.md` within the same doc set.

**Impact:** The `docs/vcut/09-database-tables.md` claim about `Nba_ReporteUnTransac` is a factual error. The new submit endpoint should use AutoFab SOAP `EXECUTE_TRANSACTION` for all EPF and SM posting.

---

### C2 — Cancel flow backend undocumented

**Existing docs:** `docs/vcut/08-cancel-flow.md` documents the frontend `handleCancel()` and `cancelQuestionnaire.cfm` endpoint but does not document what the backend does (which tables it cleans up, in what order, with what guards).

**Audit finding:** The cancel flow is fully traced in this audit at [03_execution_paths.md Flow E](../03_execution_paths.md#flow-e--cancel). It deletes TEMPSPRODEX, TEMPSPROD (non-KeepTJSEQ), DET_DEFECT, SORTIEMATERIEL, TRANSAC, DET_TRANS, ENTRERPRODFINI, and resets the surviving PROD row.

**Impact:** The `cancelQuestionnaire.cfm` endpoint must implement the full cleanup sequence with the VCUT KeepTJSEQ guard.

---

### C3 — Missing table schemas

**Existing docs:** `docs/vcut/09-database-tables.md` documents 7 tables.

**Audit finding:** Additional tables/views are used but not documented there:
- `SORTIEMATERIEL` (SM header — read and written)
- `COMMANDE` (joined in SM creation queries)
- `VOperationParTransac` (view — ENTREPF, UtiliseInventaire)
- `vEcransProduction` (view — QTE_FORCEE, PRODUIT_CODE, NO_INVENTAIRE)
- `VSP_BonTravail_Entete` (view — work order header)
- `PARA_CIE` (company parameters — referenced in EPF creation)
- `TableSequence` (sequence generation — referenced in EPF creation)
- `PL_RESULTAT` (operation results — PR_TERMINE, PR_DEBUTE)
- `DET_DEFECT` (defect details — deleted on cancel)
- `TEMPSPRODEX` (stop cause extension)

---

### C4 — QuestionnairePage detection inconsistency

**Existing docs:** `docs/vcut/01-overview.md` notes three detection conditions.

**Audit finding:** `QuestionnairePage.tsx:274` only checks `NO_INVENTAIRE === "VCUT"` and `fmcode === "TableSaw"`. It omits the `PRODUIT_CODE === "VCUT"` check that is present in `OperationDetailsPage.tsx:36`. This is noted in the existing docs but not flagged as a gap requiring action.

**Impact:** An operation detected by `PRODUIT_CODE` only would show VCUT layout on the operation details page but standard layout on the questionnaire page.

---

### C5 — AutoFab REPORT param inconsistency

**Existing docs:** `docs/vcut/10-stored-procedures.md` shows `'NomEmploye'` as the 4th param in `EPF/REPORT`. `docs/vcut/07-submit-flow.md` shows `'WebUI New'`.

**Audit finding:** The actual param value depends on the employee name resolved at runtime. Both docs are simplified representations. The CFC code at `QuestionnaireSortie.cfc` constructs the param string dynamically using the current employee's name.

---

### C6 — SM doc step numbering

**Existing docs:** `docs/vcut/06-sm-transaction.md` has two "Step 6" entries, no "Step 7", and jumps to "Step 8".

**Impact:** Editorial — numbering should be corrected for clarity.

---

## Recommended follow-up actions

1. Run Q1-Q3 queries against production database to close the highest-priority gaps
2. Update `docs/vcut/09-database-tables.md` to correct the `Nba_ReporteUnTransac` claim (C1)
3. Update `docs/vcut/08-cancel-flow.md` with the backend cleanup sequence from this audit (C2)
4. Add missing table schemas to `docs/vcut/09-database-tables.md` (C3)
5. Fix step numbering in `docs/vcut/06-sm-transaction.md` (C6)
6. Align `QuestionnairePage.tsx` VCUT detection with `OperationDetailsPage.tsx` (C4)
