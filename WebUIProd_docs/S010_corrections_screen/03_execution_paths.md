# 03 - Execution Paths

## Flow 1: Display correction form

### Trigger
Pencil button click → `afficheDiv('DivCorrection', ...)` → AJAX GET to `operation.cfc?method=afficheDiv&Div=DivCorrection`

### Execution sequence

| Step | File:Line | Action |
|------|-----------|--------|
| 1 | `sp_js.cfm:352-367` | Hide all divs, clear innerHTML |
| 2 | `sp_js.cfm:368` | Set target div innerHTML to "Please wait" message |
| 3 | `sp_js.cfm:419` | AJAX GET `operation.cfc?method=afficheDiv&Div=DivCorrection&TRANSAC=...&COPMACHINE=...&NOPSEQ=...&TJSEQ=...` |
| 4 | `operation.cfc:130` | Route to `DivCorrection` branch |
| 5 | `operation.cfc:131-145` | Invoke `CorrectionInventaire.afficheTableauCorrection(dsClient, TRANSAC, COPMACHINE, NOPSEQ, TJSEQ, Langue, ...)` |
| 6 | `CorrectionInventaire.cfc:25-29` | Query MODEPROD_MPCODE from TEMPSPROD |
| 7 | `CorrectionInventaire.cfc:30-40` | If SETUP → `RequeteAlternative.cfm`; else → `support.trouveUneOperation` |
| 8 | `CorrectionInventaire.cfc:41-46` | Call `operation.trouveUneOperationParTransac` |
| 9 | `CorrectionInventaire.cfc:47-54` | Call `InfoCommande.afficheInfoCommande` |
| 10 | `CorrectionInventaire.cfc:55-62` | Call `TempsProd.afficheTempsProd` |
| 11 | `CorrectionInventaire.cfc:63-71` | If not SETUP → call `QteDefect.afficheQteDefectueuses` |
| 12 | `CorrectionInventaire.cfc:72-81` | If not SETUP → query finished products from DET_TRANS |
| 13 | `CorrectionInventaire.cfc:82-100` | If `ENTREPF=0` or no finished products → `QteBonne.afficheTableauQteBonnes`; else → `ProduitFini.afficheListeProduitFini` |
| 14 | `CorrectionInventaire.cfc:101-108` | If not SETUP → call `SortieMateriel.afficheListeSortieMateriel` |
| 15 | `CorrectionInventaire.cfc:110-115` | Query order info (TRANSAC_TRNO, INVENTAIRE_INNOINV) |
| 16 | `CorrectionInventaire.cfc:116-123` | Call `afficheQuitterSoumettre` (renders OK button) |
| 17 | `CorrectionInventaire.cfc:124-156` | Assemble all sections into `<form id="FormCorrectionInventaire">` HTML |
| 18 | `operation.cfc:146-151` | Wrap result in `<div id="DivTableauCorrection">` |
| 19 | `sp_js.cfm:428-430` | Show DivCorrection, inject HTML |

### Confidence
Direct — every step traced line by line.

---

## Flow 2: Submit corrections (CorrigeProduction)

### Trigger
OK button click → JS `CorrigeProduction(Statut, TJSEQ, '0', TRANSAC, COPMACHINE, NOPSEQ, EstVCUT)`

### Execution sequence

| Step | File:Line | Action |
|------|-----------|--------|
| **Client** | | |
| 1 | `sp_js.cfm:1986` | Build FormData from `#FormCorrectionInventaire` |
| 2 | `sp_js.cfm:1987-1990` | Read `#TJQTEBONNE`, `#POP_TJQTEDEFECT`, `#Note` from DOM |
| 3 | `sp_js.cfm:1991-1992` | AJAX POST to `CorrectionInventaire.cfc?method=CorrigeProduction&TJSEQ=...&QteBonne=...&QteDefectueux=...&EstVCUT=...` with FormData |
| **Server** | | |
| 4 | `CorrectionInventaire.cfc:208-212` | Query full TEMPSPROD row for this TJSEQ (`CeTEMPSPROD`) |
| 5 | `CorrectionInventaire.cfc:213-221` | Query SUM(TJQTEPROD) and SUM(TJQTEDEFECT) across all TEMPSPROD rows for same TRANSAC+cNomencOp with MODEPROD=1 |
| 6 | `CorrectionInventaire.cfc:225` | **Branch: MODEPROD_MPCODE = "PROD"** (steps 7-16); else skip to step 17 |
| **PROD-only: Finished products** | | |
| 7 | `CorrectionInventaire.cfc:227-233` | Query DET_TRANS rows for finished products |
| 8 | `CorrectionInventaire.cfc:234-236` | If no EPF rows → `LaQteBonProduit = arguments.QteBonne` |
| 9 | `CorrectionInventaire.cfc:241-279` | Loop EPF rows: for each `form.DTRQTE_PF_<DTRSEQ>` that differs from `DTRQTE`, call **`Nba_Corrige_Quantite_Transaction(DTRSEQ, new_qty, username)`** via `envoiXMLGet` |
| **PROD-only: Defect scrap update** | | |
| 10 | `CorrectionInventaire.cfc:283-287` | Direct SQL: `UPDATE cNOMENCOP SET NOPQTESCRAP = <TotalDefect> WHERE NOPSEQ = <cNOMENCOP>` |
| **PROD-only: Material exits** | | |
| 11 | `CorrectionInventaire.cfc:291-298` | Query DET_TRANS rows for material exits (via SMNOTRANS) |
| 12 | `CorrectionInventaire.cfc:299-342` | Loop SM rows: for each `form.DTRQTE_SM_<DTRSEQ>` that differs from `DTRQTE`, call **`Nba_Corrige_Quantite_Transaction(DTRSEQ, new_qty, username)`** via `envoiXMLGet` |
| **All modes: Update TEMPSPROD** | | |
| 13 | `CorrectionInventaire.cfc:345-352` | Read form fields: `DateDebut_<TJSEQ>`, `DateFin_<TJSEQ>`, `Operation_<TJSEQ>`, `Machine_<TJSEQ>`, `CodeEmploye_<TJSEQ>` |
| 14 | `CorrectionInventaire.cfc:353-357` | Query EMPLOYE table to resolve `EMSEQ` from `EMNO` |
| 15 | `CorrectionInventaire.cfc:364-387` | Call **`Nba_Sp_Update_Production`** with 20 parameters (TJSEQ, EMSEQ, OPERATION, MACHINE, TRANSAC, dates, quantities, mode, note, SMNOTRANS) |
| **PROD-only: Cost recalculation** | | |
| 16 | `CorrectionInventaire.cfc:392-402` | Direct SQL: `UPDATE TEMPSPROD SET costs FROM FctCalculTempsDeProduction(@TJSEQ)` |
| 17 | `CorrectionInventaire.cfc:408-422` | Call **`Nba_Recalcul_Un_Produit_EnCours(TRANSAC, 0)`** |
| **All modes: Cascade to next TEMPSPROD** | | |
| 18 | `CorrectionInventaire.cfc:425-431` | Query next TEMPSPROD row (same TRANSAC+CNOMENCOP, TJSEQ > current) |
| 19 | `CorrectionInventaire.cfc:432-469` | If exists → call **`Nba_Sp_Update_Production`** for next row, setting its start time = current row's end time |
| **Return** | | |
| 20 | `CorrectionInventaire.cfc:470` | Return `ResultatTout` (accumulated error/info messages) |
| **Client** | | |
| 21 | `sp_js.cfm:1994` | On success → `afficheDiv('DivTempsHomme', ...)` to refresh time table |
| 22 | `sp_js.cfm:1995` | Hide `#modalAttente` |

