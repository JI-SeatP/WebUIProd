# S003 - Operation Details Screen (DivOperation) Analysis

## Source Files
- `src/old/EcransSeatPly/cfc/afficheTableauOperation_body.cfm` - Main operation details layout
- `src/old/EcransSeatPly/cfc/support.cfc` - Footer with action buttons

---

## 1. Screen Layout Overview

The operation screen is divided into sections:

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                         HEADER INFO BLOCK (Arrondi)                          │
├───────────┬───────────┬──────────────┬────────┬────────────┬────────────────┤
│ Order #   │ Client    │ Product      │ Qty    │ Operation  │ Status         │
│ NO_PROD   │ + PO#     │ + Version    │ Labels │ + Machine  │                │
│           │           │ [doc btn]    │ Values │ [info btn] │                │
└───────────┴───────────┴──────────────┴────────┴────────────┴────────────────┘
┌─────────────────────────────────┬───────────────────────────────────────────┐
│   LEFT PANEL                    │   RIGHT PANEL                             │
│   (varies by machine family)    │   Machine Info Block                      │
│   - Press: Materials, Mold      │   - Scheduled dates                       │
│   - CNC: Components, Steps      │   - Machine selection                     │
│   - VCUT: Big sheets            │   - Type, Group, Notes                    │
└─────────────────────────────────┴───────────────────────────────────────────┘
┌──────────────────────────────────────────────────────────────────────────────┐
│   DETAIL TABLES (varies by operation type)                                   │
│   - Panel layers table (for PRESS)                                           │
│   - Material consumption table                                               │
│   - SKID/container tables                                                    │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Header Info Block (Always Visible)

### 2.1 Layout: Bootstrap 12-column grid
```
col-2: Order #       col-2: Client/PO    col-3: Product       col-1: Qty Labels
col-1: Qty Values    col-2: Operation    col-1: Status
```

### 2.2 Order Section
- Order number (NO_PROD)
- Search/detail button (conditional on `VoirTout`)

### 2.3 Client Section
- Client name
- PO number (CONOPO)

### 2.4 Product Section
- Product description + code
- Version/revision number
- Document view button (conditional)
- For PRESS: Second row for Panel info

### 2.5 Quantity Section
**Labels (French/English):**
| FR Label | EN Equivalent | Description |
|----------|--------------|-------------|
| Qte | Qty | Quantity to make |
| Pressee/Machinee/Produite | Pressed/Machined/Produced | Based on machine family |
| Qte Restante | Remaining | Remaining quantity |
| Defect | Defect | Defective quantity |

**Values:**
- Quantity to fabricate (with `+X` for additional press qty)
- Produced quantity
- Remaining quantity
- Defective quantity

### 2.6 Operation Section
- Operation name (EN/FR)
- Machine name (EN/FR)
- Instructions button (for newer versions with METHODE)

### 2.7 Status Section
- Status label (colored by `LaCouleurStatut`)

---

## 3. Machine-Specific Sections

### 3.1 PRESS Family (`FMCODE` contains "PRESS")

**Materials Ready Block:**
- Shows if raw materials are in place (checkmark)
- Shows if mold is ready (checkmark)

**Mold Info Block:**
| Field | Description |
|-------|-------------|
| Mold Code | Mold identifier |
| Pieces/Cavity | Units per mold cavity |
| Cavities/Mold | Number of cavities |
| Ecart (Gap) | Gap measurement (decimal or fraction) |
| Thickness 1/2/3 | Layer thicknesses |
| Mold Type | Type classification |
| Cook Time | Press time (PRESSAGE_PRESSAGE) |
| Cool Time | Cooling time (PRESSAGE_TEST_APRES) |

**Panel Layers Table:**
| Col | Field |
|-----|-------|
| Seq | Layer sequence (NIRANG) |
| L | Length (NILONGUEUR) |
| W | Width (NILARGEUR) |
| Species | Wood species |
| GR | Grade |
| Cut | Cut type (RC/QC/FC) |
| Thickness | Layer thickness |
| Grain | Grain direction |
| P_LAM | Subcategory |
| GL/CO | Glue |
| TAPE/RUB | Taped (Yes/No) |
| SAND/SABL | Sanded (Yes/No) |

