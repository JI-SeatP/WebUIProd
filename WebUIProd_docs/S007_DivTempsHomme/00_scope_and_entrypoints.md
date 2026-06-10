# 00 — Scope and Entrypoints

## In Scope
- The complete `afficheTableauTempsHomme()` function and all sub-functions it invokes
- All three tabs: Production Time, Add Hours, Search
- All CRUD operations on `EMPLOYE_HEURES` (add, modify, delete worker time)
- Status modification on `TEMPSPROD` (change production mode)
- Read-only display of `TEMPSPROD` records
- Department/machine dropdown rendering
- Shift time calculation logic
- All JavaScript functions in `sp_js.cfm` that drive the screen

## Out of Scope
- `DivCorrection` screen (S010) — opened by the edit button on production time rows
- `DivQuestionnaire` screen — triggered by STOP/COMP status changes
- The `afficheNomEmploye` CFC method (employee lookup by badge code)
- The `dictionnaire.xls` file structure and i18n label definitions (only noted as providing label variables)
- Session management and authentication

## User-Visible Triggers

| Trigger | Action | Target |
|---------|--------|--------|
| Stopwatch button in header | `afficheDiv('DivTempsHomme', ...)` | Opens time tracking screen |
| OK button on Production Time filter | `afficheTempsProd(0)` | Refreshes production time table |
| Department dropdown change (Prod Time filter) | `afficheMachinesTempsProd(0)` | Refreshes machine dropdown |
| Status dropdown change on prod time row | `modifieStatutTempsProd(TJSEQ)` | Updates production status |
| Edit (pencil) button on prod time row | `afficheDiv('DivCorrection', ...)` | Opens correction screen |
| Employee code blur (Add Hours tab) | `afficheNomEmploye()` | Looks up employee name |
| DateJour or QuartJour change (Add Hours) | `changeDateDebutFin()` + `CalculHeures('0','')` + `afficheTempsEmploye()` | Updates date range and recalculates hours |
| Department select change (Add Hours) | `afficheMachines('0','0','')` | Refreshes machine dropdown |
| OK button (Add Hours) | `AjouteModifieTempsHomme('0','')` | Submits new time entry |
| Delete button on search result row | `retireTempsHomme(EMPHSEQ)` | Deletes worker time entry |
| Edit button on search result row | `AjouteModifieTempsHomme(EMPHSEQ,'')` | Updates existing time entry |
| OK button (Search tab) | `afficheTempsHomme()` | Executes search query |
| Refresh button (Search tab) | `rafraichirRecherche()` | Clears filters and refreshes |

## Backend Entrypoints

All CFC methods are in `src/old/EcransSeatPly/cfc/operation.cfc`:

| Method | Line | Access | Return | Purpose |
|--------|------|--------|--------|---------|
| `afficheTableauTempsHomme` | 1158 | remote/PLAIN | string (HTML) | Builds the complete 3-tab screen |
| `afficheTempsProd` | 5393 | remote/JSON | struct | Production time table + metadata |
| `afficheTempsHomme` | 5201 | remote/PLAIN | string (HTML) | Search results table |
| `afficheTempsEmploye` | 5560 | remote/PLAIN | string (HTML) | Employee day-view table |
| `ajouteModifieTempsHomme` | 5780 | remote/PLAIN | string | Insert or update `EMPLOYE_HEURES` |
| `retireTempsHomme` | 5736 | remote/PLAIN | string | Delete from `EMPLOYE_HEURES` |
| `ModifieStatutTempsProd` | 5922 | remote/PLAIN | string | Update status on `TEMPSPROD` |
| `trouveDepartements` | 1628 | remote | query | Department list |
| `afficheMachines` | 5947 | remote/PLAIN | string (HTML) | Machine dropdown for a department |
| `afficheMachinesRecherche` | 5975 | remote/PLAIN | string (HTML) | Machine dropdown for search tab |
| `afficheMachinesTempsProd` | 6000 | remote/PLAIN | string (HTML) | Machine dropdown for prod time filter |
| `trouveEffort` | 6026 | remote/PLAIN | string | Machine effort rate lookup (`MAEFFORTHOMME`) |

