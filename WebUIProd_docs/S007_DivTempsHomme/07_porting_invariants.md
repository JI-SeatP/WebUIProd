# 07 — Porting Invariants

## Required Behavioral Invariants

### 1. Dual-datasource architecture

`EMPLOYE_HEURES` must be read from and written to the EXT datasource. `TEMPSPROD`, `MACHINE`, `DEPARTEMENT`, `EMPLOYE`, `MODEPROD` must use the primary datasource. The rewrite must maintain this separation.

**Evidence:** All `EMPLOYE_HEURES` queries use `THIS.dsClientEXT`, all other queries use `THIS.dsClient`.

### 2. `EMPLOYE_HEURES` duplicate prevention

Before INSERT or UPDATE, the system must check for exact-match duplicates across all 6 fields: `EMPHDATEDEBUT`, `EMPHDATEFIN`, `DEPARTEMENT`, `MACHINE`, `EMPLOYE`, `EMPHEFFORT_HOMME`. Reject if duplicate found.

**Evidence:** `operation.cfc:~5802-5812` — `ExisteTempsHomme` duplicate check query.

### 3. Zero/negative duration prevention

Time entries with `DateFin <= DateDebut` must be rejected. Duration is computed in minutes via `DateDiff('n', DateDebut, DateFin)`.

**Evidence:** `operation.cfc:~5793` — `LaDiff GT 0` guard.

### 4. Effort rate stored as decimal

The UI displays effort as a percentage (integer, e.g., `100`), but it is stored as a decimal (e.g., `1.00`). The conversion is `stored_value = displayed_value / 100`.

**Evidence:** `operation.cfc:~5828` — `Val(arguments.Effort)/100`.

### 5. `TEMPSPROD` status update is a denormalized write

When changing production status, all four columns must be updated atomically: `MODEPROD` (FK integer), `MODEPROD_MPCODE` (string code), `MODEPROD_MPDESC_P` (French description), `MODEPROD_MPDESC_S` (English description). The values come from the `MODEPROD` lookup table.

**Evidence:** `operation.cfc:5937-5943`.

### 6. Only COMP/STOP/PAUSE statuses are editable

PROD and SETUP statuses must be displayed as text-only, not as dropdowns. The editable dropdown must offer exactly three options: STOP, PAUSE, COMP.

**Evidence:** `operation.cfc:5507-5515` — `<cfif>` condition rendering `<select>` vs plain text.

### 7. Production time filter requires at least one active filter

When all 5 filter fields are empty/zero, the query must return zero rows. This prevents unbounded table scans.

**Evidence:** `operation.cfc:~5453` — `AND 0=1` guard clause.

### 8. Operation 11 exclusion

Production time records with `OPERATION = 11` must be excluded from results. Records where `OPERATION IS NULL` are included.

**Evidence:** `operation.cfc:~5454` — `AND (T.OPERATION <> 11 OR T.OPERATION IS NULL)`.

### 9. Edit button visibility condition

The edit/correction button on production time rows must appear only when: `TJQTEPROD != 0` OR `TJQTEDEFECT != 0` OR `MODEPROD_MPCODE IN ('PROD', 'SETUP')`.

**Evidence:** `operation.cfc:5538-5545`.

### 10. Shift time defaults

The Add Hours tab must default to the current shift's time range:

| Shift | Start | End |
|-------|-------|-----|
| 1 | 07:00 | 15:30 |
| 2 | 15:30 | 00:00 (next day) |
| 3 | 00:00 | 07:00 |
| Default | 08:00 | 16:30 |

**Evidence:** `operation.cfc:1197-1238` (shift detection at 1197-1228, date computation at 1229-1238).

### 11. `@@IDENTITY` capture after INSERT

After inserting into `EMPLOYE_HEURES`, the system must capture the auto-generated primary key. The legacy code uses `@@IDENTITY` with `SET NOCOUNT ON/OFF`.

**Evidence:** `operation.cfc:~5820-5827`.

### 12. Department visibility filter

Only departments with `DEVOIRDANSUSINE = 1` should appear in dropdowns. If user role is `CodeFonction = 1034` (Forklift), restrict to departments where `DECODE LIKE 'Forklift%'`.

**Evidence:** `operation.cfc:1635-1644`.

### 13. `dbo.FctFormatNoProd` for order number display

Order numbers must be formatted using the `dbo.FctFormatNoProd(TRNO, TRITEM)` database function. This function is also used in the `LIKE` filter for order search.

**Evidence:** `operation.cfc:~5441, ~5451`.

### 14. Cross-datasource JOIN pattern for EMPLOYE_HEURES

When querying `EMPLOYE_HEURES` on the EXT datasource, JOINs must use `AutoFAB_DEPARTEMENT`, `AutoFAB_MACHINE`, `AutoFAB_EMPLOYE` (prefixed views), not the primary table names. The `AutoFAB_` prefix is a cross-database reference that works in both test (`TS_SEATPL_EXT` → `TS_SEATPL`) and production (`AF_SEATPLY_EXT` → `AF_SEATPLY`).

