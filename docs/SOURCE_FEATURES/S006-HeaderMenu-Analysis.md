# S006 - Header Menu & Navigation Analysis

## Source Files
- `src/old/EcransSeatPly/cfc/support.cfc` - `afficheEntete()` function (lines 9-304)

---

## 1. Header Layout Structure

```
┌──────────────────────────────────────────────────────────────────────────────────────────────┐
│ ROW 1: Logo + Navigation + Actions                                                           │
├─────────────┬─────────────────────┬──────────────────────────────────────────────────────────┤
│  col-2      │  col-2              │  col-8 (flex, right-aligned)                             │
│  Logo       │  Navigation Buttons │  Action Buttons + Dropdowns                              │
│  [SEATPLY]  │  [←][Grid][→]       │  [Dept▼][⏱][☰][⌨][⛶][↻][⊟][🏷][✉][↔][📋][FR][EN][X]   │
├─────────────┴─────────────────────┴──────────────────────────────────────────────────────────┤
│ ROW 2: Info Bar (gray background)                                                            │
├──────────────┬──────────────┬──────────────┬──────────────────────┬──────────────────────────┤
│  col-3       │  col-2       │  col-3       │  col-2               │  col-2                   │
│  Employee    │  Team        │  Team Leader │  Shift Hours         │  Current Time            │
│  Name        │  Name        │  Name        │  07:00 - 15:30       │  [Clock]                 │
└──────────────┴──────────────┴──────────────┴──────────────────────┴──────────────────────────┘
```

---

## 2. Navigation Buttons (Col 2 - Left Side)

These buttons are only visible when NOT on questionnaire screens.

