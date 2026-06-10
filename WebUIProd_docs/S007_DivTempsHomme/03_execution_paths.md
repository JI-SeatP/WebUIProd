# 03 — Execution Paths

## Path 1: Screen Load (`afficheTableauTempsHomme`)

**Source:** `operation.cfc:1158-1518`

### Step-by-step execution

1. **Log** (line 1170-1172): If `application.afficheLog == 1`, log all arguments
2. **`trouveDepartements`** (line 1173-1177): Query `DEPARTEMENT` table where `DEVOIRDANSUSINE=1`, filtered by user role (`CodeFonction=1034` restricts to Forklift departments). Datasource: `THIS.dsClient`
3. **`trouveMachines`** (line 1178-1186): Query all `MACHINE` records ordered by language. Datasource: `THIS.dsClient`
4. **`trouveEmployes`** (line 1187-1191): Query all `EMPLOYE` records ordered by name. Datasource: `THIS.dsClient`
5. **`trouveQuarts`** (line 1192-1196): Query distinct shift times from `EQUIPE`. Datasource: `THIS.dsClient`
6. **Shift detection** (line 1197-1228): Compare `Now()` against shift boundaries → set `LeQuartMaintenant`, `QuartDebutHeure/Min`, `QuartFinHeure/Min`
7. **Date computation** (line 1229-1238): Build `LaDateDebut`/`LaDateFin` from shift, format as ISO strings `MaDateDebut`/`MaDateFin`
8. **`afficheTempsHomme`** (line 1240-1249): Pre-load search tab with `Employe=-1250000` (intentional no-results), using `session.InfoClient.Filtre5` for both start and end date
9. **`afficheTempsProd`** (line 1250-1259): Pre-load production time with current shift date range, no filters
10. **Extract HTML** (line 1260): `LeTempsProd = trouveTempsProd.Contenu`
11. **`afficheMachines`** (line 1261-1267): Build machine dropdown for Add Hours tab
12. **`afficheMachinesRecherche`** (line 1268-1271): Build machine dropdown for Search tab
13. **`afficheMachinesTempsProd`** (line 1272-1276): Build machine dropdown for Prod Time filter (uses `session.InfoClient.Filtre12`)
14. **Render HTML** (line 1277-1516): `<cfsavecontent>` builds the complete 3-tab layout:
    - Tab 1 (TempsProd): Filter bar + `DivResultatTempsProd` with pre-loaded production time
    - Tab 2 (AjoutEmploi): Employee/date/shift inputs + time entry form + empty `DivResultatEmploye`
    - Tab 3 (Recherche): Search filter bar + `DivResultatHomme` with pre-loaded (empty) search results
15. **Return** (line 1517): `cfreturn Resultat`

### Branching
- Shift detection has 4 branches (Quart 1/2/3/default)
- `QuartFinHeure == "00"` adds 1 day to `LaDateFin` (line 1235)
- Filter inputs pre-filled from `session.InfoClient.Filtre*` variables

---

## Path 2: Search Production Time (`afficheTempsProd`)

**Source:** `operation.cfc:5393-5558`

### Step-by-step execution

1. **Init struct** (line 5405-5408): `Resultat.Contenu = ""`, `Resultat.ListeQteProduite = ""`, `Resultat.ListeQteDefect = ""`
2. **`trouveLangue`** (line 5409-5412): Load i18n format strings
3. **Normalize dates** (line 5422-5423): Replace `T` with space
4. **`trouveTempsProd` query** (line 5425-5456): Main SELECT from `TEMPSPROD` with JOINs to `MACHINE`, `DEPARTEMENT`, `PL_RESULTAT`, `cNOMENCOP`, `INVENTAIRE`. Conditional WHERE clauses based on filters. **Critical guard: `AND 0=1` if all filters empty** (line ~5453). Fixed filter: `AND (T.OPERATION <> 11 OR T.OPERATION IS NULL)`
5. **`trouveDepartements`** (line 5457-5461): Fetched but unused in output
6. **`trouveMachines`** (line 5462-5470): Fetched but unused in output
7. **Build HTML** (line 5471-5554): Loop over `trouveTempsProd` rows:
   - Status cell: `<select>` for COMP/STOP/PAUSE, plain text for PROD/SETUP
   - Edit button: shown when `TJQTEPROD != 0 OR TJQTEDEFECT != 0 OR MPCODE IN (PROD, SETUP)`
   - Hidden inputs: `TP_TJQTEPROD_{TJSEQ}`, `TP_TJQTEDEFECT_{TJSEQ}`
   - Row highlight: `#b2e3eb` when `TJSEQ` matches argument