### 3.2 CNC/Sanding Family (`FMCODE` contains "CNC" or "Sand")

**Next Step Block:**
- Shows next operation/machine
- Panel routing info
- Finishing details (Type, Scope, Description)

**Components Table** (`afficheComposantes`)

**Operation Steps** (`afficheEtapesOperation`)

**Accessories** (`afficheAccessoires`)

### 3.3 VCUT Operations

**Big Sheet Info:**
- Quantity of big sheets
- Description

**Products Table:**
| Col | Description |
|-----|-------------|
| Item Code | Inventory code |
| Description | Item description |
| Grain | Grain direction |
| Used/Req | Used vs Required qty |
| Prod/Total | Produced vs Total |
| Defect | Defective count |

**Containers Table:**
| Col | Description |
|-----|-------------|
| SKID | Container number |
| Qty | Quantity |
| Warehouse | Location code |
| Description | Location name |

---

## 4. Machine Info Block (Right Panel)

### 4.1 Date Information
| Row | Left Label | Left Value | Right Label | Right Value |
|-----|------------|------------|-------------|-------------|
| 1 | Scheduled Start | PREVU_DEBUT | Actual Start | TJDATE |
| 2 | Available | Machine selector OR name | Assigned | Machine name |
| 3 | Type | PV_TYPE | Group | GROUPE |

### 4.2 Machine Selection Dropdown
Only visible when `Type = "GO"` and `VoirTout = 1`:
```html
<select id="MACHINE_MASEQ" onChange="afficheMachineAttribuee(...)">
    <option value="MASEQ">Machine Name</option>
    ...
</select>
```

### 4.3 Notes Section
Displays notes based on machine family:
- `PRESSAGE_NOTE` for PRESS
- `FINITION_NOTE` for FINISH
- `EMBALLAGE_NOTE` for PACK
- `PLACAGE_NOTE` for others
- Also shows `TRNOTE` (transaction note)

---

## 5. Footer Action Buttons

Located in `support.cfc`, loaded via `affichePiedDePage()`:

### 5.1 Button Group (Status Dependent)

**When production NOT started:**
```html
<button id="btnSETUP" class="btn btn-outline-setup btn-lg Attente">
    [Wrench Icon - Purple #9900FF]
</button>
<button id="btnPROD" class="btn btn-outline-prod btn-lg Attente">
    [Play Icon - Green #009E0F]
</button>
```

**When production IN PROGRESS:**
```html
<button id="btnSETUP" class="btn btn-outline-setup btn-lg Attente">
<button id="btnPAUSE" class="btn btn-outline-pause btn-lg Attente">
    [Pause Icon - Orange #FF9900]
</button>
<button id="btnSTOP" class="btn btn-outline-stop btn-lg Attente">
    [Stop Icon - Red #CC0000]
</button>
<button id="btnCOMP" class="btn btn-outline-comp btn-lg Attente">
    [Skip-End Icon - Blue #2B78E4]
</button>
```

### 5.2 Button Sizes
- Class: `btn-lg` (large)
- SVG icons: 24x24

### 5.3 Status Transitions
| Button | Status Code | Action |
|--------|-------------|--------|
| SETUP | SETUP | Opens setup questionnaire |
| PROD | PROD | Starts/resumes production |
| PAUSE | PAUSE | Pauses production |
| STOP | STOP | Stops production, opens exit questionnaire |
| COMP | COMP | Completes operation, opens exit questionnaire |

### 5.4 Button Handler
```javascript
function changeStatut(Type, Statut, TRANSAC, COPMACHINE, NOPSEQ, DEPARTEMENT, MASEQ) {
    // Shows loading modal
    // Calls QuestionnaireSortie.cfc?method=ajouteModifieStatut
    // On STOP/COMP: navigates to DivQuestionnaire
    // On PROD + SETUP mode: shows setup confirmation dialog
    // Otherwise: stays on DivOperation
}
```

