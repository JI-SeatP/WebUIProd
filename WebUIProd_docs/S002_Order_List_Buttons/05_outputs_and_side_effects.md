# 05 - Outputs & Side Effects

## Button 1: Consult

### Response
- Returns HTML content for the operation detail panel (DivOperation)
- Includes operation info block, order details, quantities, material info

### Side Effects

| Effect | Details |
|--------|---------|
| **Session writes** | `modifieDonneesSession()` persists TRANSAC, COPMACHINE, NOPSEQ, MASEQ, Filtre1-13 to `session.InfoClient` |
| **DOM mutation** | All `Div*` panels hidden and cleared; `DivOperation` shown with new HTML |
| **Header render** | `afficheEntete()` AJAX call renders page header with order info |
| **Footer render** | `affichePiedDePage('Consulter', ...)` renders footer with **disabled** status buttons |

### Consumers
- The rendered DivOperation is view-only. No further user actions are possible from the footer buttons in Consulter mode (they are disabled/non-interactive).

---

## Button 2: Go/OK

### Response
- Same HTML content as Consult (DivOperation panel)

### Side Effects

| Effect | Details |
|--------|---------|
| **Session writes** | Same as Consult |
| **DOM mutation** | Same as Consult |
| **Header render** | Same as Consult |
| **Footer render** | `affichePiedDePage('Go', ...)` renders footer with **active** status buttons (SETUP, PROD, PAUSE, STOP, COMP) |

### Consumers
- The active footer buttons are consumed by the operator to change production status via `changeStatut()`. This is the primary entry point for status changes in the old software.

---

## Button 3: Transfer

### Response
- Returns HTML for the material movement / container management form

### Side Effects

| Effect | Details |
|--------|---------|
| **Modal open** | `$('#ModalMOUVEMENT').modal('show')` — Bootstrap modal with movement content |
| **Modal sizing** | `setTimeout(blockModaleSetDimension, 500)` adjusts modal dimensions |
| **No session writes** | Unlike Consult/Go, no session state is saved |
| **No DOM clearing** | The list view (DivPrincipal) remains intact underneath the modal |

### Consumers
- The modal content allows the cell chief to manage material containers and transfers for the selected operation. Actions within the modal are a separate feature scope.

---

## Button 4: Details

### Response
- Returns HTML table showing all operations for the selected order number (excluding 'FINSH' operations)

### Side Effects

| Effect | Details |
|--------|---------|
| **Modal open** | `$('#ModalDetailCommande').modal({backdrop: 'static', keyboard: false})` — static Bootstrap modal |
| **Static mode** | Modal cannot be closed by clicking outside or pressing Escape — must use close button |
| **Draggable** | Modal header is draggable |
| **No session writes** | No session state changes |
| **No DOM clearing** | DivPrincipal remains intact underneath |

### Consumers
- Pure read-only display. Shows the operator all operations for the order so they can see the full picture before acting on a specific operation.

---

## Side-Effect Ordering Summary

| Button | Session Write | DOM Clear | Page Navigate | Modal Open | DB Write |
|--------|--------------|-----------|---------------|------------|----------|
| Consult | Yes | Yes | Yes (DivOperation) | No | No |
| Go/OK | Yes | Yes | Yes (DivOperation) | No | No |
| Transfer | No | No | No | Yes (ModalMOUVEMENT) | No |
| Details | No | No | No | Yes (ModalDetailCommande) | No |
