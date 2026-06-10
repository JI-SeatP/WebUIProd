# 05 - Outputs and Side Effects

## Response payloads

### `afficheListeSortieMateriel` (display)
- **Format:** HTML string
- **Content:** Table with SM rows showing material code, description, quantity, unit, warehouse
- **Hidden fields:** `DTRQTE_SM_<DTRSEQ>` per row
- **Consumer:** Injected into correction form

### `calculeQteSM` (recalculation)
- **Format:** JSON struct
- **Content:** `{ListeDTRSEQ: [int, ...], ListeQteSM: [string, ...], Erreur: ""}`
- **Consumer:** JS callback updates DOM hidden inputs + display divs

### `calculeQteSMQS` (QS recalculation)
- **Format:** JSON struct (same shape)
- **Side effect:** Writes directly to DET_TRANS, TRANSAC, SORTIEMATERIEL
- **Consumer:** JS callback updates DOM

## Database side effects

### On SM creation
1. `SORTIEMATERIEL` — new header row (via `Nba_Sp_Insert_Sortie_Materiel`)
2. `TRANSAC` — one row per BOM material line (TRNO_EQUATE=7)
3. `DET_TRANS` — one or more rows per TRANSAC (per stock lot)
4. `TEMPSPROD.SMNOTRANS` — updated to link production entry to SM

### On quantity recalculation (QS path only)
1. `DET_TRANS` — updated via `Nba_Insert_Det_Trans_Avec_Contenant`
2. `TRANSAC` — TRQTETRANSAC, TRQTEUNINV, TRQTEINV_ESTIME updated
3. `SORTIEMATERIEL` — SMQTEPRODUIT updated

### On correction (corrections screen)
1. `DET_TRANS` — correction child rows created (TRNO_EQUATE=14, via `Nba_Corrige_Quantite_Transaction`)

### On cancel (QS path)
1. `SORTIEMATERIEL` — DELETE
2. `TRANSAC` — DELETE (TRNO matching SMNOTRANS)
3. `DET_TRANS` — DELETE (TRANSAC_TRNO matching SMNOTRANS)
4. `TEMPSPROD.SMNOTRANS` — cleared

## Ceiling rounding path

The ceiling rounding for SM quantities is handled inside `Nba_Sp_Sortie_Materiel` at lines 510-511:
```sql
EXEC dbo.Nba_Execute_Ceiling @NOMENCLATURE_SEQ_INV, @DTRQTE OUTPUT
EXEC dbo.Nba_Execute_Ceiling @NOMENCLATURE_SEQ_INV, @TRQTEINV_ESTIME OUTPUT
```
This is a per-inventory-item setting, NOT a VCUT-only feature. The old CF-level ceiling code in `CorrectionInventaire.cfc:304-308` was commented out when this SP-level ceiling was implemented.