8. **Convert arrays** (line 5555-5556): `ListToArray` on empty strings → empty arrays
9. **Return** (line 5557): JSON struct `{Contenu, ListeQteProduite, ListeQteDefect}`

### Key SQL
```sql
FROM TEMPSPROD T
INNER JOIN MACHINE M ON T.MACHINE = M.MASEQ
INNER JOIN DEPARTEMENT D ON M.DEPARTEMENT = D.DESEQ
INNER JOIN PL_RESULTAT PL ON PL.TRANSAC = T.TRANSAC AND PL.CNOMENCOP = T.CNOMENCOP
INNER JOIN cNOMENCOP CNOP ON CNOP.NOPSEQ = T.CNOMENCOP
LEFT OUTER JOIN INVENTAIRE I ON I.INSEQ = T.INVENTAIRE_C
```

---

## Path 3: Add/Modify Worker Time (`ajouteModifieTempsHomme`)

**Source:** `operation.cfc:5780-5847`

### Step-by-step execution

1. **Normalize dates** (line ~5791): Replace `T` with space
2. **Compute duration** (line ~5793): `LaDiff = DateDiff('n', DateDebut, DateFin)` (minutes)
3. **Existence check** (line ~5795-5800): `SELECT EMPHSEQ FROM EMPLOYE_HEURES WHERE EMPHSEQ = :EMPHSEQ` on `dsClientEXT`
4. **Duplicate check** (line ~5802-5812): `SELECT EMPHSEQ FROM EMPLOYE_HEURES WHERE` all 6 fields match exactly, on `dsClientEXT`
5. **Gate check**: If `ExisteTempsHomme.RecordCount == 0` AND `LaDiff > 0`:
   - **INSERT branch** (when `trouveTempsHomme.RecordCount == 0`):
     ```sql
     INSERT INTO EMPLOYE_HEURES (EMPHDATEDEBUT, EMPHDATEFIN, EMPHEFFORT_HOMME, DEPARTEMENT, MACHINE, EMPLOYE)
     VALUES (:DateDebut, :DateFin, :Effort/100, :Departement, :Machine, :Employe)
     ```
     Captures `@@Identity` as `LeEMPHSEQ`
   - **UPDATE branch** (when record exists):
     ```sql
     UPDATE EMPLOYE_HEURES
     SET EMPHDATEDEBUT=:DateDebut, EMPHDATEFIN=:DateFin, EMPHEFFORT_HOMME=:Effort/100,
         DEPARTEMENT=:Departement, MACHINE=:Machine, EMPLOYE=:Employe
     WHERE EMPHSEQ = :EMPHSEQ
     ```
     Returns existing `EMPHSEQ`
6. **Return**: `LeEMPHSEQ` (new/existing ID) or `-1` (rejected)

### Decision tree
```
EMPHSEQ = 0?
  ├─ Yes → INSERT (new record)
  └─ No → record exists?
       ├─ Yes → UPDATE
       └─ No → INSERT (shouldn't happen in practice)

Duplicate exists? → Return -1
Duration <= 0? → Return -1
```

---

## Path 4: Delete Worker Time (`retireTempsHomme`)

**Source:** `operation.cfc:5736-5753`

1. **SELECT** (line ~5741): `SELECT EMPHSEQ FROM EMPLOYE_HEURES WHERE EMPHSEQ = :EMPHSEQ` on `dsClientEXT`
2. **DELETE** (line ~5747): `DELETE FROM EMPLOYE_HEURES WHERE EMPHSEQ = :EMPHSEQ` on `dsClientEXT`
3. **Log** (line ~5750): Log the deletion
4. **Return**: The deleted `EMPHSEQ` value

**Note:** No `RecordCount` guard — DELETE executes regardless of whether the SELECT found a row.

---

## Path 5: Change Production Status (`ModifieStatutTempsProd`)

**Source:** `operation.cfc:5922-5945`

1. **Lookup mode** (line ~5930-5935): `SELECT MPSEQ, MPCODE, MPDESC_P, MPDESC_S FROM MODEPROD WHERE MPCODE = LEFT(:Statut, 5)` on `dsClient`
2. **Update** (line ~5937-5943):
   ```sql
   UPDATE TEMPSPROD
   SET MODEPROD = :MPSEQ, MODEPROD_MPCODE = :Statut,
       MODEPROD_MPDESC_P = :MPDESC_P, MODEPROD_MPDESC_S = :MPDESC_S
   WHERE TJSEQ = :TJSEQ
   ```
   Datasource: `dsClient`
