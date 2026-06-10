# 06 - Edge Cases and Failure Modes

## Validation failures

### No explicit validation
- **Finding:** `CorrigeProduction` performs no input validation before executing writes. Form values are consumed directly via `val()` (which returns 0 for non-numeric strings) and `evaluate()`.
- **Confidence:** Direct — no `<cfif>` guards on input values exist in the method
- **Porting implication:** The new UI should add client-side validation (positive quantities, valid dates, employee exists, etc.)

### Employee not found
- **Source:** `CorrectionInventaire.cfc:353-357`
- **Risk:** If `trouveEmploye` returns 0 rows, `trouveEmploye.EMSEQ` will be empty, and `val()` will produce 0
- **Effect:** `Nba_Sp_Update_Production` will be called with `EMSEQ=0`
- **Confidence:** Direct — no RecordCount check exists

## Guard clauses

### SETUP mode guard
- **Source:** `CorrectionInventaire.cfc:225`
- **Guard:** `CeTEMPSPROD.MODEPROD_MPCODE EQ "PROD"` gates all quantity-correction logic
- **Effect:** SETUP mode rows only get date/employee/operation/machine corrections
- **Confidence:** Direct

### No EPF rows guard
- **Source:** `CorrectionInventaire.cfc:234`
- **Guard:** `trouveProduitsFinis.RecordCount EQ 0`
- **Effect:** Falls back to simple `QteBonne` instead of per-row EPF corrections
- **Confidence:** Direct

### form.DTRQTE_PF_ / form.DTRQTE_SM_ existence check
- **Source:** `CorrectionInventaire.cfc:242`, `300`
- **Guard:** `IsDefined('form.DTRQTE_PF_#DTRSEQ#')` and `isDefined('form.DTRQTE_SM_#DTRSEQ#')`
- **Effect:** Only processes rows whose form fields were actually submitted
- **Confidence:** Direct

### Value-unchanged guard
- **Source:** `CorrectionInventaire.cfc:245`, `301`
- **Guard:** `evaluate('form.DTRQTE_PF_#DTRSEQ#') NEQ DTRQTE` (and similarly for SM)
- **Effect:** SP is only called for rows where the quantity actually changed
- **Confidence:** Direct

## Partial-update risks

### No transaction wrapper
- **Finding:** All writes in `CorrigeProduction` execute sequentially without a `<cftransaction>` block
- **Risk:** If any SOAP call fails (network error, SP error), earlier writes have already committed
- **Example scenario:** EPF corrections succeed, but `Nba_Sp_Update_Production` fails → DET_TRANS rows are updated but TEMPSPROD is not
- **Confidence:** Direct — no `<cftransaction>` tags in the method

### 2-second sleep per SOAP call
- **Source:** `support.cfc` — `sleep(2000)` after each `cfhttp` POST
- **Risk:** With N changed rows, total time = `(N_EPF + N_SM + 2 or 3) * 2 seconds` minimum
- **Example:** 5 EPF changes + 3 SM changes + 3 base calls = 22+ seconds
- **Porting implication:** The new implementation should not replicate this sleep; it was likely a workaround for server timing

### Error accumulation without abort
- **Source:** `CorrectionInventaire.cfc:274-276, 337-339, 388-390`
- **Behavior:** Errors from SP calls are appended to `ResultatTout` with `<br>` separator but execution continues
- **Effect:** All corrections are attempted even if early ones fail
- **Confidence:** Direct

## Contradictory or surprising behavior

### JS ternary bug in Note handling
- **Source:** `sp_js.cfm:1990`
- **Code:** `LaNote = LaNote == '' ? 'Correction Inventaire et temps prod avec Ecran de production' : '';`
- **Bug:** When Note is empty → LaNote becomes the default string. When Note has content → LaNote becomes empty string. This is backwards from the likely intent.
- **Effect:** The note value is never actually sent to the server as user-typed content
- **Confidence:** Direct

### Close button commented out
- **Source:** `CorrectionInventaire.cfc:184-186`
- **Effect:** The `btnFERMER_MOYEN` (close/cancel) button HTML is commented out. The `RetireCorrections` function exists but has no visible trigger in the correction form.
- **Implication:** Users cannot cancel from within the correction screen via button. They must use browser back or other navigation.
- **Confidence:** Direct

### DTRQTE_SM fields are hidden (not user-editable)
- **Source:** `SortieMateriel.cfc:155-156`
- **Finding:** Material-exit quantities are `type="hidden"`, meaning the user cannot change them directly in the form
- **Effect:** SM corrections only happen if the server-side rendered value differs from the DB value (unlikely), or if JavaScript modifies the hidden field
- **Confidence:** Direct

### `EstVCUT` parameter passed but unused in CorrigeProduction
- **Source:** `CorrectionInventaire.cfc:203`
- **Finding:** `EstVCUT` is declared as a parameter but never referenced in the method body after the log statement
- **Effect:** The VCUT flag has no impact on the correction logic, despite being passed from the UI
- **Confidence:** Direct — grep of method body shows no usage beyond line 205

## Dead-end states

### No recovery from SP failure
- If `Nba_Sp_Update_Production` fails, the TEMPSPROD row may be in an inconsistent state
- No retry mechanism exists
- The user would need to open the correction screen again and re-submit

## Retry paths

None. There are no automatic retry mechanisms in the correction flow.
