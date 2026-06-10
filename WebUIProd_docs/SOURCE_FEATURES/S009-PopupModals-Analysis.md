# S009 - Popup Modals Analysis

## Source Files
- `src/old/EcransSeatPly/prive/multilangue/sp_js.cfm` - JavaScript functions
- `src/old/EcransSeatPly/cfc/support.cfc` - Modal content generation
- `src/old/EcransSeatPly/cfc/operation.cfc` - Transfer modal content

---

## 1. Modal Overview

All modals share common characteristics:
- Bootstrap modal structure
- Draggable by header (jQuery UI draggable)
- Virtual keyboard attachment when enabled
- Called via AJAX to fetch content

### Modal Container IDs (in index.cfm)
```html
<div id="InfoSKID"></div>           <!-- SKID Scanner Modal -->
<div id="InfoETIQUETTE"></div>      <!-- Label Printing Modal -->
<div id="InfoMessage"></div>        <!-- Message/SMS Modal -->
<div id="InfoTRANSFERTENTREPOT"></div>  <!-- Warehouse Transfer Modal -->
<div id="InfoMOUVEMENT"></div>      <!-- Movement Modal -->
```

---

## 2. SKID Scanner Modal

### 2.1 Purpose
Scan or enter container (SKID/pallet) numbers to view contents and associate with operations.

### 2.2 JavaScript Function
```javascript
function afficheSKID(TRANSAC, COPMACHINE, NOPSEQ) {
    // Calls support.cfc?method=afficheSKID
    // Loads into #InfoSKID
    // Shows #ModalSKID
    // Focuses ScanText input
    // Attaches virtual keyboard to NoSKID
}
```

### 2.3 Modal Layout
```
┌──────────────────────────────────────────────────────────────────────────────┐
│  SKID Scanner                                                    [X Close]  │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Scan: [________________] (hidden barcode input - ScanText)                  │
│                                                                              │
│  SKID #: [________________] (NoSKID - visible input)            [OK]        │
│                                                                              │
├──────────────────────────────────────────────────────────────────────────────┤
│  [SKID Information - loads after scan/entry]                                │
│                                                                              │
│  Product: CODE123 - Description                                             │
│  Quantity: 50                                                                │
│  Warehouse: WH-01                                                           │
│  ...                                                                         │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 2.4 Key Input Fields
| Field | ID | Description |
|-------|-----|-------------|
| Scan Input | ScanText | Hidden field for barcode scanner input |
| SKID Number | NoSKID | Visible text input for manual entry |

### 2.5 Related Functions
```javascript
function completeSKID() {
    // Copies ScanText value to NoSKID
}

function afficheInfoSKID(LeDiv, TRANSAC, COPMACHINE, NOPSEQ) {
    // Fetches SKID details
    // Calls support.cfc?method=afficheInfoSKID
    // Displays product/quantity info
}
```

---

## 3. Label Printing Modal (Etiquette)

### 3.1 Purpose
Print labels for products, SKIDs, or orders.

### 3.2 JavaScript Functions
```javascript
// When viewing an operation (has TRANSAC)
function afficheETIQUETTE(TRANSAC, COPMACHINE, NOPSEQ, NOPROD) {
    // Calls support.cfc?method=afficheETIQUETTE
    // Shows label options for current operation
}

// When no specific operation (header button without machine)
function afficheListeETIQUETTE() {
    // Calls support.cfc?method=afficheListeETIQUETTE
    // Shows search interface for any order
}
```

### 3.3 Modal Layout - Order Specific
```
┌──────────────────────────────────────────────────────────────────────────────┐
│  IMPRIMER ETIQUETTE                                              [X Close]  │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Order: P001-12345                                                          │
│  Product: CODE123 - Widget Assembly                                         │
│                                                                              │
│  Qty per SKID: [____] (QteSKID)                                             │
│                                                                              │
│  [Print Label]                                                              │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 3.4 Modal Layout - Search Mode
```
┌──────────────────────────────────────────────────────────────────────────────┐
│  IMPRIMER ETIQUETTE                                              [X Close]  │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Search: [________________] (BarreRecherchePROD)                            │
│  Order #: [________________] (NOPROD)                           [Search]    │
│                                                                              │
│  [Search Results Table]                                                      │
│  ┌──────────┬─────────────────┬────────────────┬────────┐                   │
│  │ Order    │ Product         │ Description    │ Action │                   │
│  ├──────────┼─────────────────┼────────────────┼────────┤                   │
│  │ P001     │ CODE123         │ Widget         │ [🏷]   │                   │
│  └──────────┴─────────────────┴────────────────┴────────┘                   │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Message/SMS Modal

### 4.1 Purpose
Send messages/notifications to supervisors or other workstations.

### 4.2 JavaScript Function
```javascript
function afficheMessage(TRANSAC, COPMACHINE, NOPSEQ) {
    // Calls support.cfc?method=afficheMessage
    // Shows message form
    // Attaches virtual keyboard to inputs
}
```

### 4.3 Modal Layout
```
┌──────────────────────────────────────────────────────────────────────────────┐
│  ENVOYER MESSAGE                                                 [X Close]  │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Machine/Poste: [________________] (Mess_Machine)                           │
│                                                                              │
│  Probleme/Message:                                                          │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                                                                        │ │
│  │ (Mess_Probleme - textarea)                                            │ │
│  │                                                                        │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  [Send Message]                                                             │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 4.4 Key Input Fields
| Field | ID | Description |
|-------|-----|-------------|
| Machine/Station | Mess_Machine | Target machine or workstation |
| Message | Mess_Probleme | Message content textarea |