3. **Return**: Always `"0"`

**Note:** Denormalized write — copies the mode description from `MODEPROD` into `TEMPSPROD` columns directly.

**Confirmed:** This is the ONLY thing that happens when status changes to COMP from the Production Time tab. The `TJPROD_TERMINE = 1` and `PL_RESULTAT.PR_TERMINE = 1` writes that are associated with COMP completion only fire inside `QuestionnaireSortie.cfc::ModifieTEMPSPROD` (line 919-929) — a completely separate path triggered by questionnaire form submission from the main production screen.

---

## Path 8: Auto-fill Effort Rate (`trouveEffort`)

**Source:** JS at `sp_js.cfm:580-591`, CFC at `operation.cfc:6026-6042`

### Step-by-step execution

1. **Trigger**: Machine dropdown `onChange` fires `trouveEffort(Sequence, Selection, Prefixe)`
2. **Read DOM** (JS line 581): `{Prefixe}MachineHomme_{Sequence}` select → gets `MASEQ` value
3. **AJAX GET** (JS line 583): `operation.cfc?method=trouveEffort&Machine={MASEQ}&...`
4. **CFC query** (line 6034-6038):
   ```sql
   SELECT MAEFFORTHOMME FROM MACHINE WHERE MASEQ = :Machine
   ```
   Datasource: `THIS.dsClient`
5. **Return** (line 6040): `Val(trouveMachine.MAEFFORTHOMME)` as plain text (decimal, e.g., `0.85`)
6. **Write DOM** (JS line 589): `{Prefixe}Effort_{Sequence}.value = Math.round(result)` — writes integer percentage (e.g., `85`)
7. **Recompute** (JS line 590): `CalculHeures(Sequence, Prefixe)` recalculates effective hours

---

## Path 9: Persist Filter to Session (`modifieDonneesSession`)

**Source:** JS at `sp_js.cfm:241-251`, CFC at `support.cfc:765-770`

### Step-by-step execution

1. **Trigger**: Called by `afficheTempsProd` JS (line 722-726) before AJAX query, 5 times
2. **AJAX GET**: `support.cfc?method=modifieDonneesSession&Item={key}&Valeur={value}`
3. **CFC** (line 769): `session.InfoClient.{Item} = Valeur` — single-line session write
4. **Return**: Echoes `Valeur` back as plain text
5. **No database interaction** — purely in-memory session state

**Note:** All 5 calls fire asynchronously (fire-and-forget). There is no `$.when()` or callback chaining — this is a race condition in the legacy code where the content-load AJAX call may execute before all session writes complete.

---

## Path 6: Search Worker Time (`afficheTempsHomme`)

**Source:** `operation.cfc:5201-5392`

1. **`trouveLangue`** (line 5213): Load locale
2. **Normalize dates** (line ~5224-5225): Replace `T` with space
3. **Main query** (line 5228-5254): `SELECT FROM EMPLOYE_HEURES EH` with JOINs to `AutoFAB_DEPARTEMENT`, `AutoFAB_MACHINE`, `AutoFAB_EMPLOYE`. Conditional WHERE clauses. Datasource: `THIS.dsClientEXT`
4. **`trouveDepartements`** (line 5255): Load departments
5. **`trouveMachines`** (line 5260-5268): Load machines
6. **`trouveEmployes`** (line 5269-5273): Load employees
7. **Build HTML table** (line ~5276-5390): Editable table with datetime-local inputs, department/machine selects, effort input, delete/edit buttons per row. Footer with totals.
8. **Return**: HTML string

---

## Path 7: Load Employee Day View (`afficheTempsEmploye`)

**Source:** `operation.cfc:5560-5734`

1. **`trouveLangue`** (line 5569): Load locale
2. **Compute date range** (line ~5575-5590): `DateDebut` = midnight of `arguments.Date`, `DateFin` = midnight + 1 day
3. **Main query** (line ~5595-5607): Same query as `afficheTempsHomme` but always filters by `Employe` and date range. Datasource: `THIS.dsClientEXT`
4. **`trouveCetEmploye`** (line ~5608): `SELECT EMNOM FROM EMPLOYE WHERE EMSEQ = :Employe`. Datasource: `THIS.dsClient`
5. **`trouveDepartements`** (line 5609): Load departments
6. **`trouveMachines`**, **`trouveEmployes`** (line ~5615-5625): Load lookups
7. **Build HTML table** (line ~5630-5730): Same editable structure as `afficheTempsHomme` but with `EMP_` prefix on field IDs. Footer with totals.
8. **Return**: HTML string
