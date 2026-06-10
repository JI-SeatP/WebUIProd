# 07 - Porting Invariants

## Required Behavioral Invariants

### INV-1: Consult vs Go distinction must be preserved

The Consult button opens the operation screen in **read-only** mode. The Go button opens it in **active** mode where status changes are possible. This distinction MUST be preserved in the React migration.

**Current migration gap:** `ActionsDropdown.tsx` has both View and Go handlers calling `navigate()` to the same route with no mode distinction. The target route must receive a parameter (e.g., `?mode=consulter` vs `?mode=go`) or use separate routes.

---

### INV-2: Go button hidden when COMP or VCUT-completed

The Go/OK button must NOT appear when:
1. `STATUT_CODE = "COMP"`
2. Order is VCUT and `qteRestante <= 0` (all big sheets consumed)

**Current migration gap:** `ActionsDropdown.tsx` always shows the Go option. It should conditionally render based on `LeBoutonGo` equivalent logic.

---

### INV-3: Transfer button role-gated to cell chiefs only

Only `CodeFonction` values `1031` and `1032` may see the Transfer button.

**Current migration status:** `ActionsDropdown.tsx` already checks `isTeamLeader` correctly.

---

### INV-4: Transfer button hidden when production session is closed

When `TJFINDATE` has a value (not empty), the transfer button must be hidden.

**Current migration status:** `ActionsDropdown.tsx` already checks `!order.TJFINDATE`.

---

### INV-5: Transfer button hidden for department 10

`DESEQ !== 10` must be enforced.

**Current migration status:** `ActionsDropdown.tsx` already checks `order.DESEQ !== 10`.

---

### INV-6: Transfer button color reflects transfer state

| TREPOSTER_TRANSFERT | Color | Meaning |
|---------------------|-------|---------|
| null/empty | Blue | No transfer record |
| 0 | Red | Transfer pending |
| 1 | Gray | Transfer posted |

**Current migration status:** `ActionsDropdown.tsx` has `getTransferColor()` which correctly maps these states.

---

### INV-7: Details modal shows all operations for the order

The Details button must show all operations for the order (excluding 'FINSH'), ordered by `DATE_DEBUT_PREVU`.

**Current migration gap:** `ActionsDropdown.tsx` does not implement the Details button at all.

---

### INV-8: Transfer and Details open as overlays, not page navigations

Transfer and Details open as modal dialogs over the current list. The user does NOT leave the work order list. Consult and Go DO navigate away from the list.

**Current migration gap:** The React migration navigates for View/Go but has no modal implementation for Transfer or Details.

---

### INV-9: `LeBoutonGo` as filter criterion

`LeBoutonGo` is used not only for button visibility but also for row filtering via `Filtre1`. The completed/in-progress filter depends on this computed value. The migration must compute this value per row and use it for both button visibility and list filtering.

---

### INV-10: Session state persistence before navigation

The old `afficheDiv` function saves TRANSAC, COPMACHINE, NOPSEQ, MASEQ, and all filter values to the CF session before navigating. The React migration should persist equivalent context (e.g., in React state, URL params, or a context provider) so that the operation screen knows which order/operation to load and can return to the list with the same filter state.

---

## Incidental Implementation Details (NOT invariants)

These are artifacts of the ColdFusion architecture that should NOT be replicated:

1. **HTML injection via innerHTML** — The old code uses AJAX to fetch server-rendered HTML and inject it into `<div>` elements. React uses component-based rendering.

2. **`modifieDonneesSession()` calls** — ColdFusion session state management. React uses its own state management (context, URL params, etc.).

3. **Bootstrap modal API** (`$('#ModalMOUVEMENT').modal('show')`) — React uses dialog components from shadcn/ui.

4. **`COMPTEURLIGNE` (line counter)** — A page-level incrementing counter passed to `afficheDiv`. In React, this is the array index and is not needed as a parameter.

5. **38px x 50px button sizing** — The old button dimensions. React migration should follow touch-target guidelines (min 48px) but doesn't need to match exact pixel dimensions.

6. **Duplicate HTML IDs** across rows — Not relevant in React's component model.

7. **`Filtre12`/`Filtre13` dead parameters** — Should not be ported.

---

## Migration Checklist

| # | Invariant | Status in ActionsDropdown.tsx |
|---|-----------|------------------------------|
| INV-1 | Consult vs Go mode | NOT IMPLEMENTED — both do same navigate() |
| INV-2 | Go hidden when COMP/VCUT-done | NOT IMPLEMENTED — always shows Go |
| INV-3 | Transfer role gate | IMPLEMENTED |
| INV-4 | Transfer TJFINDATE gate | IMPLEMENTED |
| INV-5 | Transfer dept 10 exclusion | IMPLEMENTED |
| INV-6 | Transfer color states | IMPLEMENTED |
| INV-7 | Details modal | NOT IMPLEMENTED |
| INV-8 | Modal vs navigation pattern | PARTIAL — Transfer has no handler |
| INV-9 | LeBoutonGo as filter | NOT IMPLEMENTED |
| INV-10 | State persistence before nav | NOT ASSESSED |
