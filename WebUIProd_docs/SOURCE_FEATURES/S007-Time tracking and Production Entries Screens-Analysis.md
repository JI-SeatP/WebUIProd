# S007 - Time Tracking Screen (DivTempsHomme) Analysis

## Source Files
- `src/old/EcransSeatPly/cfc/operation.cfc` - `afficheTableauTempsHomme()` (lines 1158-1540+)

---

## 1. Screen Purpose

The Time Tracking screen allows supervisors to:
- View production time records
- Add worker time entries manually
- Search historical time data

Accessed via: **Stopwatch button** in header menu

---

## 2. Screen Layout - Tab Structure

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  [Temps Production] [Emploi Temps]  [Recherche]                              │
│   (active tab)      (Add Hours)     (Search)                                 │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  TAB CONTENT AREA                                                            │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Tab Navigation
- Uses Bootstrap nav-tabs
- Class: `nav nav-tabs bleu`
- Each tab is a `nav-item` with `nav-link`

---

## 3. Tab 1: Production Time (TempsProd) - DEFAULT

### 3.1 Filter Section
```
┌──────────────────────────────────────────────────────────────────────────────┐
│  RECHERCHE (Search)                                                          │
├──────────┬──────────┬──────────────┬─────────────┬───────────────┬──────────┤
│ Date     │ Date     │ Order #      │ Department  │ Machine       │ Action   │
│ Debut    │ Fin      │ (Commande)   │             │               │          │
├──────────┼──────────┼──────────────┼─────────────┼───────────────┼──────────┤
│ [datetime│ [datetime│ [text input] │ [dropdown]  │ [dropdown]    │ [OK]     │
│  picker] │  picker] │              │             │               │          │
└──────────┴──────────┴──────────────┴─────────────┴───────────────┴──────────┘
```

**Filter Fields:**
| Field | ID | Type | Session Var |
|-------|-----|------|-------------|
| Start Date | Filtre5 | datetime-local | session.InfoClient.Filtre5 |
| End Date | Filtre6 | datetime-local | session.InfoClient.Filtre6 |
| Order Search | Filtre11 | text | session.InfoClient.Filtre11 |
| Department | Filtre12 | select | session.InfoClient.Filtre12 |
| Machine | Filtre13 | select (dynamic) | session.InfoClient.Filtre13 |

**OK Button:**
```html
<button id="btnGO_MOYENTempsProd" class="btn btn-outline-retour"
        onClick="afficheTempsProd(0);">
    OK
</button>
```

### 3.2 Results Section - Production Time Table

This is the **core data table** showing all production time entries. Loaded into `#DivResultatTempsProd` via AJAX call to `operation.cfc?method=afficheTempsProd`.

#### 3.2.1 Table Layout
```
┌────────────────┬────────┬──────────┬─────────────────────┬──────────┬─────────────────────────────┬────────┬────────┬────────┐
│ Date Debut     │ Duree  │ Statut   │ Commande            │ SM       │ Departement/Operation/      │ Qte    │ Qte    │ Action │
│ Date Fin       │ (hrs)  │          │                     │ EPF      │ Machine                     │ Bonnes │ Defect │        │
├────────────────┼────────┼──────────┼─────────────────────┼──────────┼─────────────────────────────┼────────┼────────┼────────┤
│ 2024-01-15     │ 02:30  │ [STOP▼]  │ P001-001            │ SM123    │ PRESSING                    │ 100    │ 5      │ [✏️]   │
│ 08:00 - 10:30  │        │          │ Widget Desc (CODE)  │ EPF456   │ Press Operation             │        │        │        │
│                │        │          │                     │          │ PRESS-01                    │        │        │        │
├────────────────┼────────┼──────────┼─────────────────────┼──────────┼─────────────────────────────┼────────┼────────┼────────┤
│ 2024-01-15     │ 01:45  │ PROD     │ P002-003            │ SM789    │ CNC                         │ 50     │ 2      │ [✏️]   │
│ 10:30 - 12:15  │        │          │ Gadget (GAD01)      │ EPF012   │ CNC Machining               │        │        │        │
│                │        │          │                     │          │ CNC-02                      │        │        │        │
└────────────────┴────────┴──────────┴─────────────────────┴──────────┴─────────────────────────────┴────────┴────────┴────────┘
```