---

## 6. Special Alerts

### 6.1 PPAP Alert (Process Control)
Red alert box when `trouvePPAP.RecordCount > 0`:
- Shows PPAP description and number
- Requires supervisor approval message

### 6.2 "Do Not Press" Alert
For outsourced panels, shows warning with:
- ITEM CODE
- BOM PANEL CODE
- PANEL CODE TO OUT

---

## 7. CSS Classes Used

| Class | Purpose |
|-------|---------|
| `.Arrondi` | Rounded border container |
| `.border-right` | Vertical separator |
| `.btn-outline-consulte` | Blue info button |
| `.btn-outline-go` | Green OK button |
| `.btn-outline-setup` | Purple setup button |
| `.btn-outline-prod` | Green play button |
| `.btn-outline-pause` | Orange pause button |
| `.btn-outline-stop` | Red stop button |
| `.btn-outline-comp` | Blue complete button |
| `.btn-outline-message` | Blue message/info button |
| `.Attente` | Enables loading modal on click |

---

## 8. Key Query Data

**`trouveOperation` - Main operation data:**
- NO_PROD, NOM_CLIENT, CONOPO
- OPERATION_S/P, MACHINE_S/P
- PRODUIT_CODE, NO_INVENTAIRE
- FMCODE (machine family code)
- REVISION, GROUPE
- SHARE_PRESSING, Panel_NiSeq
- ESTKIT (kit flag)

**`trouveLesDetailsOperation` - Press/operation details:**
- MOULE_CODE, MOULE_TYPE, MOULE_CAVITES, MOULE_ECART
- PANNEAU_CAVITE
- PRESSAGE_PRESSAGE, PRESSAGE_TEST_APRES
- PRESSAGE_NOTE, FINITION_NOTE, etc.

**`local.Statut` - Status information:**
- Same as work order list

# UPDATED  
Here's the full breakdown of queries used when loading the Operation Details screen:

---

### 1. `getOperation.cfm` — **Main operation header data**

- **Params:** `transac`, `copmachine`
- **Hook:** `useOperation`
- **Populates:** The entire top section — order number, client, product, quantities (Qté à fabriquer, Qté produite, Qté restante, Qté défect), operation type, machine name, status, mold info, next step, panel warning, dates, etc.
- **Queries internally:**
    - `vEcransProduction` view (from EXT db) — main operation data
    - `VSP_BonTravail_Entete` — press/mold-specific fields (DCQTE_A_FAB, Mold, etc.)
    - `AUTOFAB_TRANSAC` — TRNOTE (transaction note)
    - `AUTOFAB_FctSelectVarCompo` — MOULE_TYPE
    - `AUTOFAB_TEMPSPROD` — sum of TJQTEDEFECT (scrap qty)
    - `VOperationParTransac` — next step info (next operation/machine/dept)
    - `INSTRUCTION` + `METHODE` — step instructions and accessories


#### From `vEcransProduction` view (EXT db)

