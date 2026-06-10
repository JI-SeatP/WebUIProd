# 02 — Triggers and Inputs

## Flow 1: Load Screen (`afficheTableauTempsHomme`)

### Trigger
User clicks stopwatch button → `afficheDiv('DivTempsHomme', ...)` → dispatched at `operation.cfc:72`

### Input Contract

| Argument | Type | Default | Source | Required |
|----------|------|---------|--------|----------|
| `dsClient` | string | — | `THIS.dsClient` (component property) | Yes |
| `TRANSAC` | string | `"3"` | Passed from `afficheDiv` | Yes |
| `COPMACHINE` | string | `""` | Passed from `afficheDiv` | Yes |
| `NOPSEQ` | string | `""` | Passed from `afficheDiv` | Yes |
| `Langue` | string | `"fr"` | `session.Langue` | Yes |
| `Type` | string | `"4"` | Passed from `afficheDiv` | Yes |
| `Appareil` | string | — | Device identifier | Yes |
| `MASEQ` | string | `"0"` | Machine sequence | Yes |
| `ENTREPOT` | string | `"0"` | Warehouse | Yes |
| `POSTE` | string | `"0"` | Station | Yes |
| `DEPARTEMENT` | string | `"0"` | Department | Yes |

**Note:** `TRANSAC`, `COPMACHINE`, `NOPSEQ`, `Type`, `ENTREPOT`, `POSTE` are passed through but not used in the time tracking tab rendering. They are part of the generic `afficheDiv` signature.

### Session Variables Read
- `session.InfoClient.Filtre5` — persisted start date (used to pre-fill Prod Time filter)
- `session.InfoClient.Filtre6` — persisted end date
- `session.InfoClient.Filtre11` — persisted order search
- `session.InfoClient.Filtre12` — persisted department filter
- `session.InfoClient.Filtre13` — persisted machine filter (read by `afficheMachinesTempsProd`)
- `session.InfoClient.CodeFonction` — role code (read by `trouveDepartements`)

---

## Flow 2: Search Production Time (`afficheTempsProd`)

### Trigger
User clicks OK button on Production Time filter bar → `afficheTempsProd(0)` in JS (line 713)

### Input Contract (JS → CFC)

| Argument | Type | Default | DOM Source | Fallback |
|----------|------|---------|-----------|----------|
| `dsClient` | string | — | JS global `dsClient` | — |
| `TJSEQ` | string | `""` | Function argument (0 for fresh search) | — |
| `Langue` | string | — | JS global `Langue` | — |
| `DateDebut` | string | `""` | `#Filtre5` value | `Def_Filtre5` (session default) |
| `DateFin` | string | `""` | `#Filtre6` value | `Def_Filtre6` |
| `Departement` | string | `""` | `#Filtre12` value | `Def_Filtre12` |
| `Machine` | string | `""` | `#Filtre13` value | `Def_Filtre13` |
| `Commande` | string | `""` | `#Filtre11` value | `Def_Filtre11` |

### Preprocessing
- `DateDebut`/`DateFin`: `T` replaced with space for ODBC compatibility (CFC line 5422-5423)
- All 5 filter values persisted to session via `modifieDonneesSession()` before AJAX call (JS line 722-726)

### Validation
- **If ALL filters are empty**: query returns zero rows via `AND 0=1` guard (CFC line ~5453)

---

## Flow 3: Add/Modify Worker Time (`AjouteModifieTempsHomme`)

### Trigger
- **Add**: OK button on Add Hours tab → `AjouteModifieTempsHomme('0', '')` (Sequence=0)
- **Modify**: Edit button on search result row → `AjouteModifieTempsHomme(EMPHSEQ, '')` or `AjouteModifieTempsHomme(EMPHSEQ, 'EMP_')`

### Input Contract (JS → CFC)