### Confidence
Direct — every step traced line by line.

---

## Flow 3: Cancel

### Trigger
Close button (currently commented out) or any other navigation away.

### Execution sequence

| Step | File:Line | Action |
|------|-----------|--------|
| 1 | `sp_js.cfm:791-793` | `RetireCorrections` calls `afficheDiv('DivTempsHomme', ...)` |
| 2 | (afficheDiv) | Hides DivCorrection, loads DivTempsHomme via AJAX |

### Confidence
Direct — the close button HTML is commented out at `CorrectionInventaire.cfc:184-186`, but `RetireCorrections` function exists and is called from other contexts.

---

## Flow 4: Save individual defect row (independent AJAX)

### Trigger
User enters defect qty + reason in the defect table and clicks the per-row OK button (or changes the reason `<select>`).

### Execution sequence

| Step | File:Line | Action |
|------|-----------|--------|
| 1 | `sp_js.cfm:1433-1434` | JS `AjouteModifieDetailDEFECT()` reads `POP_DEF_DDQTEUNINV_<Position>` |
| 2 | `sp_js.cfm:1445-1446` | Reads `POP_RAISON_<Position>` and `POP_DEF_DDNOTE_<Position>` |
| 3 | `sp_js.cfm:1448` | AJAX GET to `QteDefect.cfc?method=AjouteModifieDetailDEFECT&DDSEQ=...&Qte=...&Raison=...&Note=...&TJSEQ=...` |
| 4 | `QteDefect.cfc:645-690` | Query `DET_DEFECT` by DDSEQ to check if row exists |
| 5a | `QteDefect.cfc:692-713` | If no match + Qte != 0 → `INSERT INTO DET_DEFECT` |
| 5b | `QteDefect.cfc:717-727` | If match exists → `UPDATE DET_DEFECT SET DDQTEUNINV, RAISON, DDNOTE, DDDATE` |
| 6 | `QteDefect.cfc:729-738` | Re-sum `DET_DEFECT.DDQTEUNINV` for TJSEQ → `UPDATE TEMPSPROD SET TJQTEDEFECT = <sum>` |
| 7 | `sp_js.cfm:1451-1453` | On success: clear row-0 inputs, refresh defect table display (which updates `POP_TJQTEDEFECT` hidden) |

### Confidence
Direct — complete function body traced.

### Key implication
Defect saves are **committed immediately** to the database, independent of the OK button submit. By the time `CorrigeProduction` fires, all defect rows are already persisted. `CorrigeProduction` only reads the pre-computed total from `POP_TJQTEDEFECT`.

---

## Branching conditions summary

| Condition | Effect |
|-----------|--------|
| `MODEPROD_MPCODE = "SETUP"` | Display: skip defects, good qty, EPF, SM sections. Submit: skip all PROD-only steps (7-12, 16-17). |
| `MODEPROD_MPCODE = "PROD"` | Full form and full submit flow |
| `ENTREPF = 0 OR trouveProduitsFinis.RecordCount = 0` | Show simple QteBonne field instead of per-row ProduitFini |
| `form.DTRQTE_PF_<DTRSEQ> != DTRQTE` | Call `Nba_Corrige_Quantite_Transaction` for that EPF row |
| `form.DTRQTE_SM_<DTRSEQ> != DTRQTE` | Call `Nba_Corrige_Quantite_Transaction` for that SM row |
| `trouveProchainStatut.RecordCount > 0` | Cascade timing to next TEMPSPROD row |
| `PRODUIT_CODE = "VCUT" OR NO_INVENTAIRE = "VCUT"` | Sets `LeVCUT = 1` (passed to JS, then back to CFC as `EstVCUT`) |