| Field                                          | Description                         |
| ---------------------------------------------- | ----------------------------------- |
| `DATE_DEBUT_PREVU`                             | Planned start date                  |
| `DATE_FIN_PREVU`                               | Planned end date                    |
| `PR_DEBUTE`                                    | Started flag                        |
| `PR_TERMINE`                                   | Completed flag                      |
| `NO_PROD`                                      | Order number (e.g. CO-016913-001)   |
| `NOM_CLIENT`                                   | Client name                         |
| `CODE_CLIENT`                                  | Client code                         |
| `CONOPO`                                       | PO number                           |
| `INVENTAIRE_SEQ`                               | Inventory sequence                  |
| `NO_INVENTAIRE`                                | Inventory code                      |
| `INVENTAIRE_P` / `INVENTAIRE_S`                | Inventory description FR/EN         |
| `REVISION`                                     | Revision number                     |
| `MATERIEL_SEQ`                                 | Material sequence                   |
| `MATERIEL_CODE`                                | Material code                       |
| `MATERIEL_P` / `MATERIEL_S`                    | Material description FR/EN          |
| `PRODUIT_SEQ`                                  | Product sequence                    |
| `PRODUIT_CODE`                                 | Product code                        |
| `PRODUIT_P` / `PRODUIT_S`                      | Product description FR/EN           |
| `KIT_SEQ`                                      | Kit sequence                        |
| `INVENTAIRE_VCUT`                              | VCUT inventory                      |
| `VCUT_INNOINV`, `VCUT_INDESC1`, `VCUT_INDESC2` | VCUT fields                         |
| `OPERATION_SEQ`                                | Operation sequence number           |
| `OPERATION`                                    | Operation code                      |
| `OPERATION_P` / `OPERATION_S`                  | Operation description FR/EN         |
| `ORDRERECETTE`                                 | Recipe order (for next step lookup) |
| `TAUXHORAIREOPERATION`                         | Hourly rate                         |
| `CNOMENCLATURE`                                | Nomenclature sequence               |
| `CNOM_QTE`                                     | Nomenclature quantity               |
| `QTE_PAR_EMBAL`                                | Qty per packaging                   |
| `QTE_PAR_CONT`                                 | Qty per container                   |
| `NIQTE`                                        | Inventory quantity                  |
| `QTE_A_FAB`                                    | Qty to manufacture                  |
| `QTE_PRODUITE`                                 | Qty produced                        |
| `QTE_RESTANTE`                                 | Qty remaining                       |
| `QTE_FORCEE`                                   | Forced qty                          |
| `QTY_REQ`                                      | Required qty                        |
| `MACHINE`                                      | Machine seq                         |
| `MACODE`                                       | Machine code                        |
| `MACHINE_P` / `MACHINE_S`                      | Machine description FR/EN           |
| `UNITE_P` / `UNITE_S`                          | Unit FR/EN                          |
| `TRANSAC`                                      | Transaction sequence                |
| `NOPSEQ`                                       | Operation seq (CNOMENCOP)           |
| `COPMACHINE`                                   | Machine assignment seq (CNOM_SEQ)   |
| `Panneau`                                      | Panel code                          |
| `PPINNOINV`                                    | Panel inventory code                |
| `FMCODE`                                       | Machine family code                 |
| `FAMILLEMACHINE`                               | Machine family                      |
| `STATUT_CODE`                                  | Status code                         |
| `STATUT_P` / `STATUT_S`                        | Status description FR/EN            |
| `TJFINDATE`                                    | Time journal end date               |
| `TERMINE`                                      | Finished flag                       |
| `TJSEQ`                                        | Time journal sequence               |
| `DESEQ`                                        | Department seq                      |
| `DECODE`                                       | Department code                     |
| `DeDescription_P` / `DeDescription_S`          | Department desc FR/EN               |
| `DCPRIORITE`                                   | Priority                            |
| `ESTKIT`                                       | Is kit flag                         |
| `TYPEPRODUIT`                                  | Product type                        |
| `DEPARTEMENT`                                  | Department                          |
| `TREPOSTER_TRANSFERT`                          | Transfer flag                       |

#### From `VSP_BonTravail_Entete` (VBE) — Press-specific

