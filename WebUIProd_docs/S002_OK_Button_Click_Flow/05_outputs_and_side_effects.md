# 05 - Outputs & Side Effects

## Old Software Output

### Main Response
`operation.cfc:afficheDiv` returns server-rendered HTML containing:
- Operation info block (order number, client, product, quantities, status)
- BIG SHEET section for VCUT orders
- Schedule details (planned start/end, assigned machine)
- Material tables (raw materials, containers)
- Wrapped in `<div id="DivTableauOperation">`

### Additional AJAX Calls (from JS success callback)
1. **`afficheEntete`** → header HTML with order number, client, product version, quantities, operation name, machine, status label
2. **`affichePiedDePage`** → footer HTML with status action buttons:
   - When `Type='Go'`: SETUP, PROD, PAUSE, STOP, COMP buttons are **active and clickable**
   - When `Type='Consulter'`: same buttons are **disabled/grayed out**

### Session Side Effects
Before the main AJAX call, `modifieDonneesSession` saves to `session.InfoClient`:
- `PourTRANSAC` = TRANSAC
- `PourCOPMACHINE` = COPMACHINE (can be 0)
- `PourNOPSEQ` = NOPSEQ
- `PourMachine` = MASEQ
- `Filtre1-13` = current filter values
- `Page` = 'DivOperation'
- `Type` = 'Go'

### For Unstarted Orders (COPMACHINE=0, TJSEQ=NULL)
The old software:
1. Returns the operation HTML with all available data (order info, schedule, materials)
2. Status shows "PRET" (ready) — white background, wrench icon
3. Footer buttons are active — user can tap SETUP or PROD to start production
4. COPMACHINE is stored as `0` in session — subsequent operations know to use TRANSAC+NOPSEQ for lookups

---

## New Software Output

### Success Case (COPMACHINE > 0, TEMPSPROD exists)
`getOperation.cfm` returns JSON:
```json
{
  "success": true,
  "data": { /* all operation fields */ },
  "message": "Operation retrieved"
}
```
`OperationDetailsPage` renders the operation detail screen.

### Failure Case (COPMACHINE = 0 or no TEMPSPROD)
`getOperation.cfm` returns JSON:
```json
{
  "success": false,
  "error": "Operation not found for transac=1068109 copmachine=0"
}
```
`OperationDetailsPage` renders a red error message with a "Actualiser" (Refresh) button.

### No Session Side Effects
The React migration does not save session state before navigation — it uses URL params and React context instead.
