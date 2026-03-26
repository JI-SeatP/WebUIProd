# Status Action Buttons — Overview

## What Are They

The status action buttons are a set of 5 buttons (SETUP, PROD, PAUSE, STOP, COMP) displayed on the **Operation screen** (the page a worker sees after selecting a work order and operation). They allow the worker to change the production status of the current operation, which drives time tracking in the `TEMPSPROD` table.

Each button click:
1. **Closes** the current time-tracking row (sets its end date/time)
2. **Opens** a new time-tracking row for the new status (sets its start date/time)
3. Navigates to the appropriate screen based on the new status:
   - **STOP/COMP** → Questionnaire screen (to collect quantities and defect data)
   - **PROD from SETUP** → Confirmation dialog asking whether to fill the Setup Questionnaire
   - **All others** → Stay on (or return to) the Operation screen

## Status Codes

| Code   | MODEPROD.MPCODE | Meaning                             | Icon Color     |
|--------|-----------------|--------------------------------------|----------------|
| SETUP  | `Setup`         | Machine setup / preparation          | Purple #9900FF |
| PROD   | `Prod`          | Active production                    | Green #009E0F  |
| PAUSE  | `PAUSE`         | Temporarily paused                   | Amber #FF9900  |
| STOP   | `STOP`          | Stopped (requires questionnaire)     | Red #CC0000    |
| COMP   | `COMP`          | Completed (requires questionnaire)   | Blue #2B78E4   |