|Field|Returned As|
|---|---|
|`VBE.DCQTE_A_FAB`|`VBE_DCQTE_A_FAB`|
|`VBE.DCQTE_A_PRESSER`|`DCQTE_A_PRESSER`|
|`VBE.DCQTE_PRESSED`|`DCQTE_PRESSED`|
|`VBE.DCQTE_PENDING_TO_PRESS`|`DCQTE_PENDING_TO_PRESS`|
|`VBE.DCQTE_PENDING_TO_MACHINE`|`DCQTE_PENDING_TO_MACHINE`|
|`VBE.DCQTE_FINISHED`|`DCQTE_FINISHED`|
|`VBE.DCQTE_REJET`|`DCQTE_REJET`|
|`VBE.PCS_PER_PANEL`|`PCS_PER_PANEL`|
|`VBE.CONOPO`|`VBE_CONOPO`|
|`VBE.SHARE_PRESSING`|`SHARE_PRESSING`|
|`VBE.PAGE_COMPO`|`PAGE_COMPO`|
|`VBE.Panel_NiSeq`|`Panel_NiSeq`|
|`VBE.Mold`|`MOULE_CODE`|
|`VBE.NUM_PER_PACK`|`PANNEAU_CAVITE`|
|`VBE.OPENING`|`MOULE_CAVITE`|
|`VBE.[ACTUAL GAP]`|`MOULE_ECART`|
|`VBE.PV_Groupe`|`GROUPE`|
|`VBE.PRODUCT_TYPE`|`VBE_TYPEPRODUIT`|
|`VBE.PANEL_SOURCE`|`PANEL_SOURCE`|
|`VBE.PV_PANEAU`|`PV_PANEAU`|

#### From `AUTOFAB_TRANSAC`

|Field|Description|
|---|---|
|`TRNOTE`|Transaction note|

#### Computed / Function fields

|Field|Source|
|---|---|
|`MOULE_TYPE`|`AUTOFAB_FctSelectVarCompo(..., '@MOLD_TYPE@')`|
|`PRESSAGE_PRESSAGE`|`AUTOFAB_FctSelectVarCompo(..., '@TIME_PR_PRESSING@')`|
|`PRESSAGE_TEST_APRES`|`AUTOFAB_FctSelectVarCompo(..., '@TIME_PR_TEST_PR@')`|
|`PRESSAGE_NOTE`|`AUTOFAB_FctSelectVarCompo(..., '@PRESS_NOTE@')`|
|`NOPQTESCRAP`|`SUM(TJQTEDEFECT)` from AUTOFAB_TEMPSPROD|

#### Appended by secondary queries

|Field|Source|
|---|---|
|`NEXT_OPERATION`|Boolean — from VOperationParTransac|
|`NEXT_OPERATION_P` / `_S`|Next op description FR/EN|
|`NEXT_MACHINE_P` / `_S`|Next machine description FR/EN|
|`NEXT_DEPT_P` / `_S`|Next department description FR/EN|
|`steps[]`|Array of instruction/method objects (METSEQ, METNUMERO, METDESC_P/S, PDF/video paths, IMAGE_COUNT)|

### 2. `getPanelData.cfm` — **Panel detail + layers table**

- **Params:** `transac`, `panelNiSeq`
- **Called from:** `useEffect` in `OperationDetailsPage`
- **Populates:** The panel info card (Panneau code, Description, Version, Type, Poids) and the panel layers table (species, dimensions, grade, grain, glue, etc.)

### 3. `getOperationComponents.cfm` — **Étapes de production (production steps)**

- **Params:** `transac`, `copmachine`
- **Hook:** `useOperationComponents`
- **Populates:** The "Étapes de production" table — step number, description, quantity, method instructions

### 4. `getOperationAccessories.cfm` — **Accessoires nécessaires**

- **Params:** `transac`, `copmachine`
- **Hook:** `useOperationAccessories`
- **Populates:** The "Accessoires nécessaires" column next to the production steps

### 5. `getDrawings.cfm` — **Product/panel drawings**

- **Params:** `produitSeq`, `inventaireSeq`, `kitSeq` (varies)
- **Called from:** `useEffect` in `OperationDetailsPage`
- **Populates:** The drawing viewer panel (right side). For PRESS operations, defaults to panel drawing first, falls back to product drawing. For CNC, loads product drawing directly.

### 6. `getOrderOperations.cfm` — **All operations for the order** _(loaded on demand)_

- **Params:** `noProd`
- **Hook:** `useOrderOperations`
- **Populates:** Used when navigating between operations of the same order (operation selector dropdown)