| Argument | Type | DOM Source (Add) | DOM Source (Modify) |
|----------|------|-----------------|-------------------|
| `EMPHSEQ` | string | `"0"` (new record) | Row's `EMPHSEQ` |
| `DateDebut` | string | `#DateDebut_0` | `#{Prefix}DateDebut_{EMPHSEQ}` |
| `DateFin` | string | `#DateFin_0` | `#{Prefix}DateFin_{EMPHSEQ}` |
| `Departement` | string | `#DepartementHomme_0` | `#{Prefix}DepartementHomme_{EMPHSEQ}` |
| `Machine` | string | `#MachineHomme_0` | `#{Prefix}MachineHomme_{EMPHSEQ}` |
| `Employe` | string | `#EmployeHomme_0` | `#{Prefix}EmployeHomme_{EMPHSEQ}` |
| `Effort` | string | `#Effort_0` | `#{Prefix}Effort_{EMPHSEQ}` |

### Client-Side Validation (JS, sequential — `sp_js.cfm:795-840`)

| Check | Field | Condition | Action |
|-------|-------|-----------|--------|
| 1 | DateDebut | `== ''` | `alert(MessageChampManquant)` + return |
| 2 | DateFin | `== ''` | `alert(MessageChampManquant)` + return |
| 3 | Departement | `parseFloat() == 0` | `alert(MessageChampManquant)` + return |
| 4 | Machine | `parseFloat() == 0` | `alert(MessageChampManquant)` + return |
| 5 | Employe | `parseFloat() == 0` | `alert(MessageChampManquant)` + return |

### Server-Side Validation (CFC, `operation.cfc:5780-5847`)

| Check | Condition | Result |
|-------|-----------|--------|
| Duplicate check | Exact match on all 6 fields in `EMPLOYE_HEURES` | Return `-1` |
| Duration check | `DateDiff('n', DateDebut, DateFin) <= 0` | Return `-1` |

---

## Flow 4: Delete Worker Time (`retireTempsHomme`)

### Trigger
Delete (trash) button on search result row → `retireTempsHomme(EMPHSEQ)` (JS line 780)

### Input Contract

| Argument | Type | Source |
|----------|------|--------|
| `EMPHSEQ` | string | Row's EMPHSEQ (primary key of `EMPLOYE_HEURES`) |

### Validation
- None. The CFC function does a SELECT before DELETE but does not guard on `RecordCount`.

---

## Flow 5: Change Production Status (`modifieStatutTempsProd`)

### Trigger
Status dropdown change on production time row → `modifieStatutTempsProd(TJSEQ)` (JS line 868)

### Input Contract

| Argument | Type | DOM Source |
|----------|------|-----------|
| `TJSEQ` | string | Function argument (from row data) |
| `Statut` | string | `#MODEPROD_MPCODE_{TJSEQ}` select value |

### Validation
- None client-side
- Server-side: `LEFT(Statut, 5)` truncation applied (CFC line 5932)

---

## Flow 6: Search Worker Time (`afficheTempsHomme`)

### Trigger
OK button on Search tab → `afficheTempsHomme()` (JS line 694)

### Input Contract

| Argument | Type | DOM Source | Default |
|----------|------|-----------|---------|
| `dsClient` | string | JS global | — |
| `Langue` | string | JS global | — |
| `DateDebut` | string | `#DateDebut` | — |
| `DateFin` | string | `#DateFin` | — |
| `Departement` | string | `#DepartementRecherche` | `"0"` |
| `Machine` | string | `#MachineRecherche` | `"0"` |
| `Employe` | string | `#EmployeRecherche` | `"0"` |
| `EMPHSEQ` | string | Function argument | — |

### Preprocessing
- `DateDebut`/`DateFin`: `T` replaced with space (CFC line 5224-5225)

---

## Flow 7: Load Employee Day View (`afficheTempsEmploye`)

### Trigger
- Called after `afficheNomEmploye()` completes (JS line 636)
- Called after `AjouteModifieTempsHomme` completes (JS line 836)
- Called after `retireTempsHomme` completes (JS line 787)
- Called after `DateJour`/`QuartJour` change (inline `onChange`)

### Input Contract

| Argument | Type | DOM Source |
|----------|------|-----------|
| `dsClient` | string | JS global |
| `Langue` | string | JS global |
| `Date` | string | `#DateJour` value |
| `Employe` | string | `#EmployeHomme_0` value |
| `EMPHSEQ` | string | Function argument (for row highlighting) |
