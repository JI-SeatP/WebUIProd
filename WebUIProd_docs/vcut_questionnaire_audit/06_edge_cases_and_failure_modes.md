# 06 — Edge Cases and Failure Modes

## E1 — INVENTAIRE_C = 10525 hardcode

### Finding
The VCUT-complete block hardcodes `INVENTAIRE_C = 10525` when setting `TJQTEPROD = 1` for the VCUT material item.

### Confidence
Direct

### Evidence
- Source: `QuestionnaireSortie.cfc:1270`
  - Observation: `UPDATE TEMPSPROD SET TJQTEPROD = 1 WHERE INVENTAIRE_C = 10525 AND MODEPROD = ? AND TRANSAC = ? AND cNOMENCOP = ?`

### Notes
- This is a magic number targeting a specific inventory record (the VCUT parent material)
- If the test environment uses a different INSEQ for the VCUT inventory record, this UPDATE will match zero rows — silently doing nothing
- No fallback or error handling if the row is not found

### Porting implication
Determine whether 10525 is environment-specific. If so, the new stack must resolve this dynamically (e.g., from the operation's `INVENTAIRE_P` or `NO_INVENTAIRE` field).

---

## E2 — NO_INVENTAIRE vs PRODUIT_CODE detection inconsistency

### Finding
The VCUT-complete block at `QuestionnaireSortie.cfc:1186` checks only `NO_INVENTAIRE EQ "VCUT"`, while most other VCUT guards check `PRODUIT_CODE EQ "VCUT" OR NO_INVENTAIRE EQ "VCUT"`.

### Confidence
Direct

### Evidence
- Source: `QuestionnaireSortie.cfc:1186`
  - Observation: `<cfif trouveOperation.NO_INVENTAIRE EQ "VCUT">` — single condition
- Source: `QuestionnaireSortie.cfc:54, 83, 340, 708`
  - Observation: All use `PRODUIT_CODE NEQ/EQ "VCUT" AND/OR NO_INVENTAIRE NEQ/EQ "VCUT"` — dual condition

### Notes
- An operation where `PRODUIT_CODE = "VCUT"` but `NO_INVENTAIRE != "VCUT"` would:
  - ✅ Skip defect section (line 54)
  - ✅ Show material exit (line 83)
  - ✅ Skip changeTEMPSPROD (line 708)
  - ❌ Miss the VCUT-complete block (line 1186) — would fall through to the generic cNOMENCOP update at line 1176
- In practice this may not occur if both fields are always set consistently for VCUT operations

### Porting implication
Use a single unified detection check in the new stack. Verify with production data whether operations exist where only one of the two fields is "VCUT".

---

## E3 — QTE_FORCEE = 0 or NULL fallback

### Finding
When `@QTE_FORCE@` returns 0 or NULL for a VCUT operation, the view falls back to `@TOTAL_BIGSHEET@`.

### Confidence
Direct

### Evidence
- Source: `vEcransProduction.sql:144`
  - Observation: `CASE WHEN ISNULL(AUTOFAB_FctSelectVar(T.TRSEQ, CNOP.NOPSEQ, '@QTE_FORCE@'), 0) = 0 THEN AUTOFAB_FctSelectVar(T.TRSEQ, NULL, '@TOTAL_BIGSHEET@') ELSE ... END`

### Notes
- If BOTH `@QTE_FORCE@` and `@TOTAL_BIGSHEET@` are 0 or NULL, `QTE_FORCEE` would be 0
- At `QuestionnaireSortie.cfc:1124`, `LaQteTotale` would be 0, and `LaQteTotale - LeTJQTEPROD` would be negative, triggering the VCUT-complete block immediately regardless of actual production
- This is a potential premature-completion edge case

### Porting implication
Guard against `QTE_FORCEE = 0`. Either prevent the complete block from firing when `QTE_FORCEE <= 0`, or ensure `QTE_FORCEE` is always populated for VCUT operations.

---

## E4 — Auto-STOP→COMP promotion suppressed

### Finding
For non-VCUT operations, when the quantity threshold is reached during a STOP, the system auto-promotes to COMP. VCUT is explicitly excluded.

### Confidence
Direct

### Evidence
- Source: `QuestionnaireSortie.cfc:1130`
  - Observation: `<cfif (val(LaQteTotale) - val(LeTJQTEPROD)) LTE 0 AND arguments.Statut EQ 'STOP' AND trouveOperation.NO_INVENTAIRE NEQ "VCUT">`

### Notes
- VCUT uses only `NO_INVENTAIRE` for this guard (not the combined OR with `PRODUIT_CODE`)
- This means a VCUT STOP always stays STOP — the worker must explicitly choose COMP
- This is intentional: VCUT completion involves the per-component cNOMENCOP update loop which should only run when the worker confirms completion

### Porting implication
Do not auto-promote VCUT STOP to COMP. The worker must explicitly select COMP status.

---

## E5 — Batch SM quantity uses MAX not SUM

### Finding
VCUT SM batch quantity is computed as `MAX(TJQTEPROD)` across all TEMPSPROD rows in `ListeTJSEQ`, not `SUM`.

### Confidence
Direct

### Evidence
- Source: `SortieMateriel.cfc:1706-1718`
  - Observation: `SELECT MAX(TJQTEPROD) AS TotalQteVCUT, MAX(TJQTEDEFECT) AS TotalDefVCUT FROM TEMPSPROD WHERE TJSEQ IN (<ListeTJSEQ>) AND MODEPROD_MPCODE = 'PROD'`
- Source: `SortieMateriel.cfc:864-876`
  - Observation: The recalc guard `qMaxTotalProduitVCUT` also uses `MAX(TJQTEPROD + TJQTEDEFECT)` to prevent ratio inflation

### Notes
- Using SUM would double-count because each component's quantity represents the same physical sheets being cut
- MAX correctly represents the number of big sheets processed, which is the material consumption unit

### Porting implication
Always use MAX (not SUM) for VCUT batch SM quantities. This is a semantic choice, not a bug.

---

## E6 — SM recalc zero-protection

### Finding
When the weighted-ratio SM recalc produces `QTE_CIBLE = 0` or the ratio is not found, the SM quantity update is skipped entirely.

### Confidence
Direct

### Evidence
- Source: `SortieMateriel.cfc:1121-1131`
  - Observation: `<cfif QTE_CIBLE GT 0>` gate before the UPDATE statements. If QTE_CIBLE is 0 or negative, no update occurs.

### Notes
- This prevents zeroing out an SM when the BOM ratio cannot be resolved (e.g., `cNOMENCLATURE` child rows are missing or have `NIQTE = 0`)
- The existing SM quantity is preserved as-is in this case

### Porting implication
Replicate the zero-protection: do not update SM quantity when the computed target is 0 or negative.

---

## E7 — verifieStatutSortie double-dot typo

### Finding
The validation function contains a double-dot struct access: `trouveOPERATIONPARTRANSAC..ENTREPF`.

### Confidence
Direct

### Evidence
- Source: `QuestionnaireSortie.cfc:2475`
  - Observation: `trouveOPERATIONPARTRANSAC..ENTREPF` — ColdFusion struct access with double-dot

### Notes
- In ColdFusion, `struct..key` evaluates the same as `struct.key` — the extra dot is ignored
- This is a typo in the source, not a runtime error
- The logic works correctly despite the typo

### Porting implication
None — this is cosmetic. Use single-dot/bracket notation in the new stack.

---

## E8 — Cancel without write-as-you-go artifacts

### Finding
If the worker opens the questionnaire and immediately cancels without adding any EPFs or SMs, the `ListeEPFSEQ`, `ListeTJSEQ`, `ListeSMSEQ`, and `SMNOTRANS` may all be empty.

### Confidence
Strong inference

### Evidence
- Source: `QuestionnaireSortie.cfc:314-597`
  - Observation: The cancel function iterates over `ListeTJSEQ`, `ListeSMSEQ`, `ListeEPFSEQ` — if these are empty, the loops execute zero iterations
  - The reset at line 580 still fires on the original TJSEQ

### Notes
- The cancel function is safe in this case — it simply resets the original TEMPSPROD row
- No special guard is needed for empty lists

### Porting implication
The cancel endpoint should handle empty artifact lists gracefully (no-op loops).

---

## E9 — Partial submit failure

### Finding
There are no explicit transaction boundaries wrapping the submit flow. A failure at any step leaves partial state.

### Confidence
Direct

### Evidence
- Source: `QuestionnaireSortie.cfc:599-1293`
  - Observation: No `BEGIN TRANSACTION` / `COMMIT` / `ROLLBACK` statements
- Source: `support.cfc:3502`
  - Observation: 2-second `sleep(2000)` between AutoFab SOAP calls — each call is independent

### Notes
- If `EPF/REPORT` succeeds but `SM/REPORT` fails, the EPFs are posted but the SM is not
- If the VCUT-complete block partially executes (e.g., cNOMENCOP updated but TEMPSPROD not), the operation is in an inconsistent state
- The legacy system relies on the worker retrying or the admin manually fixing inconsistencies

### Porting implication
Consider whether the new stack should wrap the submit in a transaction. If using AutoFab SOAP calls (inherently non-transactional), document the partial-failure risk and recovery strategy.

---

## E10 — TYPEPRODUIT EQ 17 vs PRODUIT_CODE/NO_INVENTAIRE

### Finding
`ProduitFini.cfc:385` uses `TYPEPRODUIT EQ 17` to set `EstVCUT = 1`, which controls the CNOMENCLATURE-based product list query. The broader VCUT detection (`PRODUIT_CODE`/`NO_INVENTAIRE`) controls SM/EPF flow.

### Confidence
Direct

### Evidence
- Source: `ProduitFini.cfc:385`
  - Observation: `<cfif trouveOperation.TYPEPRODUIT EQ 17>` → `EstVCUT = 1`
- Source: `ProduitFini.cfc:46`
  - Observation: `<cfif trouveOperation.NO_INVENTAIRE EQ "VCUT" OR trouveOperation.PRODUIT_CODE EQ "VCUT">` → calls `trouveUnTableauVCut`

### Notes
- Both detection paths must agree for the flow to work correctly
- A product with `TYPEPRODUIT = 17` but `PRODUIT_CODE != "VCUT"` would get the CNOMENCLATURE product list but miss the VCUT SM/EPF logic
- In practice, TYPEPRODUIT 17 and PRODUIT_CODE "VCUT" should always co-occur

### Porting implication
Verify with production data that these fields are always consistent. Use a single detection method in the new stack.