### 2.1 Previous Order Button
```html
<button id="btnLISTE_MOYEN" class="btn btn-outline-imprime"
        onClick="afficheProchaineCommande(TRANSAC, COPMACHINE, NOPSEQ, 'Gauche', Prochain)"
        style="height:58px;width:78px;">
    [← Arrow][List Icon]
</button>
```
- **Function**: Navigate to previous order in machine's queue
- **Icon**: Left arrow + checklist (blue #2B78E4)
- **Condition**: Only active when viewing an operation with a machine assigned

### 2.2 Schedule/Grid Button
```html
<button id="btnCEDULE_MOYEN" class="btn btn-outline-cedule"
        onClick="retireDonnees('Machine')"
        style="height:58px;width:58px;">
    [Grid Icon]
</button>
```
- **Function**: Clear machine selection, return to schedule view
- **Icon**: Table/grid (blue #2B78E4)
- **Condition**: Only active when `session.InfoClient.VoirTout = 1`

### 2.3 Next Order Button
```html
<button id="btnLISTE_MOYEN" class="btn btn-outline-imprime"
        onClick="afficheProchaineCommande(TRANSAC, COPMACHINE, NOPSEQ, 'Droite', Prochain)"
        style="height:58px;width:78px;">
    [List Icon][→ Arrow]
</button>
```
- **Function**: Navigate to next order in machine's queue
- **Icon**: Checklist + right arrow (blue #2B78E4)

---

## 3. Action Buttons (Col 8 - Right Side)

### 3.1 Department Dropdown
```html
<select id="Departement" class="form-control"
        onChange="modifieDonnees('Departement');modifieDonnees('Tous');"
        style="width:280px;height:44px;font-size:24px;">
    <option value="-1">TOUS (All)</option>
    <option value="DESEQ">Department Name</option>
</select>
```
- **Function**: Filter work orders by department
- **Visibility**: `VoirTout = 1`

### 3.2 Time Tracking Button (Stopwatch)
```html
<button id="btnEND" class="btn btn-outline-imprime btn-lg"
        onClick="afficheDiv('DivTempsHomme', ...)">
    [Stopwatch Icon - #2B78E4]
</button>
```
- **Function**: Opens **DivTempsHomme** (Worker Time Entry screen)
- **Opens**: Time tracking with tabs for Production Time, Add Hours, Search

### 3.3 Machine Selection Button (List)
```html
<button id="btnSELECTION_MOYEN" class="btn btn-outline-imprime"
        onClick="afficheSEL_MACHINES()"
        style="height:58px;width:58px;">
    [Numbered List Icon - #2B78E4]
</button>
```
- **Function**: Opens modal to select multiple machines to monitor

### 3.4 Virtual Keyboard Toggle
```html
<button id="btnCLAVIER_MOYEN" class="btn btn-outline-modifie"
        onClick="changeClavier('')"
        style="height:58px;width:58px;">
    [Keyboard Icon]
</button>
```
- **Function**: Toggle on-screen virtual keyboard for touchscreen input
- **Color**: Blue when ON, Red when OFF
- **State**: `session.AvecClavier` (0/1)

### 3.5 Fullscreen Button
```html
<button id="btnPLEINECRAN_MOYEN" class="btn btn-outline-dashboard"
        onClick="openFullscreen()"
        style="height:58px;width:58px;">
    [Fullscreen Arrows Icon - #2B78E4]
</button>
```
- **Function**: Enter browser fullscreen mode (for kiosk displays)

### 3.6 Refresh Button
```html
<button id="btnRELOAD_MOYEN" class="btn btn-outline-dashboard"
        onClick="location.reload()"
        style="height:58px;width:58px;">
    [Circular Arrow Icon - #2B78E4]
</button>
```
- **Function**: Reload the entire page

### 3.7 SKID Scanner Button
```html
<button id="btnSCAN_MOYEN" class="btn btn-outline-sortie"
        onClick="afficheSKID(TRANSAC, COPMACHINE, NOPSEQ)"
        style="height:58px;width:58px;">
    [Barcode Icon - #2B78E4]
</button>
```
- **Function**: Opens **SKID Modal** for scanning/entering container numbers
- **Visibility**: `VoirTout = 1`

### 3.8 Label Print Button
```html
<button id="btnETIQUETTE_MOYEN_hdr" class="btn btn-outline-imprime"
        onClick="afficheETIQUETTE(TRANSAC, COPMACHINE, NOPSEQ, '')"
        style="height:58px;width:58px;">
    [Price Tag Icon - #2B78E4]
</button>
```
- **Function**: Opens **Label Printing Modal**
- **Alt Function**: `afficheListeETIQUETTE()` when no machine assigned

### 3.9 Message/SMS Button
```html
<button id="btnMESSAGESMS_MOYEN" class="btn btn-outline-sortie"
        onClick="afficheMessage(TRANSAC, COPMACHINE, NOPSEQ)"
        style="height:58px;width:58px;">
    [Paper Plane Icon - #2B78E4]
</button>
```
- **Function**: Opens **Message Modal** for sending notifications

### 3.10 Warehouse Transfer Button
```html
<button id="btnCARISTE_MOYEN" class="btn btn-outline-imprime"
        onClick="afficheTRANSFERTENTREPOT(TRANSAC, COPMACHINE, NOPSEQ)"
        style="height:58px;width:58px;">
    [Bidirectional Arrows Icon - #2B78E4]
</button>
```
- **Function**: Opens **Warehouse Transfer Modal** for moving containers

### 3.11 Inventory Button
```html
<button id="btnINVENTAIRE_MOYEN" class="btn btn-outline-go btn-lg"
        onClick="afficheDiv('DivInventaire', ...)"
        style="height:58px;width:58px;">
    [Clipboard + Barcode Icons - #009E0F green]
</button>
```
- **Function**: Opens **DivInventaire** (Inventory Management screen)

### 3.12 Language Toggle Buttons
```html
<button id="btnFR_MOYEN" class="btn btn-outline-sortie btn-lg"
        onClick="changeLangue('FR')"
        style="height:58px;width:58px;font-size:24px;">
    FR
</button>
<button id="btnEN_MOYEN" class="btn btn-outline-sortie btn-lg"
        onClick="changeLangue('EN')"
        style="height:58px;width:58px;font-size:24px;">
    EN
</button>
```
- **Function**: Switch UI language

### 3.13 Logout/Close Button
```html
<button id="btnFERMER_MOYEN" class="btn btn-outline-retire btn-lg"
        onClick="goPublic('logout')"
        style="height:58px;width:58px;font-size:24px;">
    X
</button>
```
- **Function**: Log out and return to login screen
- **Color**: Red (#CC0000)

---

## 4. Info Bar (Row 2)

### 4.1 Employee Name (col-3)
```html
<b>#session.InfoClient.NOMEMPLOYE#</b>
```

### 4.2 Team Name (col-2)
```html
<b>#session.InfoClient.Equipe#</b>
```

### 4.3 Team Leader (col-3)
- Displays cell chief name from EMPLOYE table
- Only shows if different from current user

### 4.4 Shift Hours (col-2)
```html
<b>#session.InfoClient.DebutQuart# - #session.InfoClient.FinQuart#</b>
```

### 4.5 Current Time (col-2)
```html
<div id="MontreHeure"></div>
```
- Updated dynamically via JavaScript

---

## 5. Conditional Visibility Rules

| Condition | Hidden Buttons |
|-----------|----------------|
| `Div = DivQuestionnaire` | All navigation and action buttons |
| `Div = DivQuestionnaireSetUp` | All navigation and action buttons |
| `VoirTout = 0` | Schedule, Machine Selection, SKID, Label, Message, Transfer, Inventory |
| `trouveOperation.MACHINE = ""` | Previous/Next navigation, Schedule |
| `Div = DivInventaire/DivTempsHomme/DivCorrection` | Previous/Next navigation (disabled but visible) |

---

## 6. Button Sizing

All buttons follow consistent sizing:
- **Standard**: `height: 58px; width: 58px`
- **Wide (navigation)**: `height: 58px; width: 78px`
- **Icons**: 24x24 SVG
- **Font size**: 24px for text buttons (FR/EN/X)

---

## 7. JavaScript Functions Called

| Button       | Function                                       | Opens                                                      |
| ------------ | ---------------------------------------------- | ---------------------------------------------------------- |
| ← Previous   | `afficheProchaineCommande(..., 'Gauche', ...)` | Previous order                                             |
| Grid         | `retireDonnees('Machine')`                     | DivPrincipal (cleared)                                     |
| → Next       | `afficheProchaineCommande(..., 'Droite', ...)` | Next order                                                 |
| Department   | `modifieDonnees('Departement')`                | Filters list                                               |
| Stopwatch    | `afficheDiv('DivTempsHomme', ...)`             | Time tracking and Production Entries (view/modify) screens |
| Machine List | `afficheSEL_MACHINES()`                        | Machine selection modal                                    |
| Keyboard     | `changeClavier('')`                            | Toggle setting                                             |
| Fullscreen   | `openFullscreen()`                             | Browser fullscreen                                         |
| Refresh      | `location.reload()`                            | Page reload                                                |
| Barcode      | `afficheSKID(...)`                             | SKID modal                                                 |
| Tag          | `afficheETIQUETTE(...)`                        | Label modal                                                |
| Plane        | `afficheMessage(...)`                          | Message modal                                              |
| Arrows       | `afficheTRANSFERTENTREPOT(...)`                | Transfer modal                                             |
| Clipboard    | `afficheDiv('DivInventaire', ...)`             | Inventory screen                                           |
| FR/EN        | `changeLangue('FR'/'EN')`                      | Language switch                                            |
| X            | `goPublic('logout')`                           | Logout                                                     |