---

## 5. Warehouse Transfer Modal (Transfert Entrepot)

### 5.1 Purpose
Move containers (SKIDs) between warehouse locations.

### 5.2 JavaScript Function
```javascript
function afficheTRANSFERTENTREPOT(TRANSAC, COPMACHINE, NOPSEQ) {
    // Calls operation.cfc?method=afficheTRANSFERTENTREPOT
    // Shows transfer interface
    // Attaches virtual keyboard to NoSKIDTE
    // Focuses ScanTextTE
}
```

### 5.3 Modal Layout
```
┌──────────────────────────────────────────────────────────────────────────────┐
│  MOUVEMENT CONTENANT (Container Movement)                        [X Close]  │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Scan: [________________] (ScanTextTE - for barcode)                        │
│                                                                              │
│  SKID #: [________________] (NoSKIDTE)                          [Search]    │
│                                                                              │
├──────────────────────────────────────────────────────────────────────────────┤
│  [Transfer Details - loads after SKID entry]                                │
│                                                                              │
│  Current Location: WH-01 - Warehouse 1                                      │
│                                                                              │
│  ┌──────────┬──────────────────┬─────────────────┬────────┐                 │
│  │ SKID     │ Current          │ Destination     │ Action │                 │
│  │          │ Warehouse        │ (autocomplete)  │        │                 │
│  ├──────────┼──────────────────┼─────────────────┼────────┤                 │
│  │ SKD-001  │ WH-01            │ [WH-02____▼]    │ [OK]   │                 │
│  │ SKD-002  │ WH-01            │ [WH-03____▼]    │ [OK]   │                 │
│  └──────────┴──────────────────┴─────────────────┴────────┘                 │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 5.4 Key Input Fields
| Field | ID | Description |
|-------|-----|-------------|
| Scan Input | ScanTextTE | Hidden field for barcode scanner |
| SKID Number | NoSKIDTE | Visible input for SKID entry |
| Destination | Destination_X_Y | Warehouse code with autocomplete |

### 5.5 Related Functions
```javascript
function completeTRANSFERTENTREPOT() {
    // Copies ScanTextTE to NoSKIDTE
}

function afficheInfoTRANSFERTENTREPOT(LeDiv, TRANSAC, COPMACHINE, NOPSEQ) {
    // Fetches SKID location info
    // Sets up autocomplete for destination fields
}

function ajouteTRANSFERTENTREPOT(TRANSAC, COPMACHINE, NOPSEQ, Compteur, SKID) {
    // Submits transfer request
    // Reloads page on success
}

function entrepotParCode(elem) {
    // Autocomplete lookup for warehouse codes
    // Calls operation.cfc?method=entrepotParCode
}
```

---

## 6. Movement Modal (Mouvement)

### 6.1 Purpose
Record material movements (different from warehouse transfers).

### 6.2 JavaScript Function
```javascript
function afficheMOUVEMENT(TRANSAC, COPMACHINE, NOPSEQ, TREPOSTER) {
    // Calls support.cfc?method=afficheMOUVEMENT
    // Shows movement recording interface
}
```

### 6.3 Parameters
- `TREPOSTER`: Transfer posting status flag

---

## 7. Common Modal Patterns

### 7.1 Modal Show with Draggable
```javascript
$('#ModalXXX').modal('show').find('.modal-dialog').draggable({
    handle: ".modal-header"
});
```

### 7.2 Virtual Keyboard Attachment
```javascript
if (avecClavier == 1) {
    document.getElementById('FieldID') ? VKI_attach(document.getElementById('FieldID')) : '';
}
```

### 7.3 Auto-focus After Show
```javascript
$('#ModalXXX').on('shown.bs.modal', function() {
    $('#InputField').trigger('focus');
});
```

### 7.4 Dimension Adjustment
```javascript
setTimeout(blockModaleSetDimension, 500);
```

---

## 8. CFC Methods Called

| Modal | CFC | Method |
|-------|-----|--------|
| SKID | support.cfc | afficheSKID |
| SKID Info | support.cfc | afficheInfoSKID |
| Label | support.cfc | afficheETIQUETTE |
| Label List | support.cfc | afficheListeETIQUETTE |
| Message | support.cfc | afficheMessage |
| Transfer | operation.cfc | afficheTRANSFERTENTREPOT |
| Transfer Info | operation.cfc | afficheInfoTRANSFERTENTREPOT |
| Transfer Submit | operation.cfc | ajouteTRANSFERTENTREPOT |
| Warehouse Lookup | operation.cfc | entrepotParCode |
| Movement | support.cfc | afficheMOUVEMENT |

---

## 9. Button Styling in Modals

All modals follow consistent button styling:
- Close button: `btn-outline-retire` (red X)
- OK/Submit button: `btn-outline-retour` (green)
- Standard dimensions: 38px height, 50px width
