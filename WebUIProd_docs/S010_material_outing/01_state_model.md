# 01 - State Model

## SM lifecycle

```
[No SM] → ajouteSM/InsertSortieMateriel → [SM Created (unposted)]
    → Nba_Sp_Sortie_Materiel (populate detail) → [SM with DET_TRANS]
    → calculeQteSMQS (quantity adjustments) → [SM quantities updated]
    → EXECUTE_TRANSACTION SM REPORT → [SM Posted (committed)]
```

## Key state variables

| Variable | Source | Meaning |
|----------|--------|---------|
| `TEMPSPROD.SMNOTRANS` | TEMPSPROD table | Links a production time entry to its SM (9-char transaction no.) |
| `SORTIEMATERIEL.SMSEQ` | SORTIEMATERIEL table | SM header PK |
| `SORTIEMATERIEL.SMQTEPRODUIT` | SORTIEMATERIEL table | Total produced quantity driving the SM |
| `TRANSAC.TRNO` | TRANSAC table | SM component row (one per BOM material line) |
| `TRANSAC.TRNO_EQUATE` | TRANSAC table | =7 for SM transactions |
| `TRANSAC.TRPOSTER` | TRANSAC table | 0=unposted, 1=posted |
| `DET_TRANS.DTRSEQ` | DET_TRANS table | Individual stock-lot withdrawal row |
| `DET_TRANS.DTRQTE` | DET_TRANS table | Quantity withdrawn per lot |
| `DET_TRANS.TRANSAC_TRNO_EQUATE` | DET_TRANS table | =14 for correction child rows |
| `DET_TRANS.DTRSEQ_PERE` | DET_TRANS table | Links correction row to parent |

## VCUT detection

The system checks two fields to determine VCUT mode:
```coldfusion
trouveOperation.PRODUIT_CODE EQ "VCUT" OR trouveOperation.NO_INVENTAIRE EQ "VCUT"
```
- **Source:** `SortieMateriel.cfc:495`, `CorrectionInventaire.cfc:177`
- **Effect:** Controls QTE_CIBLE computation method, container dropdown source, BOM JOIN strategy

## Quantity computation models

### Non-VCUT (standard)
```
SM_Qty_per_material = (Good_Qty + Defect_Qty) × NIQTE
```
Where `NIQTE` is the BOM ratio from `cNOMENCLATURE` for the specific material.

### VCUT
```
SM_Qty_per_material = SUM_across_batch(
    per_TJSEQ_qty × NIQTE_for_this_material
)
```
Where `per_TJSEQ_qty = MAX(TJQTEPROD + TJQTEDEFECT)` across batch (not SUM, to avoid double-counting).

### Correction screen recalculation (non-QS `calculeQteSM`)
Two branches:
- **With EPF (finished products):** `NouvelleQte = TotalQte × NIQTE`
- **Without EPF:** `NouvelleQte = TotalQte / (OriginalTotal / QteBonne)` (proportional scaling)
