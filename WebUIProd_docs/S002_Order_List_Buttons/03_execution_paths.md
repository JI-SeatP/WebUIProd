# 03 - Execution Paths

## Flow 1: Consult Button Click

### Step-by-step

1. **User taps** `btnCONSULTE_PETIT`
2. **JS `afficheDiv('DivOperation', TRANSAC, 'Consulter', COPMACHINE, NOPSEQ, MACHINE, COMPTEURLIGNE, TJSEQ, DEPARTEMENT)`** fires
   - Source: `sp_js.cfm:324-472`
3. **Read filter state from DOM** — reads `Filtre1` through `Filtre13` from form elements
4. **Save state to session** — calls `modifieDonneesSession()` multiple times to persist TRANSAC, COPMACHINE, NOPSEQ, MASEQ, and all filter values to `session.InfoClient`
5. **Hide all div panels** — iterates all `Div*` containers, hides them, clears innerHTML
6. **Show waiting message** — sets `DivOperation` innerHTML to "Veuillez patienter..." / "Please wait..."
7. **AJAX GET** to `operation.cfc?method=afficheDiv` with params:
   - `Div=DivOperation`
   - `Type=Consulter`
   - `TRANSAC=...`
   - `COPMACHINE=...`
   - `NOPSEQ=...`
   - `MASEQ=...`
   - `Filtre1...Filtre13`
   - `Langue=...`
   - `dsClient=...` (database)
8. **CFC `operation.cfc:afficheDiv`** receives request
   - Source: `operation.cfc:9-35`
   - Routes to `tableau.cfc:afficheTableauOperation()` for `Div=DivOperation`
9. **Returns HTML** — operation detail panel content
10. **JS success callback** — makes `DivOperation` visible, injects returned HTML
11. **Calls `afficheEntete(Type, TRANSAC, ...)`** — AJAX to `support.cfc?method=afficheEntete`, renders page header
12. **Calls `affichePiedDePage(Type, TRANSAC, ...)`** — AJAX to `support.cfc?method=affichePiedDePage`
    - **Because `Type='Consulter'`**: footer status buttons (SETUP, PROD, PAUSE, STOP, COMP) are rendered **disabled / read-only**
    - Source: `support.cfc:affichePiedDePage` — checks `Type` param

### Branching Condition
The critical distinction: `Type='Consulter'` makes the operation screen **view-only**. No production status can be changed.

---

## Flow 2: Go/OK Button Click

### Step-by-step

Steps 1-10 are **identical** to Flow 1, except:
- Step 2: Third parameter is `'Go'` instead of `'Consulter'`
- Step 7: AJAX includes `Type=Go`

Step 12 differs:
- **Because `Type='Go'`**: footer status buttons are rendered **active and clickable**
- Each status button calls `changeStatut('Go', 'PROD'|'SETUP'|'PAUSE'|'STOP'|'COMP', TRANSAC, ...)`
- Source: `sp_js.cfm:1024` — `changeStatut` fires AJAX to `QuestionnaireSortie.cfc?method=ajouteModifieStatut`

### Branching Condition
`Type='Go'` enables the operator to change the production status. This is the primary functional difference between Consult and Go.

### Downstream (out of scope)
After `changeStatut` completes:
- `STOP` or `COMP` → navigates to `DivQuestionnaire` (questionnaire screen)
- `PROD` with previous mode `SETUP` → shows `confirmeSetUp` modal
- Otherwise → reloads `DivOperation`

---

## Flow 3: Transfer Button Click

### Step-by-step

1. **User taps** `btnCARISTE_MOYEN` or `btnCARISTE_PETIT`
2. **JS `afficheMOUVEMENT(TRANSAC, COPMACHINE, NOPSEQ, TREPOSTER)`** fires
   - Source: `sp_js.cfm:1168-1181`
3. **AJAX GET** to `support.cfc?method=afficheMOUVEMENT` with params:
   - `TRANSAC=...`
   - `COPMACHINE=...`
   - `NOPSEQ=...`
   - `Langue=...`
   - `TREPOSTER=...`
4. **CFC `support.cfc:afficheMOUVEMENT`** receives request
   - Source: `support.cfc:2535+`
   - Calls `support.cfc:trouveUneOperation()` to get operation details
   - Runs SQL queries against `TRANSAC`, `DET_TRANS`, `CONTENANT`, `ENTREPOT` tables
   - Returns HTML for material movement / container form
5. **JS success callback**:
   - Sets `document.getElementById('InfoMOUVEMENT').innerHTML = result`
   - Opens Bootstrap modal `$('#ModalMOUVEMENT').modal('show')`
   - Calls `setTimeout(blockModaleSetDimension, 500)` to resize modal

### No Page Navigation
Unlike Consult/Go, the Transfer button opens a **modal dialog** over the current list view. The user stays on DivPrincipal.

---

## Flow 4: Details Button Click

### Step-by-step

1. **User taps** `btnVOIR_PETIT` (magnifier icon next to order number)
2. **JS `AfficheDetailCommande(TRANSAC, NO_PROD)`** fires
   - Source: `sp_js.cfm:2236-2253`
3. **AJAX GET** to `operation.cfc?method=afficheTableauCommande` with params:
   - `TRANSAC=...`
   - `NO_PROD=...`
   - `Langue=...`
4. **CFC `operation.cfc:afficheTableauCommande`** receives request
   - Source: `operation.cfc:3381+`
   - Runs `SELECT DISTINCT` from `vEcransProduction v LEFT OUTER JOIN dbo.VSP_BonTravail_Entete`
   - Filter: `v.TRANSAC = #TRANSAC# AND v.OPERATION <> 'FINSH'`
   - Order: `DATE_DEBUT_PREVU`
   - Returns HTML table showing all operations for that order number
5. **JS success callback**:
   - Sets `document.getElementById('InfoTableauCommande').innerHTML = result`
   - Opens Bootstrap modal `$('#ModalDetailCommande').modal({backdrop: 'static', keyboard: false})`
   - Modal is **static** — cannot be closed by clicking outside or pressing Escape
   - Modal header is draggable

### No Page Navigation
Like Transfer, the Details button opens a **modal dialog** over the current list view.

---

## Summary: Button → Navigation Pattern

| Button | Result | Leaves DivPrincipal? |
|--------|--------|---------------------|
| Consult | Loads DivOperation (read-only) | Yes |
| Go/OK | Loads DivOperation (active) | Yes |
| Transfer | Opens ModalMOUVEMENT dialog | No (overlay) |
| Details | Opens ModalDetailCommande dialog | No (overlay) |
