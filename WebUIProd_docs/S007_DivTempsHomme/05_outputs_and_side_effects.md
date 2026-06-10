# 05 — Outputs and Side Effects

## Response Payloads

### `afficheTableauTempsHomme` → string (HTML)

Returns a complete HTML fragment containing the 3-tab layout. The caller (`afficheDiv`) wraps it in `<div id="DivTableauTempsHomme">` (line 88-90).

**Structure:**
```
<ul class="nav nav-tabs bleu"> (3 tab links)
<div id="LesTabs" class="tab-content">
  <div id="TempsProd" class="tab-pane active">
    <div id="BlocFiltreTP"> (filter table with 6 columns)
    <div id="DivResultatTempsProd"> (pre-loaded production time HTML)
  </div>
  <div id="AjoutEmploi" class="tab-pane">
    Employee/Date/Shift row
    Time entry form table (8 columns)
    <div id="DivResultatEmploye"> (empty initially)
  </div>
  <div id="Recherche" class="tab-pane">
    <div id="BlocFiltre"> (search filter table with 6 columns)
    <div id="DivResultatHomme"> (pre-loaded empty search results)
  </div>
</div>
```

### `afficheTempsProd` → JSON struct

```json
{
  "Contenu": "<div>...HTML table...</div>",
  "ListeQteProduite": [],
  "ListeQteDefect": []
}
```

**Note:** `ListeQteProduite` and `ListeQteDefect` are always empty arrays. The JS caller at `sp_js.cfm:741-758` iterates them to attach virtual keyboards to quantity inputs, but since they're empty, this code path is effectively dead.

### `afficheTempsHomme` → string (HTML)

HTML table with editable rows. Each row contains:
- `DateDebut_{EMPHSEQ}` — datetime-local input
- `DateFin_{EMPHSEQ}` — datetime-local input
- `HeuresDates_{EMPHSEQ}` — computed duration display
- `DepartementHomme_{EMPHSEQ}` — department select
- `DivAfficheMachine_{EMPHSEQ}` — machine dropdown container
- `EmployeHomme_{EMPHSEQ}` — hidden employee ID
- `Effort_{EMPHSEQ}` — effort percentage input
- `HeuresTravaillees_{EMPHSEQ}` — effort-adjusted duration display
- Delete button → `retireTempsHomme(EMPHSEQ)`
- Edit button → `AjouteModifieTempsHomme(EMPHSEQ, '')`

Footer row with totals: raw duration sum (column 3) and effort-adjusted duration sum (column 8).

### `afficheTempsEmploye` → string (HTML)

Same structure as `afficheTempsHomme` but:
- Field IDs prefixed with `EMP_` (e.g., `EMP_DateDebut_{EMPHSEQ}`)
- Department select: `EMP_DepartementHomme_{EMPHSEQ}`
- Machine select: `EMP_MachineHomme_{EMPHSEQ}`
- Edit button calls: `AjouteModifieTempsHomme(EMPHSEQ, 'EMP_')`
- Delete button calls: `retireTempsHomme(EMPHSEQ)`

### `ajouteModifieTempsHomme` → string

- **Success:** `LeEMPHSEQ` (integer as string) — the PK of the inserted/updated record
- **Failure:** `"-1"` — duplicate detected or zero/negative duration

### `retireTempsHomme` → string

- Returns the `EMPHSEQ` of the deleted record (as string)

### `ModifieStatutTempsProd` → string

- Always returns `"0"` regardless of outcome

### `afficheMachines` → string (HTML)

```html
<select name="{Prefix}MachineHomme_{EMPHSEQ}" id="{Prefix}MachineHomme_{EMPHSEQ}"
        onChange="trouveEffort();">
  <option value="0">--</option>
  <option value="{MASEQ}" [selected]>{MADESC}</option>
  ...
</select>
```

### `afficheMachinesRecherche` → string (HTML)

```html
<select name="MachineRecherche" id="MachineRecherche">
  <option value="0">--</option>
  <option value="{MASEQ}">{MADESC}</option>
  ...
</select>
```

### `afficheMachinesTempsProd` → string (HTML)

```html
<select name="Filtre13" id="Filtre13">
  <option value="0">--</option>
  <option value="{MASEQ}" [selected by session.InfoClient.Filtre13]>{MADESC}</option>
  ...
</select>
```

---

## Side Effects

### Session Persistence (JS-driven)

Before calling `afficheTempsProd`, the JS function at line 722-726 calls `modifieDonneesSession()` for each of the 5 filter values:
- `Filtre5` (start date)
- `Filtre6` (end date)
- `Filtre11` (order search)
- `Filtre12` (department)
- `Filtre13` (machine)

These persist the filter values in the CF session so they survive page reloads and screen transitions.

### Database Writes

| Operation | Table | Datasource | Trigger |
|-----------|-------|------------|---------|
| INSERT | `EMPLOYE_HEURES` | dsClientEXT | `AjouteModifieTempsHomme('0','')` |
| UPDATE | `EMPLOYE_HEURES` | dsClientEXT | `AjouteModifieTempsHomme(EMPHSEQ,'')` |
| DELETE | `EMPLOYE_HEURES` | dsClientEXT | `retireTempsHomme(EMPHSEQ)` |
| UPDATE | `TEMPSPROD` | dsClient | `modifieStatutTempsProd(TJSEQ)` |

### Application Logging

All CFC methods log to `Ecran_{dbClient}_{date}.log` when `application.afficheLog == 1`. Log entries include:
- User name (`session.InfoClient.NomEmploye`)
- Function name
- All argument values
- Before/after values for write operations

### UI Refresh Cascades

After write operations, the JS automatically refreshes dependent views:

| Write Operation | Refreshes |
|-----------------|-----------|
| `AjouteModifieTempsHomme` (success) | `afficheTempsHomme(result)` + `afficheTempsEmploye(result)` |
| `retireTempsHomme` | `afficheTempsHomme(Sequence)` + `afficheTempsEmploye(Sequence)` |
| `modifieStatutTempsProd` (success) | `afficheTempsProd(Sequence)` |

### Status Change UI Feedback (`modifieStatutTempsProd`)

Before AJAX call completes:
- `btnVIDE_PETIT_{Sequence}` hidden
- `btnALERTE_PETIT_{Sequence}` shown (loading indicator)

On success:
- `btnALERTE_PETIT_{Sequence}` hidden
- `btnSUCCES_PETIT_{Sequence}` shown briefly

On error (result == `-1`):
- `alert(MessageTempsProd)` shown
- Alert button remains visible

---

## Consumers

| Output | Consumer |
|--------|----------|
| Production time HTML | `DivResultatTempsProd` container |
| Search results HTML | `DivResultatHomme` container |
| Employee day view HTML | `DivResultatEmploye` container |
| Machine dropdown HTML | `DivAfficheMachine_{N}`, `DivAfficheRecherche`, `DivAfficheMachineTempsProd` |
| Edit button onClick | `DivCorrection` screen (S010) — out of scope |
| `TP_TJQTEPROD_{TJSEQ}` hidden inputs | Virtual keyboard attachment (dead code path) |
