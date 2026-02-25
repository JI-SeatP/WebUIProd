# S001 - Main Application Structure Analysis

## Source Files Analyzed
- `src/old/EcransSeatPly/index.cfm` - Root redirect
- `src/old/EcransSeatPly/prive/multilangue/index.cfm` - Main HTML container
- `src/old/EcransSeatPly/prive/multilangue/sp_js.cfm` - Core JavaScript logic (partial - very large file)

---

## 1. Application Entry Point (`index.cfm`)

**Purpose:** Simple redirect page that routes to `web_public_1` regardless of device type.

**Logic:**
- Detects mobile devices (640-1024px width)
- Currently redirects all users to same location (mobile check appears unused)

---

## 2. Main HTML Container (`prive/multilangue/index.cfm`)

### 2.1 Session/Authentication
- Checks for `url.POSTE` parameter (workstation ID)
- Validates `session.InfoClient.NOMEMPLOYE` exists
- Redirects to logout (`web_logout/mess_10`) if session invalid

### 2.2 Device Detection
- Massive regex to detect mobile devices via User-Agent
- Sets `Appareil` variable to "Mobile" or "Ordinateur"

### 2.3 Page Layout Structure
```
wrapper/
├── header.headerPrive
│   └── container-fluid
│       └── #DivHeader (dynamic - loaded via AJAX)
├── #main.container
│   └── (padding-top: 90px)
│       ├── #DivPrincipal      ← Work order list screen
│       ├── #DivOperation      ← Operation details screen
│       ├── #DivInventaire     ← Inventory screen
│       ├── #DivAucun          ← "No orders" screen
│       ├── #DivTempsHomme     ← Worker time entry screen
│       ├── #DivQuestionnaire  ← Production qty entry (STOP/COMP)
│       ├── #DivQuestionnaireSetUp ← Setup questionnaire
│       ├── #DivCorrection     ← Corrections screen
│       └── #Info* divs        ← Various popup containers
└── footer.footerPrive
    └── container-fluid
        └── #DivFooter (dynamic - loaded via AJAX)
```

### 2.4 Modal Components
- `#modalAttente` - Loading/waiting spinner modal
- `#modaleZero` - Zero value warning modal
- Error block modals for validation

### 2.5 Included Resources
**CSS:**
- Bootstrap, Bootstrap-Select
- jQuery UI 1.13.2
- Custom numpad (`numpad-light.css`)
- Custom icons (`iconesEcransUsine`)
- Virtual keyboard (`keyboard.css`)
- Main styles (`style_sp.css`)

**JS:**
- jQuery 2.2.4
- Bootstrap + plugins
- jQuery UI
- iScroll
- Numpad (`numpad.js`)
- Virtual keyboard (`keyboard.js`)
- `sp_js.cfm` - Main application logic

---

## 3. Core JavaScript Logic (`sp_js.cfm`)

### 3.1 Global Variables (from session)
```javascript
var avecClavier         // Virtual keyboard enabled (0/1)
var dsClient            // Database source name
var Langue              // Language code
var Racine              // Application root URL
var CheminCFC           // Path to CFC components
var PourDepartement     // Current department filter
var PourMachine         // Current machine filter
var PourEntrepot        // Current warehouse filter
var PourPoste           // Current workstation
var PourTRANSAC         // Current transaction ID
var PourCOPMACHINE      // Current operation machine
var PourNOPSEQ          // Current operation sequence
var Def_TJSEQ           // Current time job sequence
var Def_Filtre1-13      // Various filter values
var Def_ListeMachines   // Machine list for department
var Def_Div             // Current active div/screen
```

### 3.2 Main Screen Navigation Function
**`afficheDiv(LeDiv, TRANSAC, Type, COPMACHINE, NOPSEQ, MASEQ, Prochain, TJSEQ, Departement)`**

This is the CORE navigation function. It:
1. Adjusts viewport heights for zoom
2. Checks service web connectivity (for critical screens)
3. Hides all content divs except target
4. Shows loading spinner
5. Saves all filter values to session via AJAX
6. Calls `operation.cfc?method=afficheDiv` to fetch screen HTML
7. Injects returned HTML into target div
8. Calls `afficheEntete()` and `affichePiedDePage()` to load header/footer
9. Attaches virtual keyboard to input fields

