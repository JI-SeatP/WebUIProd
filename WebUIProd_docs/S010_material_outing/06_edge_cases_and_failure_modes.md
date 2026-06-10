# 06 - Edge Cases and Failure Modes

## OUTER APPLY TRPOSTER discrepancy

- **Display query** (`afficheListeSortieMateriel:115`): includes `TR.TRPOSTER = 1` — only counts posted correction children
- **Recalculation query** (`calculeQteSM:763`): omits TRPOSTER filter — counts all correction children
- **Impact:** During an active session, recalculated value may include unposted corrections while initial display value did not
- **Confidence:** Direct — two different WHERE clauses observed

## Submit comparison asymmetry

- **`CorrigeProduction`** compares `form.DTRQTE_SM_<DTRSEQ>` against raw `DTRQTE` (no OUTER APPLY)
- If a prior correction exists, the hidden field holds the corrected value, which differs from raw `DTRQTE`
- **Effect:** SP fires every submit for rows with existing corrections, even if no user change occurred
- **Impact:** Redundant SP calls but functionally correct (SP is idempotent for same values)

## Zero-quantity SM handling (QS path)

- **Source:** `SortieMateriel.cfc:307-397`
- When total produced = 0, the QS path:
  1. Checks if SM has DET_TRANS rows
  2. If no DET_TRANS → deletes the SORTIEMATERIEL header
  3. Clears `TEMPSPROD.SMNOTRANS` for the affected rows
- **Guard:** Will NOT delete SM if it has existing DET_TRANS rows

## Missing DET_TRANS rows (insufficient stock)

- **Source:** `SortieMateriel.cfc:41-88` (`_renderDetailsSMTable`)
- When SM exists but DET_TRANS has NULL `DTRSEQ` → renders row with pink background and "INSUFFISANT" message
- **Cause:** Stock was insufficient when `Nba_Sp_Sortie_Materiel` ran; lot selection loop exhausted available inventory

## BOM ratio = 0

- **Source:** `SortieMateriel.cfc:646`
- If `trouveRatio.NIQTE = 0` → displays "Aucune Matière" (no material) message
- No SM withdrawal is computed for this material

## `TotalQte` undefined in `CorrigeQteSM`

- **Source:** `SortieMateriel.cfc:1460`
- `TotalQte` is referenced in UPDATE TRANSAC but never set inside the function
- **Potential bug:** Relies on ColdFusion's variable scoping leaking from outer/arguments scope

## Tripled normalization block

- **Source:** `SortieMateriel.cfc:882-942`
- `qSMNoFromSMSEQ` / `qSMNoFromTRSEQ` is executed identically 3 times in `calculeQteSMQS`
- Only the third execution's result survives — copy/paste artifact

## VCUT MAX vs SUM

- **Source:** `SortieMateriel.cfc:865-875`
- VCUT uses `MAX(TJQTEPROD + TJQTEDEFECT)` across batch, not SUM
- **Reason:** Prevents double-counting when multiple TEMPSPROD rows exist for the same batch
- **Porting risk:** Using SUM instead of MAX would over-withdraw material for VCUT operations