#### 3.2.2 Table Columns

| # | Column | Width | Field(s) | Description |
|---|--------|-------|----------|-------------|
| 1 | **Date Debut / Date Fin** | 12% | `TJDEBUTDATE`, `TJFINDATE` | Start and end datetime of production entry. Format: `yyyy-mm-dd HH:nn` |
| 2 | **Duree (Hours)** | 5% | `TJDUREE` | Duration of production time entry |
| 3 | **Statut** | 10% | `MODEPROD_MPCODE` | Production status. **Editable dropdown** for COMP/STOP/PAUSE statuses |
| 4 | **Commande** | 20% | `TRANSAC_TRNO`, `TRANSAC_TRITEM`, `INDESC1/2`, `INNOINV` | Order number (formatted), product description, and item code |
| 5 | **SM / EPF** | 12% | `SMNOTRANS`, `ENTRERPRODFINI_PFNOTRANS` | Material output (Sortie Materiel) and Finished Product Entry transaction numbers |
| 6 | **Dept / Op / Machine** | 26% | `DEDESCRIPTION_P/S`, `OPERATION_OPDESC_P/S`, `MACHINE_MADESC_P/S` | Three-line cell: Department, Operation, Machine names (bilingual) |
| 7 | **Qte Bonnes** | 5% | `TJQTEPROD` | Good quantity produced |
| 8 | **Qte Defect** | 5% | `TJQTEDEFECT` | Defective quantity |
| 9 | **Action** | 5% | - | Edit button to open DivCorrection screen |

#### 3.2.3 Status Column (Editable)

When status is COMP, STOP, or PAUSE, the column shows a **dropdown** to change status:

```html
<select id="MODEPROD_MPCODE_{TJSEQ}" onChange="modifieStatutTempsProd('{TJSEQ}');">
    <option value="STOP">Arrêt / Stopped</option>
    <option value="PAUSE">Pause / Break</option>
    <option value="COMP">Complété / Completed</option>
</select>
```

For other statuses (PROD, SETUP), displays as text only.

#### 3.2.4 Hidden Fields Per Row

Each row contains hidden inputs for JavaScript access:
```html
<input type="hidden" id="TP_TJQTEPROD_{TJSEQ}" value="{TJQTEPROD}">
<input type="hidden" id="TP_TJQTEDEFECT_{TJSEQ}" value="{TJQTEDEFECT}">
```

#### 3.2.5 Action Button

Edit button appears when: `TJQTEPROD ≠ 0` OR `TJQTEDEFECT ≠ 0` OR `MODEPROD_MPCODE = PROD/SETUP`

```html
<button class="btn btn-outline-modifie"
        onClick="afficheDiv('DivCorrection', TRANSAC, 'Go', COPMACHINE, CNOMENCOP, '', Row, TJSEQ, Departement);">
    [Pencil Icon - #2B78E4]
</button>
```

Opens the **DivCorrection** screen (S010) to modify production entries.

#### 3.2.6 Row Highlighting

- **Selected row** (matches current TJSEQ): Background `#b2e3eb` (light blue)
- **Other rows**: Background `#ffffff` (white)

#### 3.2.7 Data Source Query