**Screen Types (LeDiv values):**
| Div Name | Purpose |
|----------|---------|
| DivPrincipal | Main work order list |
| DivOperation | Operation details for selected order |
| DivInventaire | Inventory management |
| DivAucun | "No orders found" message |
| DivTempsHomme | Worker time entry/tracking |
| DivQuestionnaire | Production quantities (STOP/COMP status) |
| DivQuestionnaireSetUp | Setup questionnaire |
| DivCorrection | Data corrections |

### 3.3 Status Change Function
**`changeStatut(Type, Statut, TRANSAC, COPMACHINE, NOPSEQ, DEPARTEMENT, MASEQ)`**

Handles production status transitions:
- `PROD` - Start production
- `STOP` - Stop/pause production
- `COMP` - Complete production

When status is PROD and mode is SETUP, shows confirmation dialog asking if user wants to fill setup questionnaire.

### 3.4 Key Data Entry Functions

**Defect Tracking:**
- `AjouteModifieDetailDEFECT()` - Add/modify defect entry
- `AjouteModifieDetailDEFECTQS()` - Questionnaire version
- `retireDetailDEFECT()` - Remove defect entry
- `afficheTableauDEFECT()` - Display defect table

**Finished Products:**
- `AjouteModifieEPF()` - Add/modify finished product entry
- `AjouteModifieEPFQS()` - Questionnaire version
- `calculeQteBonnePF()` - Calculate good quantity
- `afficheTableauEPF()` - Display finished products table

**Time Tracking:**
- `AjouteModifieTempsHomme()` - Add/modify worker time
- `afficheTempsHomme()` - Show time entries
- `afficheTempsProd()` - Show production time
- `ModifieTempsProduction()` - Modify production time entry

### 3.5 Filter System (Filtre1-13)
| Filter | Purpose |
|--------|---------|
| Filtre1 | Orders to retrieve type |
| Filtre2 | Specific period |
| Filtre3 | QA Type |
| Filtre4 | QA Status |
| Filtre5 | Start date |
| Filtre6 | End date |
| Filtre7 | Priorities (for forklift) |
| Filtre8 | 0=All, 1=To complete, 2=Complete |
| Filtre9 | TRNO for inventory |
| Filtre10 | INVENTAIRE_INNOINV |
| Filtre11 | Open text search |
| Filtre12 | Department dropdown (time prod) |
| Filtre13 | Machine dropdown (time prod) |

### 3.6 Popup/Modal Functions
- `afficheModifieTempsProduction()` - Time production edit modal
- `afficheMessage()` - Message modal
- `afficheSKID()` - SKID/pallet modal
- `afficheETIQUETTE()` - Label printing modal
- `afficheMOUVEMENT()` - Movement modal
- `afficheTRANSFERTENTREPOT()` - Warehouse transfer modal

### 3.7 CFC (Component) Files Referenced
| CFC File | Purpose |
|----------|---------|
| `operation.cfc` | Core operations (afficheDiv, trouveCommande, etc.) |
| `support.cfc` | Support functions (header, footer, modals) |
| `QuestionnaireSortie.cfc` | Exit questionnaire logic |
| `QteDefect.cfc` | Defect quantity management |
| `ProduitFini.cfc` | Finished product management |
| `general.cfc` | General utilities (language change) |
| `initialise.cfc` | Session initialization |

---

## 4. Key Observations for Migration

### 4.1 Screen Flow
1. User logs in (workstation-based or user-based)
2. Lands on DivPrincipal (work order list)
3. Selects order → goes to DivOperation
4. Changes status (PROD/STOP/COMP) → may trigger DivQuestionnaire
5. Enters quantities, defects, time → saves back

### 4.2 Touch UI Elements Already Present
- Virtual keyboard attachment (`VKI_attach`)
- Numpad component for numeric input
- Large buttons (see CSS classes like `btn-outline-retour`)

### 4.3 Data Persistence
- All screen state saved to CF session
- Filter values persist across navigation
- AJAX calls to CFC methods for all data operations

### 4.4 Bilingual Support
- `Langue` variable throughout
- Dictionary file included (`dictionnaire.cfm`)
- All text labels from variables (e.g., `LeTitreAttendre`)

---

## Next Steps
1. Document Tableau_principal.cfm (main work order table)
2. Document afficheTableauOperation_body.cfm (operation details)
3. Capture screenshots of each major screen
4. Map CFC methods to new API endpoints
