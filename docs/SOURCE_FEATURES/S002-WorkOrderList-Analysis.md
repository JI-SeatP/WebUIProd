# S002 - Work Order List (DivPrincipal) Analysis

## Source Files
- `src/old/EcransSeatPly/cfc/Tableau_principal.cfm` - Work order row template

---

## 1. Work Order Table Row Structure

### 1.1 Column Layout
Each work order row displays:

| # | Column | Description |
|---|--------|-------------|
| 1 | Line # | Row counter (`COMPTEURLIGNE`) |
| 2 | Actions | Consult button + OK button (conditional) + Transfer button (conditional) |
| 3 | Dates | Planned start/end dates |
| 4 | Department | Only if dept filter = -1 (all depts) |
| 5 | Order # | `NO_PROD` + Search button |
| 6 | Client | Client name + PO number |
| 7 | Product | Product description or VCUT special case |
| 8 | Group | Product group |
| 9 | Panel | Panel code |
| 10 | Mold | Mold code |
| 11 | Qty to Make | Quantity to fabricate |
| 12 | Qty Produced | Quantity already made |
| 13 | Qty Remaining | Remaining quantity |
| 14 | Operation | Operation + Machine names |
| 15 | Status | Status icon image |

### 1.2 Row Styling
- Background color from status (`local.Statut.LaCouleurBG`)
- 1px black bottom border
- No wrap on action/date columns

### 1.3 Action Buttons (Per Row)

**Consult Button (always visible):**
```html
<button class="btn btn-outline-consulte btn-xs"
        onClick="afficheDiv('DivOperation', TRANSAC, 'Consulter', COPMACHINE, NOPSEQ, MACHINE, ...)"
        style="height:38px;width:50px;font-size:16px;">
    [Info SVG Icon - Blue #2B78E4]
</button>
```

**OK/Go Button (conditional - `LeBoutonGo EQ 1`):**
```html
<button class="btn btn-outline-go btn-xs"
        onClick="afficheDiv('DivOperation', TRANSAC, 'Go', COPMACHINE, NOPSEQ, MACHINE, ...)"
        style="height:38px;width:50px;">
    OK
</button>
```

**Transfer Button (conditional - for cell chiefs with code 1031/1032):**
- Blue: Transfer not yet requested
- Red: Transfer at status 0
- Gray: Transfer at status 1

### 1.4 View Details Button
Magnifying glass icon to show order details:
```html
<button class="btn btn-outline-message btn-xs"
        onClick="AfficheDetailCommande(TRANSAC, NO_PROD)"
        style="height:38px;width:50px;">
    [Search SVG Icon - Blue #2B78E4]
</button>
```

---

## 2. Status Indicators

Status is shown via `local.Statut` struct containing:
- `LaCouleurBG` - Row background color
- `LaCouleurStatut` - Status text color
- `LeStatut` - Status label text
- `LaImageStatut` - Status icon filename
- `LeBoutonGo` - Whether to show Go button (0/1)
- `LeTrePoster` - Transfer posted status
- `LePret` - Ready status
- `LaQuantiteAFab` - Quantity to fabricate
- `LaQuantiteAjoutee` - Added quantity
- `LaQuantiteProduite` - Produced quantity
- `LaQuantiteRestante` - Remaining quantity

---

## 3. Special Cases

### 3.1 VCUT Orders
When `NO_INVENTAIRE = "VCUT"` or `PRODUIT_CODE = "VCUT"`:
- Product columns span 4 cols
- Shows "BIG SHEET" info with quantity
- Different quantity display format

### 3.2 Press Family Operations
For press machines, shows `+` additional quantity if `LaQuantiteAjoutee > 0`

---

## 4. Bilingual Support
All text labels are variables, with language selection:
```cfm
<cfif arguments.Langue EQ "EN">#UCase(OPERATION_S)#<cfelse>#UCase(OPERATION_P)#</cfif>
```
- `_S` suffix = English (Secondary)
- `_P` suffix = French (Primary)

---

## 5. Key Data Fields

From `trouveTableau` query:
| Field | Type | Description |
|-------|------|-------------|
| TRANSAC | int | Transaction/order ID |
| COPMACHINE | int | Operation-machine link ID |
| NOPSEQ | int | Operation sequence |
| NO_PROD | string | Production/order number |
| NOM_CLIENT | string | Client name |
| CONOPO | string | Client PO number |
| NO_INVENTAIRE | string | Inventory item code |
| PRODUIT_CODE | string | Product code |
| MACHINE | int | Machine ID |
| DEPARTEMENT | int | Department ID |
| DATE_DEBUT_PREVU | datetime | Planned start |
| DATE_FIN_PREVU | datetime | Planned end |
| GROUPE | string | Product group |
| Panneau | string | Panel code |
| MOULE_CODE | string | Mold code |
| QTE_FORCEE | numeric | Forced/override quantity |
| OPERATION_S/P | string | Operation name (EN/FR) |
| MACHINE_S/P | string | Machine name (EN/FR) |
| FAMILLEMACHINE | int | Machine family ID |

---

## 6. Touch UI Observations
- Buttons are 38px height, 50px width
- SVG icons at 24x24
- Uses Bootstrap grid (col-xs-* for mobile)
- Row height accommodates touch (multi-line dates, product info)
