# Appendix: Open Questions

## OQ1: Stored procedure internals are unknown

**Status:** Resolved — use as-is

**Description:** The four stored procedures called by the legacy CF path (`Nba_Corrige_Quantite_Transaction`, `Nba_Sp_Update_Production`, `Nba_Recalcul_Un_Produit_EnCours`) and the table-valued function (`FctCalculTempsDeProduction`) are encrypted server-side SQL objects. Their internal SQL is not available in the repository.

**Resolution:** Call these SPs with the exact same parameters in the exact same order as the old software. The new implementation uses direct mssql `EXEC` instead of SOAP, but parameter signatures and ordering must match exactly. No need to understand internal SP logic.

---

## OQ2: Two parallel correction code paths exist

**Status:** Resolved — use legacy multi-SP approach

**Description:** The legacy ColdFusion path calls four separate SPs/functions sequentially. A newer `Nba_Corrige_Production` SP exists but uses a different approach.

**Resolution:** Use the exact same flow and functions as the old software. The existing React backend at `server/api.cjs` (`POST /submitCorrection.cfm`) has already chosen the legacy multi-SP approach. This is correct — do NOT use `Nba_Corrige_Production`.

---

## OQ3: Exact SP call patterns — fully traced

**Status:** Resolved

**Description:** Deep trace of all SP calls in `CorrectionInventaire.cfc::CorrigeProduction` now complete.

### `Nba_Corrige_Quantite_Transaction` — exact parameters

Called for each changed EPF row and each changed SM row (only when `MODEPROD_MPCODE = "PROD"`):

| Position | Type | Value |
|----------|------|-------|
| 1 | int | `DTRSEQ` — PK of the DET_TRANS row being corrected |
| 2 | float | New quantity from form (`form.DTRQTE_PF_<DTRSEQ>` or `form.DTRQTE_SM_<DTRSEQ>`) |
| 3 | varchar(30) | `session.InfoClient.NOMEMPLOYE` truncated to 30 chars |

**Output values:** `retval` (error message or empty), `OutputValues.MSG_EQUATE`, `OutputValues.ERREUR`

**Only called in:** `CorrectionInventaire.cfc` — no other CFC uses this SP.

### `Nba_Sp_Update_Production` — exact 20-parameter signature

**Call 1 (current TEMPSPROD row — always):**

| # | Value | Origin |
|---|-------|--------|
| 1 | `val(arguments.TJSEQ)` | TEMPSPROD PK |
| 2 | `val(trouveEmploye.EMSEQ)` | Resolved from `form.CodeEmploye_<TJSEQ>` via EMPLOYE table |
| 3 | `val(form.Operation_<TJSEQ>)` | Operation select field |
| 4 | `val(form.Machine_<TJSEQ>)` | Machine select field |
| 5 | `val(CeTEMPSPROD.TRANSAC)` | From TEMPSPROD row |
| 6 | `''` | Empty placeholder |
| 7 | `''` | Empty placeholder |
| 8 | `val(CeTEMPSPROD.CNOMENCLATURE)` | From TEMPSPROD row |
| 9 | `val(CeTEMPSPROD.INVENTAIRE_C)` | From TEMPSPROD row |
| 10 | `1` | Hardcoded flag |
| 11 | `0` | Hardcoded flag |
| 12 | `val(LaQteBonProduit)` | Sum of EPF form fields, or `arguments.QteBonne` if no EPF, or 0 if SETUP |
| 13 | `val(LaQteDefectueux)` | `arguments.QteDefectueux` (total defect qty) |
| 14 | `DateFormat(form.DateDebut_<TJSEQ>, 'yyyy-mm-dd')` | Start date |
| 15 | `TimeFormat(form.DateDebut_<TJSEQ>, 'HH:nn:ss')` | Start time |
| 16 | `DateFormat(form.DateFin_<TJSEQ>, 'yyyy-mm-dd')` | End date |
| 17 | `TimeFormat(form.DateFin_<TJSEQ>, 'HH:nn:ss')` | End time |
| 18 | `Left(CeTEMPSPROD.MODEPROD_MPCODE, 5)` | Mode code |
| 19 | `'Correction temps prod avec Ecran de production'` | Hardcoded note (use " New" suffix in new code) |
| 20 | `left(CeTEMPSPROD.SMNOTRANS, 9)` | SM transaction number |

**Call 2 (next TEMPSPROD row — only if exists):** Same structure but:
- Params 1-5: From `trouveProchainStatut` (next row), not current row
- Param 9: Still `CeTEMPSPROD.INVENTAIRE_C` (current row — intentional)
- Params 12-13: Next row's existing quantities (unchanged)
- Params 14-15: **Current row's end time** (this is the cascade mechanism)
- Params 16-17: Next row's existing end time (or empty if not a valid date)
- Params 18, 20: From next row

---

## OQ4: Material outing — separate codeaudit required

**Status:** In progress — separate audit