```sql
SELECT DISTINCT
    T.TJSEQ, T.MACHINE, T.MACHINE_MACODE, T.MACHINE_MADESC_P, T.MACHINE_MADESC_S,
    T.TRANSAC, T.OPERATION, T.OPERATION_OPCODE, T.OPERATION_OPDESC_P, T.OPERATION_OPDESC_S,
    T.EMPLOYE_EMNOM, T.MODEPROD, T.MODEPROD_MPCODE, T.MODEPROD_MPDESC_P, T.MODEPROD_MPDESC_S,
    T.TJQTEPROD, T.TJQTEDEFECT, T.TRANSAC_TRNO, T.TRANSAC_TRITEM,
    T.SMNOTRANS, T.ENTRERPRODFINI_PFNOTRANS, T.TJDEBUTDATE, T.TJFINDATE, T.TJDUREE,
    T.cNomencOp_Machine AS COPMACHINE, T.CNOMENCOP,
    M.DEPARTEMENT, D.DEDESCRIPTION_S, D.DEDESCRIPTION_P,
    dbo.FctFormatNoProd(T.TRANSAC_TRNO, T.TRANSAC_TRITEM) AS NO_PROD,
    I.INDESC1, I.INDESC2, I.INNOINV
FROM TEMPSPROD T
INNER JOIN MACHINE M ON T.MACHINE = M.MASEQ
INNER JOIN DEPARTEMENT D ON M.DEPARTEMENT = D.DESEQ
INNER JOIN PL_RESULTAT PL ON PL.TRANSAC = T.TRANSAC AND PL.CNOMENCOP = T.CNOMENCOP
INNER JOIN cNOMENCOP CNOP ON CNOP.NOPSEQ = T.CNOMENCOP
LEFT OUTER JOIN INVENTAIRE I ON I.INSEQ = T.INVENTAIRE_C
WHERE [filters applied]
ORDER BY T.TJDEBUTDATE DESC, T.TJFINDATE DESC
```

#### 3.2.8 Filter Conditions

| Filter | SQL Condition |
|--------|---------------|
| Date Start | `T.TJDEBUTDATE >= :DateDebut` |
| Date End | `T.TJFINDATE <= :DateFin OR T.TJFINDATE IS NULL` |
| Department | `M.DEPARTEMENT = :Departement` |
| Machine | `T.MACHINE = :Machine` |
| Order # | `dbo.FctFormatNoProd(...) LIKE '%:Commande%'` |

**Note**: If ALL filters are empty, query returns no results (`AND 0=1`).

#### 3.2.9 Table Styling

- Class: `table table-bordered sortableTable table-condensed`
- Header: `thead-light` with sticky positioning
- Cell styling: Font 24px, height 36px, border/text color #2B78E4

---

## 4. Tab 2: Add Hours (AjoutEmploi)

### 4.1 Employee & Date Selection
```
┌──────────────────────────────────────────────────────────────────────────────┐
│ EMPLOYE:  [Code] [Name Display]    JOUR: [Date]    QUART TRAVAIL: [Shift▼]  │
└──────────────────────────────────────────────────────────────────────────────┘
```

**Fields:**
| Field | ID | Type | Description |
|-------|-----|------|-------------|
| Employee Code | CodeEmploye | text | Employee ID, triggers name lookup |
| Employee Hidden | EmployeHomme_0 | hidden | Actual employee EMSEQ |
| Day | DateJour | date | Work date |
| Shift | QuartJour | select | Shift dropdown (Quart 1/2/3) |

**Shift Options:**
| Option | Hours |
|--------|-------|
| Quart 1 | 07:00 - 15:30 |
| Quart 2 | 15:30 - 00:00 |
| Quart 3 | 00:00 - 07:00 |

### 4.2 Time Entry Table
```
┌──────────┬──────────┬──────────┬─────────────┬─────────────┬───────┬──────────┬────────┐
│ Date     │ Date     │ Duree    │ Departement │ Machine     │ Taux  │ Heures   │ Action │
│ Debut    │ Fin      │ (hours)  │             │             │ Effort│ Travail  │        │
├──────────┼──────────┼──────────┼─────────────┼─────────────┼───────┼──────────┼────────┤
│ [datetime│ [datetime│ [calc]   │ [dropdown]  │ [dropdown]  │ [num] │ [calc]   │ [OK]   │
│  _0]     │  _0]     │          │   _0]       │   _0]       │  _0]  │          │        │
└──────────┴──────────┴──────────┴─────────────┴─────────────┴───────┴──────────┴────────┘
```

**Fields:**
| Field | ID | Description |
|-------|-----|-------------|
| Start DateTime | DateDebut_0 | Start of work period |
| End DateTime | DateFin_0 | End of work period |
| Duration | HeuresDates_0 | Auto-calculated (display only) |
| Department | DepartementHomme_0 | Department dropdown |
| Machine | MachineHomme_0 | Machine dropdown (changes with dept) |
| Effort Rate | Effort_0 | Percentage (default 100) |
| Hours Worked | HeuresTravaillees_0 | Duration × Effort % |

