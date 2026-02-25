# S000 - Screen Flow & Architecture Summary

## Application Overview

**Purpose:** Touch-first manufacturing floor UI for workers to:
- View work orders assigned to their department/machine
- Track production status (start, pause, stop, complete)
- Enter production quantities (good and defective)
- Log material consumption
- Record employee time

---

## Screen Flow Diagram

```
                                    ┌─────────────────┐
                                    │     LOGIN       │
                                    │   (connexion)   │
                                    └────────┬────────┘
                                             │
                                             ▼
┌────────────────────────────────────────────────────────────────────────────────┐
│                           DivPrincipal                                         │
│                      (Work Order List)                                         │
│  ┌─────────────────────────────────────────────────────────────────────────┐  │
│  │ [FILTERS: Period, Date Range, Search, Department, etc.]                 │  │
│  ├─────────────────────────────────────────────────────────────────────────┤  │
│  │  # │ Actions │ Date    │ Order │ Client │ Product │ Qty │ Op │ Status  │  │
│  ├───┼─────────┼─────────┼───────┼────────┼─────────┼─────┼────┼─────────┤  │
│  │ 1 │ [i][OK] │ Jan 15  │ P001  │ ACME   │ Widget  │ 100 │CNC │ ◯       │  │
│  │ 2 │ [i][OK] │ Jan 15  │ P002  │ CORP   │ Gadget  │ 50  │PRS │ ◉       │  │
│  └───┴─────────┴─────────┴───────┴────────┴─────────┴─────┴────┴─────────┘  │
│                     │                             │                          │
│                     │ [i] Consult                 │ [OK] Go                  │
│                     ▼                             ▼                          │
└─────────────────────┬─────────────────────────────┬──────────────────────────┘
                      │                             │
                      │       Type="Consulter"      │        Type="Go"
                      │                             │
                      └──────────────┬──────────────┘
                                     │
                                     ▼
┌────────────────────────────────────────────────────────────────────────────────┐
│                           DivOperation                                         │
│                      (Operation Details)                                       │
│  ┌─────────────────────────────────────────────────────────────────────────┐  │
│  │ Order: P001  │ Client: ACME - PO#123 │ Product: Widget v2.0            │  │
│  │ Qty: 100     │ Produced: 25          │ Remaining: 75    │ Defect: 2    │  │
│  │ Operation: CNC Machining │ Machine: CNC-01  │ Status: IN PROGRESS      │  │
│  └─────────────────────────────────────────────────────────────────────────┘  │
│  ┌─────────────────────────────────────────────────────────────────────────┐  │
│  │ [MACHINE-SPECIFIC INFO: Press settings, Panel layers, etc.]            │  │
│  └─────────────────────────────────────────────────────────────────────────┘  │
│  ┌─────────────────────────────────────────────────────────────────────────┐  │
│  │ FOOTER: [BACK] ........................ [SETUP][▶PROD][⏸PAUSE][⏹STOP][⏭COMP] │  │
│  └─────────────────────────────────────────────────────────────────────────┘  │
│                              │         │                    │       │        │
│                              │         │                    │       │        │
└──────────────────────────────┼─────────┼────────────────────┼───────┼────────┘
                               │         │                    │       │
                ┌──────────────┘         │                    │       └────────────┐
                │                        │                    │                    │
                ▼                        ▼                    ▼                    ▼
┌──────────────────────┐  ┌──────────────────────┐  ┌──────────────────────────────────┐
│  DivQuestionnaireSetUp │  │  (Stays in          │  │      DivQuestionnaire            │
│  (Setup Survey)        │  │   DivOperation)     │  │      (Exit Survey)               │
│                        │  │                     │  │                                  │
│  - Setup checklist     │  │  Updates status     │  │  - Stop cause (if STOP)          │
│  - Tool verification   │  │  to PROD/PAUSE      │  │  - Qty Good entry                │
│  - Employee code       │  │                     │  │  - Qty Defect entry              │
│                        │  │                     │  │  - Material consumption          │
│  [Cancel] [OK]         │  │                     │  │  - Employee assignment           │
│         │              │  │                     │  │                                  │
│         ▼              │  │                     │  │  [X Cancel]         [OK Submit]  │
│  → DivOperation        │  │                     │  │         │                │       │
└──────────────────────┘  └──────────────────────┘  │         ▼                ▼       │
                                                    │  → DivOperation    → DivOperation│
                                                    └──────────────────────────────────┘
```