**Resolution:** Material outing (SortieMateriel) requires its own `/codeaudit` because it is a crucial element. The new software must use the exact same logic as the old software. See `docs/S010_material_outing/` (audit in progress).

**Key finding from corrections context:** In the correction screen, `DTRQTE_SM_<DTRSEQ>` fields are `type="hidden"` (not user-editable). The old software computes SM quantities server-side and submits them as hidden fields. Changes to SM quantities trigger `Nba_Corrige_Quantite_Transaction` which internally calls `Nba_Execute_Ceiling` per inventory item.

---

## OQ5: `EstVCUT` flag — dead code in corrections, active elsewhere

**Status:** Resolved

**Description:** `EstVCUT` is used in multiple places across the old software, but is **dead code specifically in `CorrigeProduction`**.

### Where `EstVCUT` IS actively used:
1. **`ProduitFini.cfc:388-415`** — Set to 0/1 based on `CNOMENCLATURE.INVENTAIRE_P_INNOINV = 'VCUT'`; emitted into HTML `onclick` for `AjouteModifieEPFQS()`.
2. **`sp_js.cfm:1562` (`AjouteModifieEPFQS`)** — Controls which DOM input IDs to read (VCUT uses NISEQ-qualified elements).
3. **`sp_js.cfm:1985` (`CorrigeProduction`)** — Forwarded verbatim to CFC via URL parameter.

### Where `EstVCUT` is NOT used:
4. **`CorrectionInventaire.cfc:203`** — Declared and logged but **never referenced** in active code. The commented-out ceiling block (lines 304-308) was superseded by `Nba_Execute_Ceiling` inside the SP.

### VCUT ceiling logic history:
- The CF-level `ceiling()` for VCUT was commented out when ceiling responsibility moved into `Nba_Execute_Ceiling` (called inside `Nba_Corrige_Quantite_Transaction`).
- `Nba_Execute_Ceiling` applies ceiling per inventory item inside the SP, independent of `EstVCUT` flag.

**Porting decision:** Replicate exactly as the old software works:
- Pass `EstVCUT` from the UI to the backend (for logging/compatibility)
- Do NOT implement CF-level ceiling on SM quantities (it's commented out in old software)
- The SP handles ceiling internally via `Nba_Execute_Ceiling`

---

## OQ6: Dictionary labels from Excel file

**Status:** Resolved — not applicable

**Resolution:** The Excel-based dictionary approach will NOT be used. The current React i18n approach is better and more performant.

---

## OQ7: Note field ternary bug

**Status:** Resolved — already fixed

**Description:** The old JS has a reversed ternary that makes the note effectively dead code. The CFC uses a hardcoded note: `'Correction temps prod avec Ecran de production'`.

**Resolution:** The new backend (`server/api.cjs`) already uses `"Correction temps prod avec Ecran de production New"` (lines 4669, 4759) — the " New" suffix is already applied to distinguish new vs old software origin.

---

## OQ8: Defect row insert/update path

**Status:** Resolved — defects are saved independently via AJAX

**Finding:** Defect rows are **saved to `DET_DEFECT` immediately and individually via their own AJAX calls**, completely independently of `CorrigeProduction`.

### How it works in the old software:

1. **Per-row save:** Each defect row has its own OK button that fires `AjouteModifieDetailDEFECT()` (JS at `sp_js.cfm:1433`), which makes an independent AJAX GET to `QteDefect.cfc::AjouteModifieDetailDEFECT` with `DDSEQ, Qte, Raison, Note`.

2. **CFC writes directly to DET_DEFECT:**
   - If `DDSEQ` has no match → `INSERT INTO DET_DEFECT` (`QteDefect.cfc:692-713`)
   - If `DDSEQ` exists → `UPDATE DET_DEFECT SET DDQTEUNINV=..., RAISON=...` (`QteDefect.cfc:717-727`)
   - After each INSERT/UPDATE → re-sum all `DET_DEFECT.DDQTEUNINV` for the TJSEQ and write `UPDATE TEMPSPROD SET TJQTEDEFECT = <sum>` (`QteDefect.cfc:729-738`)

3. **On submit (CorrigeProduction):** Only reads the pre-computed total `POP_TJQTEDEFECT` (hidden field). Passes it as `QteDefectueux` (position 13) to `Nba_Sp_Update_Production`. Does NOT read any per-row `POP_DEF_DDQTEUNINV_N` or `POP_RAISON_N` fields.

### DET_DEFECT columns written on INSERT:
`TRANSAC, INVENTAIRE, MACHINE, EMPLOYE, DDQTEUNINV, DDDATE, RAISON, DDNOTE, DDVALEUR_ESTIME_UNITAIRE, DDVALEUR_ESTIME_TOTALE, TEMPSPROD, TRANSAC_PERE`

### Porting implication:
The new React UI must save defects individually (per-row AJAX) before the user taps OK, not batch them in the CorrigeProduction submit. The existing `server/api.cjs:submitCorrection.cfm` currently handles defects inline — this diverges from the old software where defects are saved immediately as the user enters them.
