# Appendix A — File Index

## ColdFusion Source Files

### `src/old/EcransSeatPly/cfc/operation.cfc` (6287 lines)

| Function | Lines | Role |
|----------|-------|------|
| `afficheDiv` | 9-100+ | Router — dispatches to `afficheTableauTempsHomme` when `Div="DivTempsHomme"` |
| `afficheTableauTempsHomme` | 1158-1518 | **Main entry** — builds 3-tab screen HTML |
| `trouveDepartements` | 1628-1647 | Department list query |
| `afficheTempsHomme` | 5201-5392 | Search tab results — editable worker time table |
| `afficheTempsProd` | 5393-5558 | Production time tab results — filterable prod time table |
| `afficheTempsEmploye` | 5560-5734 | Employee day-view — worker time for specific employee/date |
| `retireTempsHomme` | 5736-5753 | DELETE from `EMPLOYE_HEURES` |
| `ajouteModifieTempsHomme` | 5780-5847 | INSERT/UPDATE on `EMPLOYE_HEURES` |
| `ModifieStatutTempsProd` | 5922-5945 | UPDATE status on `TEMPSPROD` |
| `afficheMachines` | 5947-5973 | Machine dropdown for Add Hours / Search edit rows |
| `afficheMachinesRecherche` | 5975-5998 | Machine dropdown for Search tab filter |
| `afficheMachinesTempsProd` | 6000-6024 | Machine dropdown for Production Time filter |
| `trouveEffort` | 6026-6042 | Machine effort rate lookup (`MAEFFORTHOMME`) |

### `src/old/EcransSeatPly/prive/multilangue/sp_js.cfm`

| Function | Lines | Role |
|----------|-------|------|
| `changeDateDebutFin()` | 474-489 | Client-side date computation from day+shift |
| `CalculHeures(Seq, Prefix)` | 495-544 | Client-side duration and effort-hours computation |
| `afficheMachines(Seq, Sel, Prefix)` | 546-555 | AJAX — load machine dropdown |
| `afficheMachinesTempsProd(TJSEQ)` | 568-578 | AJAX — load prod time machine filter |
| `afficheNomEmploye()` | 612-638 | AJAX — employee lookup by badge code |
| `afficheTempsHomme(Seq)` | 694-711 | AJAX — search worker time |
| `afficheTempsProd(TJSEQ)` | 713-762 | AJAX — search production time |
| `afficheTempsEmploye(Seq)` | 764-778 | AJAX — load employee day entries |
| `retireTempsHomme(Seq)` | 780-789 | AJAX — delete worker time |
| `AjouteModifieTempsHomme(Seq, Prefix)` | 795-840 | AJAX — add/update worker time |
| `modifieStatutTempsProd(Seq)` | 868-891 | AJAX — change production status |
| `trouveEffort(Seq, Sel, Prefix)` | 580-591 | AJAX — auto-fill effort rate from machine |
| `modifieDonneesSession(Item, Val)` | 241-251 | AJAX — persist filter value to CF session |

### `src/old/EcransSeatPly/inclus/dictionnaire.cfm`

- Included at component scope (line 2 of `operation.cfc`)
- Reads `dictionnaire.xls` via Apache POI
- Populates i18n label variables (`LeTitreResultat`, `LeTitreDateDebut`, etc.) based on `session.Langue`

### `src/old/EcransSeatPly/cfc/General.cfc`

| Function | Role |
|----------|------|
| `trouveLangue(dsClient, Repertoire)` | Returns locale, date format, and time format strings for the given language |

### `src/old/EcransSeatPly/cfc/support.cfc`

| Function | Lines | Role |
|----------|-------|------|
| `modifieDonneesSession` | 765-770 | Writes `session.InfoClient.{Item} = Valeur` — single-line session persistence |

### `src/old/EcransSeatPly/cfc/QuestionnaireSortie.cfc`

| Function | Lines | Role |
|----------|-------|------|
| `ModifieTEMPSPROD` | 599+ (919-929 for COMP logic) | Sets `TJPROD_TERMINE=1` and `PL_RESULTAT.PR_TERMINE=1` on COMP — separate from `ModifieStatutTempsProd` |

---

## Existing Project Files (New Stack)

### Source Analysis
- `docs/SOURCE_FEATURES/S007-Time tracking and Production Entries Screens-Analysis.md` — Pre-existing screen layout analysis

### Current Implementation (if any)
- Time Tracking feature exists in `src/features/` — Production Time tab and Add Hours tab partially implemented (per MEMORY.md project status)

---

## Database Objects

See [database_object_index.md](database_object_index.md) for the complete list.

---

## Config and Session

| Symbol | File | Role |
|--------|------|------|
| `THIS.dsClient` | `operation.cfc:4` | Primary datasource |
| `THIS.dsClientEXT` | `operation.cfc:5` | EXT datasource |
| `application.afficheLog` | Application scope | Logging toggle |
| `application.CheminCFCLocal` | Application scope | CFC URL base path |
| `session.InfoClient.Filtre5-13` | Session | Persisted filter values |
| `session.InfoClient.CodeFonction` | Session | User role code |
| `session.InfoClient.NomEmploye` | Session | User display name |
| `session.InfoClient.Departement` | Session | Current department context |
| `session.Langue` | Session | Language code (FR/EN) |