**Evidence:** `operation.cfc:5232-5235`.

**Porting note:** The Express API connects to both databases directly, so `AutoFAB_` prefixes are not needed. Queries on `EMPLOYE_HEURES` can JOIN to `DEPARTEMENT`, `MACHINE`, `EMPLOYE` using the primary connection pool.

### 15. Machine effort rate auto-fill

When the user selects a machine, the effort rate input must be auto-filled with the machine's default effort rate (`MACHINE.MAEFFORTHOMME`). The value is stored as a decimal (0.00-1.00) but displayed as an integer percentage (0-100).

**Evidence:** `operation.cfc:6026-6042` (CFC), `sp_js.cfm:580-591` (JS).

### 16. COMP status from Prod Time tab does NOT trigger questionnaire

Changing status to COMP via `ModifieStatutTempsProd` only performs the 4-column denormalized UPDATE on `TEMPSPROD`. It does NOT set `TJPROD_TERMINE = 1` or update `PL_RESULTAT.PR_TERMINE = 1` — those writes only happen through the questionnaire submission path in `QuestionnaireSortie.cfc::ModifieTEMPSPROD`.

**Evidence:** `operation.cfc:5922-5945` (no TJPROD_TERMINE write), `QuestionnaireSortie.cfc:919-929` (separate path).

---

## Timing and Ordering Invariants

### 1. Filter persistence before query

The 5 Prod Time filter values must be persisted to the session BEFORE the production time query is executed. This ensures that if the user navigates away and returns, the filters are preserved.

**Evidence:** `sp_js.cfm:722-726` — `modifieDonneesSession()` calls precede AJAX call.

### 2. Post-write refresh sequence

After a successful add/modify/delete of worker time:
1. Refresh the Search tab results (`afficheTempsHomme`)
2. Refresh the Employee day view (`afficheTempsEmploye`)

Both must be called to keep both views consistent.

**Evidence:** `sp_js.cfm:836-837` (add/modify), `sp_js.cfm:786-787` (delete).

### 3. Machine dropdown refresh on department change

Changing the department dropdown must immediately refresh the machine dropdown for that department.

**Evidence:** `sp_js.cfm:546-555` — `afficheMachines` called on `onChange`.

---

## Data-Shape Invariants

### `EMPLOYE_HEURES` record shape

| Field | Type | Constraints |
|-------|------|-------------|
| `EMPHSEQ` | int (PK, identity) | Auto-generated |
| `EMPHDATEDEBUT` | datetime | Required |
| `EMPHDATEFIN` | datetime | Required, must be > EMPHDATEDEBUT |
| `EMPHEFFORT_HOMME` | decimal | 0.00 to 1.00 range (stored as fraction) |
| `DEPARTEMENT` | int (FK) | Required, must reference `DEPARTEMENT.DESEQ` |
| `MACHINE` | int (FK) | Required, must reference `MACHINE.MASEQ` |
| `EMPLOYE` | int (FK) | Required, must reference `EMPLOYE.EMSEQ` |

### `TEMPSPROD` status columns (denormalized)

| Field | Type | Source |
|-------|------|--------|
| `MODEPROD` | int (FK) | `MODEPROD.MPSEQ` |
| `MODEPROD_MPCODE` | varchar(5) | `MODEPROD.MPCODE` |
| `MODEPROD_MPDESC_P` | varchar(50) | `MODEPROD.MPDESC_P` (French) |
| `MODEPROD_MPDESC_S` | varchar(50) | `MODEPROD.MPDESC_S` (English) |

---

## Incidental Implementation Details (NOT invariants)

These are implementation choices that may change in the rewrite:

1. **Server-side HTML rendering** — The legacy system returns fully rendered HTML strings. The React rewrite will return JSON data and render client-side.
2. **`T` → space date normalization** — Artifact of CF's inability to parse ISO 8601 datetime strings. Not needed in a JS/API stack.
3. **`@@IDENTITY`** — Should be replaced with `SCOPE_IDENTITY()` or an `OUTPUT` clause in the rewrite for safety.
4. **Duplicate HTML IDs** (`btnRETIRE_PETIT`, `btnMODIFIE_PETIT`) — Bug in legacy code, should not be replicated.
5. **`LeQuartMaintenant = 0` fallback** (08:00-16:30) — May not be needed if shift detection covers all hours.
6. **`EQUIPE` query** — Executed but unused. Can be omitted.
7. **`ListeQteProduite`/`ListeQteDefect` empty arrays** — Dead code, do not replicate.
8. **All 11 CFC methods lack `<cftry>/<cfcatch>`** — The rewrite must add proper error handling.