---

## Status State Machine

```
     ┌─────────┐
     │  IDLE   │ (No production started)
     └────┬────┘
          │ [SETUP] or [PROD]
          ▼
     ┌─────────┐
     │  SETUP  │ (Machine setup in progress)
     └────┬────┘
          │ [PROD]
          ▼
     ┌─────────┐◄──────────────────────┐
     │  PROD   │ (Production running)  │
     └────┬────┘                       │
          │                            │
     ┌────┼────┬──────────────┐        │
     │    │    │              │        │
     │    │    │ [PAUSE]      │        │
     │    │    ▼              │        │
     │    │  ┌───────┐        │        │
     │    │  │ PAUSE │────────┼────────┘
     │    │  └───────┘ [PROD] │
     │    │                   │
     │    │ [STOP]            │ [COMP]
     │    ▼                   ▼
     │  ┌─────────┐      ┌─────────┐
     │  │  STOP   │      │  COMP   │
     │  └────┬────┘      └────┬────┘
     │       │                │
     │       │ (After survey) │ (After survey)
     │       ▼                ▼
     │  ┌─────────┐      ┌─────────┐
     │  │  PROD   │      │  DONE   │ (Operation complete)
     │  └─────────┘      └─────────┘
     │       │
     └───────┘
```

---

## Key Data Entities

### Core Transaction Data
| Entity | Table | Description |
|--------|-------|-------------|
| Order | TRANSAC | Production order header |
| Operation | cNOMENCOP | Operation-machine assignment |
| Time Record | TEMPSPROD | Production time tracking |
| Material Output | SORTIE_MATERIEL | Material consumption |
| Finished Product | ENTREPF | Inventory creation |
| Defect Detail | DET_DEFECT | Defect tracking |

### Reference Data
| Entity | Table | Description |
|--------|-------|-------------|
| Department | DEPARTEMENT | Production departments |
| Machine | MACHINE | Production machines |
| Employee | EMPLOYE | Workers |
| Stop Cause | QA_CAUSEP, QA_CAUSES | Stop/pause reasons |
| Product | INVENTAIRE | Inventory items |

---

## Session Variables

```javascript
// User/Workstation Identity
session.InfoClient.EmNoIdent      // Employee ID
session.InfoClient.NOMEMPLOYE     // Employee name
session.InfoClient.CodeFonction   // Role code (1027=operator, 1031=cell chief)

// Current Context
session.InfoClient.Departement    // Selected department
session.InfoClient.PourMachine    // Selected machine
session.InfoClient.Entrepot       // Selected warehouse
session.InfoClient.Poste          // Workstation ID

// Current Operation
session.InfoClient.TRANSAC        // Active order ID
session.InfoClient.COPMACHINE     // Active operation-machine
session.InfoClient.NOPSEQ         // Active operation sequence
session.InfoClient.TJSEQ          // Active time record

// Filter State (Filtre1-13)
session.InfoClient.Filtre1        // Orders to show type
session.InfoClient.Filtre2        // Time period
session.InfoClient.Filtre5        // Date from
session.InfoClient.Filtre6        // Date to
session.InfoClient.Filtre11       // Search text

// UI State
session.InfoClient.Page           // Current div name
session.InfoClient.Type           // View type (Consulter/Go)
session.InfoClient.ListeMachines  // Comma-separated machine IDs
session.AvecClavier               // Virtual keyboard enabled (0/1)
session.Langue                    // Language code (FR/EN)
```

---