**OK Button:**
```html
<button id="btnGO_MOYEN" class="btn btn-outline-retour"
        onClick="AjouteModifieTempsHomme('0','');">
    OK
</button>
```

### 4.3 Employee Results Section
```html
<div id="DivResultatEmploye">
    <!-- Shows employee's existing time entries for selected date -->
</div>
```

---

## 5. Tab 3: Search (Recherche)

### 5.1 Search Filter
```
┌──────────┬──────────┬─────────────┬─────────────┬─────────────────┬────────┐
│ Date     │ Date     │ Departement │ Machine     │ Employe         │ Action │
│ Debut    │ Fin      │             │             │ (dropdown)      │        │
├──────────┼──────────┼─────────────┼─────────────┼─────────────────┼────────┤
│ [date]   │ [date]   │ [dropdown]  │ [dropdown]  │ [dropdown]      │ [OK]   │
└──────────┴──────────┴─────────────┴─────────────┴─────────────────┴────────┘
```

**Additional Field:**
| Field | ID | Description |
|-------|-----|-------------|
| Employee | EmployeRecherche | Employee selection dropdown |

---

## 6. Shift Time Calculation Logic

The system automatically determines the current shift:

```cfm
// Shift 1: 07:00 - 15:30
IF (now between 07:00 and 15:30) → Quart 1

// Shift 2: 15:30 - 00:00 (next day)
IF (now between 15:30 and 00:00) → Quart 2

// Shift 3: 00:00 - 07:00
IF (now between 00:00 and 07:00) → Quart 3
```

---

## 7. Key JavaScript Functions

### 7.1 Employee Lookup
```javascript
function afficheNomEmploye() {
    // Looks up employee by CodeEmploye input
    // Updates DivAfficheEmploye with name
    // Sets EmployeHomme_0 hidden field
}
```

### 7.2 Hours Calculation
```javascript
function CalculHeures(index, suffix) {
    // Calculates duration between DateDebut and DateFin
    // Applies Effort percentage
    // Updates HeuresDates and HeuresTravaillees displays
}
```

### 7.3 Date Change Handler
```javascript
function changeDateDebutFin() {
    // Updates DateDebut_0 and DateFin_0 based on
    // DateJour and QuartJour selection
}
```

### 7.4 Machine Dropdown Update
```javascript
function afficheMachines(index, EMPHSEQ, suffix) {
    // Loads machines for selected department
    // Updates DivAfficheMachine_X container
}
```

### 7.5 Submit Time Entry
```javascript
function AjouteModifieTempsHomme(index, suffix) {
    // Validates inputs
    // Submits to operation.cfc?method=ajouteModifieTempsHomme
    // Refreshes employee time list
}
```

### 7.6 Production Time Search
```javascript
function afficheTempsProd(TJSEQ) {
    // Calls operation.cfc?method=afficheTempsProd
    // Loads results into DivResultatTempsProd
}
```

---

## 8. Database Tables

| Table | Purpose |
|-------|---------|
| EMPLOYE | Employee records (EMSEQ, EMNOM, EMNOIDENT) |
| EQUIPE | Shift/team definitions (EQDEBUTQUART, EQFINQUART) |
| MACHINE | Machine list |
| DEPARTEMENT | Department list |
| EMP_HEURE | Worker time entries (EMPHSEQ, EMPLOYE, MACHINE, etc.) |
| TEMPSPROD | Production time records |

---

## 9. Input Styling

All inputs follow consistent styling:
- Height: 36-44px
- Font size: 24px
- Border color: #2B78E4 (blue)
- Text color: #2B78E4 (blue)

---

## 10. Component References

| Component | Method | Purpose |
|-----------|--------|---------|
| operation.cfc | trouveDepartements | Get department dropdown |
| operation.cfc | afficheTempsHomme | Get worker time data |
| operation.cfc | afficheTempsProd | Get production time data |
| operation.cfc | afficheMachines | Get machine dropdown |
| operation.cfc | afficheMachinesTempsProd | Get machines for prod time filter |
