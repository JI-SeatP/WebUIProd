# 07 - Porting Invariants

## Required behavioral invariants

### I1: SETUP mode must only allow time/employee/operation/machine corrections
- **Evidence:** `CorrectionInventaire.cfc:63-109` (display) and `225` (submit)
- **Rule:** When `MODEPROD_MPCODE = "SETUP"`, defect quantities, good quantities, finished products, and material exits must not be editable or submitted
- **Criticality:** High — submitting quantity corrections for SETUP rows would corrupt data

### I2: Per-row quantity corrections must only fire for actually-changed values
- **Evidence:** `CorrectionInventaire.cfc:245, 301`
- **Rule:** `Nba_Corrige_Quantite_Transaction` must only be called when the new quantity differs from the current `DTRQTE`
- **Criticality:** High — calling the SP with unchanged values may create spurious correction transactions

### I3: Cost recalculation must happen after time/quantity update
- **Evidence:** `CorrectionInventaire.cfc:391-402` (runs after `Nba_Sp_Update_Production`)
- **Rule:** `FctCalculTempsDeProduction` must be called after TEMPSPROD dates/quantities are updated, so costs reflect the corrected values
- **Criticality:** High — reversed ordering would compute costs on stale data

### I4: Next TEMPSPROD row timing cascade
- **Evidence:** `CorrectionInventaire.cfc:425-469`
- **Rule:** When a TEMPSPROD row's end time is changed, the immediately following row (same TRANSAC + CNOMENCOP, next TJSEQ) must have its start time updated to match
- **Criticality:** Medium — prevents time gaps/overlaps in production tracking

### I5: Employee resolution by EMNO
- **Evidence:** `CorrectionInventaire.cfc:353-357`
- **Rule:** The correction form submits `EMNO` (employee number), which must be resolved to `EMSEQ` (employee PK) before calling `Nba_Sp_Update_Production`
- **Criticality:** Medium

### I6: Finished-product decision based on ENTREPF and DET_TRANS existence
- **Evidence:** `CorrectionInventaire.cfc:82`
- **Rule:** Show simple good-quantity field when `trouveOPERATIONPARTRANSAC.ENTREPF = 0` OR finished-product DET_TRANS rows don't exist; otherwise show per-row EPF editing
- **Criticality:** High — determines which quantity-correction path executes on submit

