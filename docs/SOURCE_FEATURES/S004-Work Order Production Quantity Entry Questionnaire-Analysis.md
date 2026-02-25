# S004 - Production Questionnaire (DivQuestionnaire) Analysis

## Source Files
- `src/old/EcransSeatPly/cfc/QuestionnaireSortie.cfc` - Main questionnaire logic
- `src/old/EcransSeatPly/cfc/QteBonne.cfc` - Good quantity entry
- `src/old/EcransSeatPly/cfc/QteDefect.cfc` - Defect quantity entry
- `src/old/EcransSeatPly/cfc/ProduitFini.cfc` - Finished product entry
- `src/old/EcransSeatPly/cfc/SortieMateriel.cfc` - Material output entry
- `src/old/EcransSeatPly/cfc/TempsProd.cfc` - Employee time entry
- `src/old/EcransSeatPly/cfc/InfoCommande.cfc` - Order info header

---

## 1. Screen Purpose

The questionnaire screen appears when:
- User clicks STOP button (pauses production)
- User clicks COMP button (completes operation)

It allows workers to enter:
1. Stop/completion cause
2. Produced quantities (good and defective)
3. Finished product entries (if applicable)
4. Material consumption (if applicable)
5. Employee assignment

---

## 2. Screen Layout

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                    QUESTIONNAIRE DE SORTIE (Exit Survey)                      │
│                    [Title with "AvecTitre" panel styling]                    │
├──────────────────────────────────────────────────────────────────────────────┤
│  ORDER INFO BLOCK (from InfoCommande)                                        │
│  - Order #, Client, Product, Status                                          │
├──────────────────────────────────────────────────────────────────────────────┤
│  EMPLOYEE SECTION (from TempsProd.afficheEmploye)                           │
│  - Employee code entry                                                       │
├──────────────────────────────────────────────────────────────────────────────┤
│  MOLD ACTION (PRESS/CNC only on COMP)                                       │
│  - Keep mold / Uninstall mold dropdown                                      │
├──────────────────────────────────────────────────────────────────────────────┤
│  STOP CAUSE SECTION (only for STOP/PROD status)                             │
│  ┌────────────────┬────────────────────────────────────────────────────────┐ │
│  │ Primary Cause  │ [Dropdown - QA_CAUSEP]                                │ │
│  ├────────────────┼────────────────────────────────────────────────────────┤ │
│  │ Secondary Cause│ [Dropdown - QA_CAUSES, filtered by primary]           │ │
│  ├────────────────┼────────────────────────────────────────────────────────┤ │
│  │ Other/Notes    │ [Textarea - EXTPRD_NOTE_0]                            │ │
│  └────────────────┴────────────────────────────────────────────────────────┘ │
├──────────────────────────────────────────────────────────────────────────────┤
│  DEFECT QUANTITIES SECTION (not for VCUT)                                   │
│  - QteDefect.afficheQteDefectueusesQS                                       │
├──────────────────────────────────────────────────────────────────────────────┤
│  GOOD QUANTITIES SECTION                                                     │
│  - QteBonne.afficheTableauQteBonnesQS (simple qty entry)                   │
│  - OR ProduitFini.afficheListeProduitFiniQS (multiple product entries)     │
├──────────────────────────────────────────────────────────────────────────────┤
│  MATERIAL OUTPUT SECTION (if operation consumes inventory)                  │
│  - SortieMateriel.afficheListeSortieMaterielQS                             │
├──────────────────────────────────────────────────────────────────────────────┤
│  FOOTER: [X] Cancel                                                [OK]     │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Stop Cause Section

### 3.1 Primary Cause Dropdown
- Source: `QA_CAUSEP` table
- Fields: `QACPSEQ`, `QACPDESCRIPTION_S` (EN), `QACPDESCRIPTION_P` (FR)
- Default: ID 8 (selected by default)
- Style: 350px wide, 44px height, blue border, 24px font

### 3.2 Secondary Cause Dropdown
- Source: `QA_CAUSES` table, filtered by `QA_CAUSEP` foreign key
- Dynamically loaded via `trouveCauseSecondaire()` JS function
- Updates on primary cause change
- Default: ID 40

### 3.3 Notes Textarea
- ID: `EXTPRD_NOTE_0`
- 1000px wide, 75px height
- Virtual keyboard attached if `session.AvecClavier = 1`

---

