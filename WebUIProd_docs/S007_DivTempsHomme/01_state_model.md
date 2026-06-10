# 01 — State Model

## Initial State Assembly

When `afficheTableauTempsHomme()` is called (line 1158), it assembles the complete screen state through a sequence of queries and sub-function calls:

### Step 1: Lookup Data (lines 1173-1196)
- `trouveDepartements` — all departments with `DEVOIRDANSUSINE=1`, filtered by user role
- `trouveMachines` — all machines, ordered by language
- `trouveEmployes` — all employees, ordered by name
- `trouveQuarts` — distinct shift start/end times from `EQUIPE`

### Step 2: Current Shift Detection (lines 1197-1228)
The system determines the current shift based on `Now()`:

| Shift | Time Range | QuartDebutHeure:Min | QuartFinHeure:Min |
|-------|-----------|---------------------|-------------------|
| Quart 1 | 07:00 - 15:30 | 07:00 | 15:30 |
| Quart 2 | 15:30 - 00:00 | 15:30 | 00:00 |
| Quart 3 | 00:00 - 07:00 | 00:00 | 07:00 |
| Default (0) | Outside shifts | 08:00 | 16:30 |

**Confidence:** Direct — `operation.cfc:1197-1228`

### Step 3: Date Range Computation (lines 1229-1238)
- `LaDateDebut` and `LaDateFin` are set to the current shift boundaries
- Duration is pre-computed as `HH:MM` for display in the Add Hours tab
- If `QuartFinHeure` is `00`, one day is added to `LaDateFin` (for Quart 2 crossing midnight)
- ISO datetime strings `MaDateDebut`/`MaDateFin` are formatted as `yyyy-MM-ddTHH:nn`

### Step 4: Pre-load Sub-Components (lines 1240-1276)
- `afficheTempsHomme` called with `Employe=-1250000` — intentionally returns zero results (impossible employee ID)
- `afficheTempsProd` called with current shift date range and no other filters
- `afficheMachines` called for Add Hours tab
- `afficheMachinesRecherche` called for Search tab
- `afficheMachinesTempsProd` called for Production Time filter (uses `session.InfoClient.Filtre12`)

## State Variables and Controlling Entities

### Production Time Tab State

| Variable | Type | Source | Controls |
|----------|------|--------|----------|
| `Filtre5` | datetime | DOM input, persisted to session | Start date filter |
| `Filtre6` | datetime | DOM input, persisted to session | End date filter |
| `Filtre11` | string | DOM input, persisted to session | Order number search text |
| `Filtre12` | integer | DOM select, persisted to session | Department filter |
| `Filtre13` | integer | DOM select, persisted to session | Machine filter |
| `TJSEQ` | integer | Row identity | Row highlighting, status editing target |

### Add Hours Tab State

| Variable | Type | Source | Controls |
|----------|------|--------|----------|
| `CodeEmploye` | string | DOM input | Employee lookup trigger |
| `EmployeHomme_0` | integer | Hidden field (set by `afficheNomEmploye`) | Employee FK for time entry |
| `DateJour` | date | DOM input (default: today) | Work date |
| `QuartJour` | string | DOM select (default: current shift) | Shift selection |
| `DateDebut_0` | datetime | DOM input (computed) | Entry start time |
| `DateFin_0` | datetime | DOM input (computed) | Entry end time |
| `DepartementHomme_0` | integer | DOM select | Department FK |
| `MachineHomme_0` | integer | DOM select | Machine FK |
| `Effort_0` | integer | DOM input (default: 100) | Effort percentage |

### Search Tab State

| Variable | Type | Source | Controls |
|----------|------|--------|----------|
| `DateDebut` | datetime | DOM input | Search start date |
| `DateFin` | datetime | DOM input | Search end date |
| `DepartementRecherche` | integer | DOM select | Department filter |
| `MachineRecherche` | integer | DOM select | Machine filter |
| `EmployeRecherche` | integer | Hidden field | Employee filter |

## State Transition Table

### Production Time Status (`MODEPROD_MPCODE` on `TEMPSPROD`)

| From Status | To Status | Trigger | Method | Side Effects |
|-------------|-----------|---------|--------|--------------|
| COMP | STOP | Status dropdown change | `ModifieStatutTempsProd` | Updates `MODEPROD`, `MODEPROD_MPCODE`, `MODEPROD_MPDESC_P/S` on `TEMPSPROD` |
| COMP | PAUSE | Status dropdown change | `ModifieStatutTempsProd` | Same |
| STOP | COMP | Status dropdown change | `ModifieStatutTempsProd` | Same |
| STOP | PAUSE | Status dropdown change | `ModifieStatutTempsProd` | Same |
| PAUSE | COMP | Status dropdown change | `ModifieStatutTempsProd` | Same |
| PAUSE | STOP | Status dropdown change | `ModifieStatutTempsProd` | Same |
| PROD | (any) | **Not editable** | N/A | Status shown as text only |
| SETUP | (any) | **Not editable** | N/A | Status shown as text only |

**Confidence:** Direct — `operation.cfc:5507-5515` (dropdown rendering), `operation.cfc:5922-5945` (update logic)

### Worker Time Entry (`EMPLOYE_HEURES`)

| Action | From State | To State | Trigger | Method |
|--------|-----------|----------|---------|--------|
| Create | No record | Record exists | OK button (Add Hours, Sequence=0) | `ajouteModifieTempsHomme` INSERT |
| Update | Record exists | Record updated | Edit button (Search results, Sequence=EMPHSEQ) | `ajouteModifieTempsHomme` UPDATE |
| Delete | Record exists | Record removed | Delete button (Search results) | `retireTempsHomme` DELETE |

## Rejected/Impossible Transitions

### `ajouteModifieTempsHomme` rejects when:
1. **Duplicate record** — `ExisteTempsHomme.RecordCount > 0` (exact match on all fields) → returns `-1`
2. **Zero/negative duration** — `DateDiff('n', DateDebut, DateFin) <= 0` → returns `-1`

### `ModifieStatutTempsProd`:
- No guard clauses — any `MPCODE` string can be written if it exists in `MODEPROD` table
- The UI only presents STOP/PAUSE/COMP options, so the constraint is UI-level, not server-side

## Unresolved State Questions
1. What happens when `ModifieStatutTempsProd` changes a status to COMP or STOP — does the questionnaire (`DivQuestionnaire`) auto-trigger? Evidence from `afficheDiv` (line 94) shows `DivQuestionnaire` is a separate Div, suggesting it requires a separate navigation call, not an automatic trigger from status change.
2. The `trouveEffort()` function referenced in machine dropdown `onChange` may set the effort rate based on machine selection, but its implementation was not found in the primary JS file.