## CFC Component Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         operation.cfc                           │
│  - afficheDiv() : Main router for all screens                  │
│  - trouveCommande() : Find orders for workstation              │
│  - afficheMachines() : Machine dropdowns                       │
└─────────────────────┬───────────────────────────────────────────┘
                      │
        ┌─────────────┼─────────────┬─────────────────────┐
        │             │             │                     │
        ▼             ▼             ▼                     ▼
┌───────────────┐ ┌───────────┐ ┌────────────────┐ ┌──────────────┐
│  support.cfc  │ │tableau.cfc│ │QuestionnaireSortie│ │ TempsProd.cfc│
│               │ │           │ │                   │ │              │
│ - afficheEntete│ │ - Build   │ │- afficheTableau  │ │- afficheEmploye│
│ - affichePied  │ │   table   │ │  Questionnaire   │ │- afficheTempsProd│
│ - trouveUne    │ │   rows    │ │- ajouteModifie   │ └──────────────┘
│   Operation    │ └───────────┘ │  Statut          │
└───────────────┘               └───────────────────┘
        │                                │
        │                    ┌───────────┼───────────┐
        │                    │           │           │
        │                    ▼           ▼           ▼
        │              ┌──────────┐ ┌──────────┐ ┌────────────┐
        │              │QteBonne  │ │QteDefect │ │ProduitFini │
        │              │.cfc      │ │.cfc      │ │.cfc        │
        │              └──────────┘ └──────────┘ └────────────┘
        │                    │           │           │
        │                    └───────────┼───────────┘
        │                                │
        │                                ▼
        │                       ┌────────────────┐
        │                       │SortieMateriel  │
        │                       │.cfc            │
        └──────────────────────►└────────────────┘
```

---

## Touch UI Specifications

### Button Sizes (from existing CSS)
| Element | Height | Width | Font Size |
|---------|--------|-------|-----------|
| Small button (btn-xs) | 38px | 50px | 16px |
| Large button (btn-lg) | - | - | 24px |
| Input fields | 44px | varies | 24px |
| Table rows | ~40-50px | - | 14-18px |

### Icon Sizes
- Standard: 24x24 SVG
- Status indicators: 24x24 PNG

### Color Palette (Button Classes)
| Class | Color | Use |
|-------|-------|-----|
| btn-outline-consulte | #2B78E4 (blue) | Info/view |
| btn-outline-go | #009E0F (green) | Go/start |
| btn-outline-prod | #009E0F (green) | Production |
| btn-outline-setup | #9900FF (purple) | Setup |
| btn-outline-pause | #FF9900 (orange) | Pause |
| btn-outline-stop | #CC0000 (red) | Stop |
| btn-outline-comp | #2B78E4 (blue) | Complete |
| btn-outline-retire | #CC0000 (red) | Cancel/remove |
| btn-outline-retour | #009E0F (green) | OK/return |

---

## Migration Priority Screens

Based on user workflow:

### Phase 1: Core Production Flow
1. **S001** - Main app shell (header/footer/navigation)
2. **S002** - Work order list (DivPrincipal)
3. **S003** - Operation details (DivOperation)
4. **S004** - Exit questionnaire (DivQuestionnaire)

### Phase 2: Supporting Features
5. Setup questionnaire (DivQuestionnaireSetUp)
6. Time tracking (DivTempsHomme)
7. Corrections (DivCorrection)

### Phase 3: Popups/Modals
8. SKID scanning modal
9. Label printing modal
10. Warehouse transfer modal
11. Message/alert modals

---

## Files to Reference During Migration

| Legacy File | Purpose | New React Component |
|-------------|---------|---------------------|
| `index.cfm` | Main container | `App.tsx` + layout |
| `sp_js.cfm` | Core JS logic | React hooks + context |
| `Tableau_principal.cfm` | WO list row | `WorkOrderRow.tsx` |
| `afficheTableauOperation_body.cfm` | Op details | `OperationDetails.tsx` |
| `QuestionnaireSortie.cfc` | Exit form | `ExitQuestionnaire.tsx` |
| `support.cfc` | Header/footer | `Header.tsx`, `Footer.tsx` |
| `dictionnaire.cfm` | i18n strings | `locales/*.json` |
