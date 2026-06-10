# 07 - Porting Invariants

## Required behavioral invariants

### I1: SM quantities must NOT be user-editable
- **Evidence:** `SortieMateriel.cfc:155-156` — `type="hidden"` in corrections form
- **Rule:** SM quantities are computed server-side only. Users cannot manually enter SM values.
- **Criticality:** High — manual entry could cause inventory discrepancies

### I2: SM recalculation must trigger on good/defect/EPF quantity changes
- **Evidence:** `sp_js.cfm:1356,1458,1491,1554` — four trigger points with `AvecSM == 1` guard
- **Rule:** Whenever good qty, defect qty, or finished-product qty changes, `calculeQteSM` must fire
- **Criticality:** High — SM quantities must stay in sync with production quantities

### I3: Non-VCUT computation: `NouvelleQte = TotalQte × NIQTE` (with EPF) or proportional scaling (without EPF)
- **Evidence:** `SortieMateriel.cfc:793` (with EPF) and `807` (without EPF)
- **Rule:** Must replicate exact computation logic
- **Criticality:** High

### I4: VCUT computation: `QTE_CIBLE = SUM(per_TJSEQ_qty × NIQTE)` where per_TJSEQ_qty uses MAX across batch
- **Evidence:** `SortieMateriel.cfc:865-875, 1081-1115`
- **Rule:** VCUT uses MAX(TJQTEPROD + TJQTEDEFECT) per batch, not SUM
- **Criticality:** High — SUM would double-count

### I5: Ceiling rounding is handled by the stored procedure, not application code
- **Evidence:** `SCRIPT CORRIGE PRODUCTION.SQL:510-511` — `Nba_Execute_Ceiling` called inside SP
- **Rule:** Do NOT implement ceiling in React/Express code. The SP handles it per inventory item.
- **Criticality:** High — double ceiling would over-withdraw

### I6: Correction SP `Nba_Corrige_Quantite_Transaction` uses 3 parameters
- **Evidence:** `CorrectionInventaire.cfc:313`
- **Rule:** `(DTRSEQ, new_qty, username)` — exact same signature for both EPF and SM corrections
- **Criticality:** High

### I7: The comparison for triggering SM correction is against raw DTRQTE, not corrected value
- **Evidence:** `CorrectionInventaire.cfc:291-298` (query without OUTER APPLY)
- **Rule:** Compare submitted form value against `DET_TRANS.DTRQTE` directly
- **Criticality:** Medium — ensures correction SP fires when needed

### I8: VCUT uses EXT datasource for container/warehouse lookups
- **Evidence:** `SortieMateriel.cfc:553-559` — `VSP_BonTravail_VeneerReserve` on `THIS.dsClientEXT`
- **Rule:** VCUT container/warehouse options come from the external database
- **Criticality:** Medium

## Data-shape invariants

### D1: `Nba_Sp_Sortie_Materiel` parameter signature
```
SMNOTRANS (char 9), SMITEM (int), SMNOORIGINE (char 9),
SMQTEPRODUIT (float), OPERATION (int), USER (varchar 30),
NISTR_NIVEAU (varchar 500), NOSERIE (varchar 20),
SMNORELACHE (int), SQLERREUR (int output)
```

### D2: TRANSAC.TRNO_EQUATE values
- `7` = SM (Sortie de Matériel)
- `14` = Correction child row
- `15` = Reservation

### D3: SM quantity format
All SM quantities use `NumberFormat(value, '0.99999')` — 5 decimal places.

## Incidental details (do NOT replicate)

1. **SOAP calls with 2s sleep** — use direct mssql instead
2. **HTML string assembly** — React renders client-side
3. **`evaluate('form.XXX_#ID#')` pattern** — use proper data structures
4. **Tripled normalization block** — copy/paste bug, execute once
5. **`TotalQte` undefined in `CorrigeQteSM`** — fix the scoping bug
