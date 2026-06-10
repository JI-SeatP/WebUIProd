# 01 - State Model

## Initial state assembly

When the correction form is opened, `afficheTableauCorrection` (`CorrectionInventaire.cfc:9-157`) assembles the initial state from multiple queries and sub-component invocations:

### Step 1: Determine production mode
```sql
SELECT MODEPROD_MPCODE FROM TEMPSPROD WHERE TJSEQ = @TJSEQ
```
- **Source:** `CorrectionInventaire.cfc:25-29`
- **Purpose:** The `MODEPROD_MPCODE` value ("PROD" or "SETUP") controls which sections of the form are shown
- **Confidence:** Direct

### Step 2: Resolve current operation
- If `MODEPROD_MPCODE = "SETUP"` → uses `RequeteAlternative.cfm` (line 31)
- If `MODEPROD_MPCODE != "SETUP"` → calls `support.trouveUneOperation` (lines 33-39)
- Also always calls `operation.trouveUneOperationParTransac` (lines 41-46)
- **Confidence:** Direct

### Step 3: Build form sections (conditional on mode)

| Section | Component | Condition | Key output variables |
|---------|-----------|-----------|---------------------|
| Order Info | `InfoCommande.afficheInfoCommande` | Always | `afficheTableauInfoCommande` |
| Time/Prod | `TempsProd.afficheTempsProd` | Always | `afficheTableauTempsProd` |
| Defects | `QteDefect.afficheQteDefectueuses` | Not SETUP | `afficheTableauQteDefectueuses` |
| Good Qty / Finished Products | `QteBonne` or `ProduitFini` | Not SETUP (see below) | `afficheTableauQteBonnes` or `afficheTableauProduitFini` |
| Material Exits | `SortieMateriel.afficheListeSortieMateriel` | Not SETUP | `afficheTableauSortieMateriel` |
| Footer | `CorrectionInventaire.afficheQuitterSoumettre` | Always | `TableauQuitterSoumettre` |

### Step 4: Good Qty vs Finished Products decision
- **Source:** `CorrectionInventaire.cfc:72-100`
- A query checks for DET_TRANS rows linked to the ENTRERPRODFINI transaction:
  ```sql
  SELECT ... FROM DET_TRANS DT
  INNER JOIN TRANSAC T ON DT.TRANSAC = T.TRSEQ
  INNER JOIN TEMPSPROD TP ON T.TRNO = TP.ENTRERPRODFINI_PFNOTRANS
  WHERE TP.TJSEQ = @TJSEQ
  ```
- If `trouveOPERATIONPARTRANSAC.ENTREPF = 0` OR `trouveProduitsFinis.RecordCount = 0` → show **QteBonne** (simple qty field)
- Otherwise → show **ProduitFini** (per-DET_TRANS editable rows)
- **Confidence:** Direct

## State variables

| Variable | Source | Meaning |
|----------|--------|---------|
| `MODEPROD_MPCODE` | `TEMPSPROD.MODEPROD_MPCODE` | "PROD" = production, "SETUP" = setup mode |
| `STATUT_CODE` | `trouveOperation.STATUT_CODE` | Operation status code |
| `ENTREPF` | `trouveOPERATIONPARTRANSAC.ENTREPF` | 0 = no finished-product entry, >0 = has EPF |
| `LeVCUT` | Computed from `trouveOperation` | 1 if `PRODUIT_CODE = "VCUT"` or `NO_INVENTAIRE = "VCUT"` |

## State transitions

The correction screen itself does not manage a state machine. It is a one-shot edit form:

| State | Trigger | Next State |
|-------|---------|------------|
| DivTempsHomme visible | Click pencil button | DivCorrection visible |
| DivCorrection visible | Click OK (submit) | `CorrigeProduction` executes → DivTempsHomme visible |
| DivCorrection visible | Click Cancel / X | DivTempsHomme visible (no server call) |

### Submit-side state changes (CorrigeProduction)

The `CorrigeProduction` method modifies state in the database:

1. **DET_TRANS quantities** — corrected via `Nba_Corrige_Quantite_Transaction` (for both EPF and SM rows)
2. **cNOMENCOP.NOPQTESCRAP** — updated directly with defect total
3. **TEMPSPROD** — updated via `Nba_Sp_Update_Production` (dates, quantities, employee, operation, machine)
4. **TEMPSPROD costs** — recalculated via `FctCalculTempsDeProduction` (only in PROD mode)
5. **Product-in-progress** — recalculated via `Nba_Recalcul_Un_Produit_EnCours` (only in PROD mode)
6. **Next TEMPSPROD row** — start time cascaded via second `Nba_Sp_Update_Production` call

## Rejected/impossible transitions

- **SETUP mode rows** cannot have defect, good qty, finished product, or material exit corrections (those sections are not rendered). Only datetime, employee, operation, and machine can be corrected.
- **Confidence:** Direct (`CorrectionInventaire.cfc:63-109`, conditional rendering)