> **Note:** The new React implementation also introduces `ON_HOLD` (MPCODE `HOLD`, orange #ea580c) and `READY` (MPCODE `READY`, slate). These do not exist in the old ColdFusion code.
>
> **Note:** `RESET_READY` exists in the `StatusAction` type union (`useStatusChange.ts:6`) and in `confirmLabels` (`StatusActionBar.tsx:142`) but has NO button in the `getAllActions` array. It is an unused/reserved action — no UI element triggers it.

## State Machine (Old ColdFusion)

```
                    ┌──────────┐
                    │  (empty) │  No status set yet
                    └────┬─────┘
                         │
                         ▼
                   ┌──────────┐          ┌──────────┐
                   │  SETUP   │─────────▶│   PROD   │
                   └──────────┘          └────┬─────┘
                     ▲    ▲                   │
                     │    │        ┌──────────┼──────────┐
                     │    │        ▼          ▼          ▼
                     │    │  ┌──────────┐ ┌──────┐  ┌──────┐
                     │    │  │  PAUSE   │ │ STOP │  │ COMP │
                     │    │  └────┬─────┘ └──┬───┘  └──────┘
                     │    │       │          │       (terminal)
                     │    └── SETUP/PROD     │
                     └────── SETUP/PROD ─────┘
```

## State Machine (New React)

```
                    ┌──────────┐
                    │  READY   │  No status set yet
                    └────┬─────┘
                         │
                         ▼
                   ┌──────────┐          ┌──────────┐
                   │  SETUP   │─────────▶│   PROD   │
                   └──────────┘          └────┬─────┘
                     ▲                        │
                     │         ┌──────────┼──────────┬──────────┐
                     │         ▼          ▼          ▼          ▼
                     │   ┌──────────┐ ┌──────┐ ┌──────────┐ ┌──────┐
                     │   │  PAUSE   │ │ STOP │ │ ON_HOLD  │ │ COMP │
                     │   └────┬─────┘ └──┬───┘ └────┬─────┘ └──────┘
                     │        │          │           │        (terminal)
                     │     PROD only  SETUP/PROD  SETUP/PROD
                     └───────────────────┘
```

**Key differences:** In the old system, PAUSE→SETUP and PROD→SETUP are allowed. In the new system, PAUSE can only go to PROD (not SETUP), and PROD cannot go back to SETUP. See `02-button-visibility-matrix.md` for full details.

### Allowed Transitions (Old Software — `support.cfc:474-669`)

| Current Status | SETUP | PROD | PAUSE | STOP | COMP |
|---------------|-------|------|-------|------|------|
| (empty)       | ✅    | ❌   | ❌    | ❌   | ❌   |
| SETUP         | 🔒    | ✅   | ❌    | ❌   | ❌   |
| PROD          | ✅    | 🔒   | ✅    | ✅   | ✅   |
| PAUSE         | ✅    | ✅   | 🔒    | ❌   | ❌   |
| STOP          | ✅    | ✅   | ❌    | 🔒   | ❌   |
| COMP          | ❌    | ❌   | ❌    | ❌   | 🔒   |

✅ = active/clickable, ❌ = disabled, 🔒 = selected (highlighted, not clickable)

### Allowed Transitions (New React — `StatusActionBar.tsx:46-98`)

| Current Status | SETUP | PROD | PAUSE | STOP | ON_HOLD | COMP |
|---------------|-------|------|-------|------|---------|------|
| READY         | ✅    | ❌   | ❌    | ❌   | ❌      | ❌   |
| SETUP         | ❌    | ✅   | ❌    | ❌   | ❌      | ❌   |
| PROD          | ❌    | ❌   | ✅    | ✅   | ✅      | ✅   |
| PAUSE         | ❌    | ✅   | ❌    | ❌   | ❌      | ❌   |
| STOP          | ✅    | ✅   | ❌    | ❌   | ❌      | ❌   |
| ON_HOLD       | ✅    | ✅   | ❌    | ❌   | ❌      | ❌   |
| COMP          | ❌    | ❌   | ❌    | ❌   | ❌      | ❌   |

✅ = active/clickable, ❌ = inactive (shown but grayed out)

## Key Identifiers Passed Through the Flow

| Parameter    | Source              | Description                                |
|-------------|---------------------|--------------------------------------------|
| `TRANSAC`   | Work order          | Transaction ID (PK of work order)          |
| `COPMACHINE`| Operation           | Nomenclature component-machine ID (FK)     |
| `NOPSEQ`    | Operation           | Nomenclature operation sequence ID (FK)    |
| `MASEQ`     | Machine             | Machine sequence ID (FK)                   |
| `DEPARTEMENT`| Department          | Department ID (old only)                   |
| `Type`      | Screen type         | Always `"Go"` for production screen (old)  |

## Screen Navigation After Status Change

### Old ColdFusion (`sp_js.cfm:1024-1067`)

The old system uses `afficheDiv()` — a jQuery-based screen-swap function (`sp_js.cfm:324-430`) that:
1. Hides all other screen containers
2. Makes an AJAX call to `operation.cfc?method=afficheDiv` to load the target screen content
3. Injects the HTML into the target div

Target screens based on new status:
- `DivQuestionnaire` — when STOP or COMP (questionnaire to record quantities/defects)
- `DivQuestionnaireSetUp` — when PROD from SETUP and worker accepts setup questionnaire
- `DivOperation` — all other transitions (or when worker declines setup questionnaire)

### New React (`useStatusChange.ts`)

Uses React Router `navigate()` (`useStatusChange.ts:47-49, 65`):
- `/orders/{transac}/questionnaire/{stop|comp}?copmachine={copValue}&fromStatus={currentStatus}` — for STOP/COMP
- `/orders/{transac}/questionnaire/setup?copmachine={copValue}` — for setup questionnaire (if accepted)
- Stay on current route — all other transitions

## Status Determination on Screen Load

When the operation screen loads, the current status must be determined to render the correct button states and status badge.

- **Old:** `operation.cfc:ConstruitDonneesStatut` (lines 4569-4756) queries `TEMPSPROD` directly on the primary database for the MODEPROD_MPCODE, then builds a status struct with color, label, and Go button state. The Go button is disabled only for COMP status.
- **New:** Express `GET /getOperation.cfm` replicates the CFM's 2-step approach: get TJSEQ from `vEcransProduction`, then run RequeteAlternative on the primary database with `INNER JOIN TEMPSPROD`. STATUT_CODE comes directly from `TPROD.MODEPROD_MPCODE`.
- See `03a-status-on-load-flow.md` for full details including dead code analysis and TJSEQ origin.

## Where the Buttons Live in the Codebase

### Old ColdFusion
- **Status determination on load:** `src/old/EcransSeatPly/cfc/operation.cfc` lines 4569-4756 (`ConstruitDonneesStatut`)
- **Button HTML rendering:** `src/old/EcransSeatPly/cfc/support.cfc` lines 474-669
- **JS click handler:** `src/old/EcransSeatPly/prive/multilangue/sp_js.cfm` lines 1024-1067
- **Backend CFC method:** `src/old/EcransSeatPly/cfc/QuestionnaireSortie.cfc` lines 1295-1635
- **Helper methods:** `src/old/EcransSeatPly/cfc/support.cfc` (trouveUneOperation, ConstruitDonneesLocales, envoiXMLGet)

### New React + Express
- **React component:** `src/features/operation/components/StatusActionBar.tsx`
- **React hook:** `src/features/operation/hooks/useStatusChange.ts`
- **Express endpoint:** `server/api.cjs` lines 3487-3808 (POST /changeStatus.cfm)
