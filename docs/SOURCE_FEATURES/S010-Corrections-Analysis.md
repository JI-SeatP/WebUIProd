# S010 - Corrections Screen (DivCorrection) Analysis

## Source Files
- `src/old/EcransSeatPly/cfc/CorrectionInventaire.cfc` - Main correction logic

---

## 1. Screen Purpose

The Corrections screen allows supervisors to:
- Review and correct production time entries
- Adjust good product quantities (finished products)
- Modify defect quantities
- Correct material output (sortie materiel) quantities

This is accessed after production has been logged, allowing fixes to data entry errors.

---

## 2. Screen Layout

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  QUESTIONNAIRE CORRECTION                                                    │
│  (Correction Form)                                                           │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  [Order Info Block - from InfoCommande]                                      │
│  Order #: P001-001 | Product: Widget | Client: ACME                         │
│                                                                              │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  [Production Time Block - from TempsProd.afficheTempsProd]                  │
│  Shows time entry details for the TJSEQ                                     │
│                                                                              │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  [Defect Quantities Block - from QteDefect.afficheQteDefectueuses]         │
│  (Only if status ≠ SETUP)                                                   │
│                                                                              │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  [Good Quantities Block - QteBonne OR ProduitFini]                          │
│  (Only if status ≠ SETUP)                                                   │
│  - QteBonne: Simple quantity correction                                     │
│  - ProduitFini: Multiple container/product corrections                      │
│                                                                              │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  [Material Output Block - from SortieMateriel]                              │
│  (Only if status ≠ SETUP and has material output)                          │
│                                                                              │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                         [OK - Submit]        │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Form Structure

### 3.1 Form Container
```html
<form id="FormCorrectionInventaire">
    <div id="DivTableauCorrectionForm" class="panel AvecTitre">
        <!-- Content sections -->
    </div>
</form>
```

### 3.2 Title
- Translation key: `LeTitreQuestionCorrect`
- FR: "CORRECTION"
- Style: 20px font, bold, uppercase

---

## 4. Component Sections

### 4.1 Order Info (afficheTableauInfoCommande)
Displays basic order information header.

### 4.2 Production Time (afficheTableauTempsProd)
Shows the time production record being corrected:
- Start/end times
- Duration
- Employee
- Machine

### 4.3 Defect Quantities (afficheTableauQteDefectueuses)
- **Condition**: Only shown when `MODEPROD_MPCODE ≠ "SETUP"`
- Allows editing defect counts and reasons

### 4.4 Good Quantities
Two modes based on `trouveOPERATIONPARTRANSAC.ENTREPF`:

**Mode 1: Simple Qty (ENTREPF = 0)**
- Component: `QteBonne.afficheTableauQteBonnes`
- Single quantity input

**Mode 2: Finished Products (ENTREPF = 1)**
- Component: `ProduitFini.afficheListeProduitFini`
- Multiple container/product entries
- Field IDs: `DTRQTE_PF_{DTRSEQ}`

### 4.5 Material Output (afficheTableauSortieMateriel)
- Only shown when has content
- Field IDs: `DTRQTE_SM_{DTRSEQ}`

---

## 5. Submit Handler

### 5.1 OK Button
```html
<button id="btnGO_MOYENmodifTP" class="btn btn-outline-retour Attente"
        onClick="CorrigeProduction(Statut, TJSEQ, 0, TRANSAC, COPMACHINE, NOPSEQ, LeVCUT, TJSEQ);">
    OK
</button>
```

### 5.2 JavaScript Function
```javascript
function CorrigeProduction(Statut, TJSEQ, EstVCUT, TRANSAC, COPMACHINE, NOPSEQ, LeVCUT, TJSEQ_Original) {
    // Collects form data
    // Calls CorrectionInventaire.cfc?method=CorrigeProduction
    // Submits corrections
}
```

---

## 6. Backend Correction Logic

### 6.1 CFC Method: CorrigeProduction

**Parameters:**
- `TJSEQ`: Time production sequence ID
- `QteBonne`: Good quantity (if applicable)
- `QteDefectueux`: Defect quantity
- `EstVCUT`: VCUT flag (0/1)

**Processing Steps:**

1. **Load Current Record**
   ```sql
   SELECT * FROM TEMPSPROD WHERE TJSEQ = :TJSEQ
   ```

2. **Calculate Totals**
   ```sql
   SELECT SUM(TJQTEPROD) AS TotalPROD, SUM(TJQTEDEFECT) AS TotalDEFECT
   FROM TEMPSPROD
   WHERE TRANSAC = :TRANSAC AND cNomencOp = :NOPSEQ AND MODEPROD = 1
   ```