## JavaScript Entrypoints

All in `src/old/EcransSeatPly/prive/multilangue/sp_js.cfm`:

| Function | Line | Purpose |
|----------|------|---------|
| `changeDateDebutFin()` | 474 | Compute DateDebut/DateFin from DateJour + QuartJour |
| `CalculHeures(Seq, Prefix)` | 495 | Compute duration and effort-adjusted hours |
| `afficheMachines(Seq, Sel, Prefix)` | 546 | AJAX call to load machine dropdown |
| `afficheMachinesTempsProd(TJSEQ)` | 568 | AJAX call to load prod time machine filter |
| `afficheNomEmploye()` | 612 | AJAX employee lookup |
| `afficheTempsHomme(Seq)` | 694 | AJAX search for worker time entries |
| `afficheTempsProd(TJSEQ)` | 713 | AJAX search for production time entries |
| `afficheTempsEmploye(Seq)` | 764 | AJAX load employee's day entries |
| `retireTempsHomme(Seq)` | 780 | AJAX delete worker time entry |
| `AjouteModifieTempsHomme(Seq, Prefix)` | 795 | AJAX add/update worker time entry |
| `modifieStatutTempsProd(Seq)` | 868 | AJAX change production status |
| `trouveEffort(Seq, Sel, Prefix)` | 580 | AJAX auto-fill effort rate from machine |
| `modifieDonneesSession(Item, Val)` | 241 | AJAX persist filter value to CF session |

## Configuration and Session Variables

| Variable | Source | Purpose |
|----------|--------|---------|
| `session.InfoClient.Filtre5` | Session | Persisted start date filter (Prod Time) |
| `session.InfoClient.Filtre6` | Session | Persisted end date filter (Prod Time) |
| `session.InfoClient.Filtre11` | Session | Persisted order search text (Prod Time) |
| `session.InfoClient.Filtre12` | Session | Persisted department filter (Prod Time) |
| `session.InfoClient.Filtre13` | Session | Persisted machine filter (Prod Time) |
| `session.InfoClient.Departement` | Session | Current department context |
| `session.InfoClient.CodeFonction` | Session | User role code (1034 = Forklift) |
| `session.Langue` | Session | Language (FR/EN) |
| `application.afficheLog` | Application | Logging flag (1 = enabled) |
| `THIS.dsClient` | Component | Primary datasource (`TS_SEATPL` / `AF_SEATPLY`) |
| `THIS.dsClientEXT` | Component | EXT datasource (`TS_SEATPL_EXT` / `AF_SEATPLY_EXT`) |

## Initial Evidence Map

| Evidence Source | What It Proves |
|-----------------|----------------|
| `operation.cfc:72-92` | `afficheDiv` dispatches to `afficheTableauTempsHomme` when `Div="DivTempsHomme"` |
| `operation.cfc:1158-1518` | Main function builds 3-tab HTML with embedded data |
| `operation.cfc:6026-6042` | `trouveEffort` queries `MACHINE.MAEFFORTHOMME` to auto-fill effort rate |
| `support.cfc:765-770` | `modifieDonneesSession` writes `session.InfoClient.{Item} = Valeur` — no DB |
| `operation.cfc:1240-1248` | Initial search tab data loaded with `Employe=-1250000` (returns no results) |
| `operation.cfc:1250-1259` | Initial prod time data loaded with current shift date range |
| `sp_js.cfm:713-762` | JS calls `modifieDonneesSession()` to persist filter values server-side |
| `operation.cfc:5393-5558` | `afficheTempsProd` returns JSON struct with `Contenu` HTML |
| `operation.cfc:5780-5847` | `ajouteModifieTempsHomme` does INSERT or UPDATE based on EMPHSEQ existence |