### I7: cNOMENCOP.NOPQTESCRAP must reflect aggregate defect total
- **Evidence:** `CorrectionInventaire.cfc:283-287`
- **Rule:** The scrap quantity on the nomenclature-operation record must be updated to the sum of all defect quantities across TEMPSPROD rows for that operation (not just the current row's defects)
- **Note:** The value written is `LeTJQTEDEFECT` which comes from the aggregate query at lines 213-219
- **Criticality:** High

## Timing / ordering invariants

### O1: Write order must be preserved
```
1. EPF row corrections (Nba_Corrige_Quantite_Transaction per row)
2. cNOMENCOP.NOPQTESCRAP update
3. SM row corrections (Nba_Corrige_Quantite_Transaction per row)
4. TEMPSPROD update (Nba_Sp_Update_Production)
5. TEMPSPROD cost recalculation (FctCalculTempsDeProduction)
6. Encours recalculation (Nba_Recalcul_Un_Produit_EnCours)
7. Next TEMPSPROD cascade (Nba_Sp_Update_Production)
```
- **Criticality:** Medium — cost recalculation (5-6) must come after time update (4), but other orderings may be flexible

### O2: Each SP call is synchronous
- The legacy code calls SPs sequentially with a 2-second sleep between each. The new implementation need not include the sleep but must ensure each SP completes before the next begins (especially for cost recalculation).

## Data-shape invariants

### D1: `Nba_Corrige_Quantite_Transaction` parameter format
```
DTRSEQ (int), new_qty (float), username (varchar max 30)
```
- Username is truncated to 30 chars: `left(session.InfoClient.NOMEMPLOYE, 30)`

### D2: `Nba_Sp_Update_Production` parameter format (20 positional params)
```
TJSEQ (int), EMSEQ (int), OPERATION (int), MACHINE (int), TRANSAC (int),
'' (string), '' (string),
CNOMENCLATURE (int), INVENTAIRE_C (int),
1 (int flag), 0 (int flag),
TJQTEPROD (float), TJQTEDEFECT (float),
DateDebut (string 'yyyy-mm-dd'), HeureDebut (string 'HH:nn:ss'),
DateFin (string 'yyyy-mm-dd'), HeureFin (string 'HH:nn:ss'),
MODEPROD_MPCODE (string max 5),
Note (string),
SMNOTRANS (string max 9)
```

### D3: `Nba_Recalcul_Un_Produit_EnCours` parameter format
```
TRANSAC (int), 0 (int)
```

### D4: `FctCalculTempsDeProduction` is a table-valued function
- Input: `TJSEQ (int)`
- Output columns: `TJSEQ, CALCSYSTEMPSHOMME, CALCTEMPSHOMME, CALCEMCOUT, CALCOPCOUT, CALCMACOUT`

### I8: Defect rows must be saved individually and immediately
- **Evidence:** `QteDefect.cfc:645-741`, `sp_js.cfm:1433-1465`
- **Rule:** Each defect row INSERT/UPDATE must happen via its own API call when the user saves that row, NOT batched in the CorrigeProduction submit
- **Reason:** `CorrigeProduction` only reads the pre-computed total `POP_TJQTEDEFECT`; it does NOT process per-row defect data
- **Criticality:** High — the existing `server/api.cjs:submitCorrection.cfm` currently handles defects inline, which diverges from the old software

### I9: EstVCUT must be passed but NOT used for CF-level ceiling
- **Evidence:** `CorrectionInventaire.cfc:304-308` (commented out), `Nba_Execute_Ceiling` in SP
- **Rule:** Pass `EstVCUT` from UI to backend for logging/compatibility. Do NOT implement ceiling rounding in application code. The SP `Nba_Corrige_Quantite_Transaction` handles ceiling internally via `Nba_Execute_Ceiling` per inventory item.
- **Criticality:** Medium — implementing ceiling in application code would double-round quantities

### I10: Note must include " New" suffix
- **Evidence:** User directive
- **Rule:** The correction note string must be `"Correction temps prod avec Ecran de production New"` to distinguish new UI from old
- **Criticality:** Low — already applied in `server/api.cjs:4669,4759`

## State-machine invariants

- The correction screen does not manage a state machine. It is a one-shot form:
  - Open → Edit → Submit → Return to time tracking
  - Open → Cancel → Return to time tracking (no server call)

## Incidental implementation details (should NOT be replicated)

### Do NOT replicate
1. **2-second sleep per SOAP call** — artifact of legacy SOAP timing, not a business requirement
2. **HTML string assembly** — the legacy code builds HTML server-side; the new React UI renders client-side
3. **`evaluate('form.XXX_#ID#')` pattern** — ColdFusion dynamic variable access; use proper data structures
4. **Error accumulation without abort** — consider using transactions or atomic operations instead
5. **Note ternary bug** — `sp_js.cfm:1990` has reversed logic; do not replicate
6. **Close button commented out** — the new UI should have a working cancel button
7. **Material-exit hidden fields** — consider making SM quantities visible/editable if business requires
8. **`EstVCUT` parameter** — passed but unused in `CorrigeProduction`; verify if it should affect behavior

### Consider for new implementation
1. **Wrap all writes in a transaction** — the legacy code has no transaction wrapper, creating partial-update risk
2. **Add input validation** — the legacy code has none
3. **Separate defect save endpoint** — the old software saves defects individually via independent AJAX calls (not batched in CorrigeProduction). The current `server/api.cjs:submitCorrection.cfm` handles defects inline — this should be refactored to match the old software's approach with a separate defect save endpoint
4. **Do NOT use `Nba_Corrige_Production`** — user confirmed: use the exact same multi-SP flow as the old software
5. **Do NOT use Excel dictionary** — use the existing React i18n approach