3. **Process Finished Products** (if exists)
   - Loop through `trouveProduitsFinis`
   - Check if `form.DTRQTE_PF_{DTRSEQ}` differs from original
   - Call stored procedure: `Nba_Corrige_Quantite_Transaction`
   - Parameters: `DTRSEQ, NewQty, EmployeeName`

4. **Update Defect Quantities**
   ```sql
   UPDATE cNOMENCOP SET NOPQTESCRAP = :TotalDefect WHERE NOPSEQ = :NOPSEQ
   ```

5. **Process Material Output**
   - Loop through `trouveSortiesMateriel`
   - Check if `form.DTRQTE_SM_{DTRSEQ}` differs from original
   - Call stored procedure for corrections

---

## 7. SETUP Mode Handling

When `MODEPROD_MPCODE = "SETUP"`:
- Different query template: `RequeteAlternative.cfm`
- Skips defect quantities section
- Skips good quantities section
- Skips material output section
- Only shows order info and time production

---

## 8. VCUT Handling

When product is VCUT type:
- `LeVCUT` flag set to 1
- Passed to `CorrigeProduction` function
- May affect calculation logic

---

## 9. Database Tables Affected

| Table | Operation | Description |
|-------|-----------|-------------|
| TEMPSPROD | Read | Load time production record |
| cNOMENCOP | Update | Update scrap quantities |
| DET_TRANS | Update (via SP) | Correct transaction details |
| TRANSAC | Read | Get order info |

---

## 10. Stored Procedures Called

| Procedure | Purpose | Parameters |
|-----------|---------|------------|
| Nba_Corrige_Quantite_Transaction | Correct finished product qty | DTRSEQ, NewQty, EmployeeName |

---

## 11. Access Notes

- Accessed from Operation screen (via specific button/link)
- Requires TJSEQ (time production sequence ID) to identify record
- Only available after production has been logged
- Allows corrections without voiding entire entry

---

## 12. Differences from Questionnaire

| Aspect | Questionnaire (S004) | Corrections (S010) |
|--------|---------------------|-------------------|
| Purpose | Initial data entry | Post-entry corrections |
| Stop Cause | Included | Not included |
| Cancel Button | Yes (removes data) | No (commented out) |
| Mode | Creates new records | Updates existing records |
| Access | From status change | From history/review |


## REVIEW USING EXISTING STORE PROCS

### submitQuestionnaire.cfm

|Step|Stored Procedure|Purpose|
|---|---|---|
|6|`Nba_Sp_Update_Production`|Closes the PROD row with end time, quantities, costs (replaces raw UPDATE)|
|7|`FctCalculTempsDeProduction`|Recalculates production costs|
|8|`Nba_Update_ProduitEnCours`|Updates in-progress product quantities with material + operation costs|

### submitCorrection.cfm

|Step|Stored Procedure|Purpose|
|---|---|---|
|1|`Nba_Corrige_Quantite_Transaction`|Corrects finished product transaction quantities|
|4|`Nba_Sp_Update_Production`|Updates TEMPSPROD with corrected quantities/times|
|5|`FctCalculTempsDeProduction`|Recalculates production costs|
|6|`Nba_Recalcul_Un_Produit_EnCours`|Recalculates in-progress product data|

Also fixed: **timezone issue** — all dates now use `GETDATE()` on SQL Server or `FORMAT(GETDATE(), ...)` for SP string parameters, avoiding the JS Date → UTC conversion problem.


This is very detailed. The key insight I was missing: the old software's material output calculation uses the **BOM ratio** (`cNOMENCLATURE.NIQTE`) to calculate expected material quantities from production quantities — it's not just reading existing DET_TRANS rows.

Here's what happens:

1. **Display**: The query joins `TRANSAC → cNOMENCLATURE → cNOMENCOP` to find materials linked through the BOM, filtered by `SMNOTRANS` from ALL related TEMPSPROD rows
2. **Calculation**: `NouvelleQte = (QteBonne + QteDefectueux) × NIQTE` where `NIQTE` is the BOM ratio
3. **On submit**: Calls `Nba_Insert_Det_Trans_Avec_Contenant` to create/update the material transaction lines

The reason we see "Aucun résultat" is because our query only looks for **existing** DET_TRANS rows via `SMNOTRANS`. But for a CNC operation that hasn't been submitted before, the material lines need to come from the **BOM** (cNOMENCLATURE/cNOMENCOP tables).

This is a significant piece of logic. Want me to implement the BOM-based material output calculation to match the old software? It would involve:

1. Querying `cNOMENCOP` → `cNOMENCLATURE` to find expected materials from the BOM
2. Using `NIQTE` ratio to calculate quantities based on user-entered good + defect quantities
3. Calling `Nba_Insert_Det_Trans_Avec_Contenant` on submit to create the material transactions