## 4. Mold Action Section (PRESS/CNC on COMP only)

Dropdown with options:
| Value | FR Label | EN Equivalent |
|-------|----------|---------------|
| 1 | Conserver le moule | Keep the mold |
| 2 | Desinstaller le moule | Uninstall the mold |

---

## 5. Quantity Entry Components

### 5.1 Good Quantity (Simple)
From `QteBonne.cfc`:
- Single quantity input field
- Calculated from produced minus defective

### 5.2 Finished Products (Multiple)
From `ProduitFini.cfc`:
- Table with multiple product rows
- Each row: Product, Qty input, Container #
- Used when `ENTREPF = 1` (operation creates inventory)

### 5.3 Defective Quantity
From `QteDefect.cfc`:
- Table for entering defect details
- Columns: Qty, Reason dropdown, Notes
- Can add multiple defect entries

### 5.4 Material Output
From `SortieMateriel.cfc`:
- Table of consumed materials
- Shows SKID/container, qty used, warehouse

---

## 6. Form Structure

```html
<form id="FormQuestionnaireSortie">
    <input type="hidden" id="ListeTJSEQ" value="">
    <input type="hidden" id="ListeSMSEQ" value="">
    <input type="hidden" id="ListeEPFSEQ" value="">
    <!-- ... form fields ... -->
</form>
```

Hidden fields track:
- `ListeTJSEQ` - Time production sequence IDs
- `ListeSMSEQ` - Material output sequence IDs
- `ListeEPFSEQ` - Finished product entry IDs

---

## 7. Footer Buttons

### 7.1 Cancel Button
```html
<button id="btnFERMER_MOYEN_QS"
        class="btn btn-outline-retire Attente"
        onClick="RetireQuestionnaireSortie(TJSEQ, TRANSAC, COPMACHINE, NOPSEQ, Statut)">
    X
</button>
```
- Cancels questionnaire
- Reverts to operation screen
- Removes temporary data entries

### 7.2 OK Button
```html
<button id="btnGO_MOYENmodifQS"
        class="btn btn-outline-retour"
        onClick="ouvrirModaleZero(Statut, TJSEQ, TRANSAC, COPMACHINE, NOPSEQ)">
    OK
</button>
```
- Opens zero-value confirmation modal if qty = 0
- Otherwise submits questionnaire
- Validates all required fields

---

## 8. Key JavaScript Functions

### 8.1 Submit Handler
```javascript
function AjouteModifieQuestionnaireSortieQS(Statut, TJSEQ, TRANSAC, COPMACHINE, NOPSEQ, Langue) {
    // Validates form
    // Submits via AJAX
    // Returns to DivOperation on success
}
```

### 8.2 Zero Modal Handler
```javascript
function ouvrirModaleZero(Statut, TJSEQ, TRANSAC, COPMACHINE, NOPSEQ) {
    // Checks if quantities are zero
    // Shows confirmation modal if so
    // Calls submit on confirm
}
```

### 8.3 Cancel Handler
```javascript
function RetireQuestionnaireSortie(TJSEQ, TRANSAC, COPMACHINE, NOPSEQ, Statut) {
    // Removes temporary entries
    // Returns to DivOperation
}
```

---

## 9. Special Handling: VCUT Operations

When operation is VCUT type:
- Defect quantities section is hidden
- Different material tracking (Big Sheets)
- Special logic to preserve PROD time records

---

## 10. Database Tables Involved

| Table | Purpose |
|-------|---------|
| TEMPSPROD | Production time records |
| QA_CAUSEP | Primary stop causes |
| QA_CAUSES | Secondary stop causes |
| DET_DEFECT | Defect detail records |
| ENTREPF | Finished product entries |
| DET_TRANS | Transaction details |
| SORTIE_MATERIEL | Material output records |

---

## 11. Form Validation

Required fields checked before submit:
1. Stop cause (primary + secondary) when status = STOP
2. At least one quantity entry (good or defective)
3. Employee code (if required by operation)

Validation message displayed in `#MessageSortie` div (red text, 24px).

---

## 12. Input Styling Patterns

All dropdowns and inputs follow consistent styling:
- Height: 44px
- Border color: #2B78E4 (blue)
- Font size: 24px
- Width varies by field purpose

Virtual keyboard integration:
- Class: `keyboardInput` added to textareas
- `VKI_attach()` called on focus-able fields
