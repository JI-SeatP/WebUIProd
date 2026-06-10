# 00 - Scope & Entrypoints

## In Scope

The 4 row-level interactive buttons rendered in the work order list table (DivPrincipal), their visibility conditions, onclick handlers, AJAX calls, and immediate backend responses.

| # | Button | Element ID | Icon |
|---|--------|------------|------|
| 1 | Consult | `btnCONSULTE_PETIT` | Info-circle SVG (blue #2B78E4) |
| 2 | Go/OK | `btnGO_MOYEN` | Text "OK" |
| 3 | Transfer | `btnCARISTE_MOYEN` / `btnCARISTE_PETIT` | Arrow-left-right SVG (3 color variants) |
| 4 | Details | `btnVOIR_PETIT` | Search/magnifier SVG (blue #2B78E4) |

## Out of Scope

- Table data query (`afficheTableauPrincipal` SQL and filtering) — covered in `S002-WorkOrderList-Analysis.md`
- Filter bar and filter parameter logic
- Status icon images (non-interactive `<img>`)
- Column rendering and data display
- Downstream flows after the initial button action completes (e.g., what happens inside DivOperation after it loads, the `changeStatut` flow from footer buttons)

## User-Visible Triggers

Each button is a `<button>` element within a `<td>` in the order list `<tr>`. All have `height:38px; width:50px; font-size:16px` inline styles. Users tap/click them on the production floor touchscreen.

## Backend Entrypoints

| Button | JS Function | AJAX Target |
|--------|-------------|-------------|
| Consult | `afficheDiv()` | `operation.cfc?method=afficheDiv` (Div=DivOperation, Type=Consulter) |
| Go/OK | `afficheDiv()` | `operation.cfc?method=afficheDiv` (Div=DivOperation, Type=Go) |
| Transfer | `afficheMOUVEMENT()` | `support.cfc?method=afficheMOUVEMENT` |
| Details | `AfficheDetailCommande()` | `operation.cfc?method=afficheTableauCommande` |

## Relevant CFC Methods (access="remote")

- `operation.cfc:afficheDiv` — dispatcher that routes to sub-methods based on `Div` param
- `operation.cfc:afficheTableauCommande` — returns HTML table of all operations for an order
- `support.cfc:afficheMOUVEMENT` — returns HTML for material movement/container modal
- `support.cfc:affichePiedDePage` — renders footer status buttons (called from within `afficheDiv` flow)
- `support.cfc:afficheEntete` — renders page header (called from within `afficheDiv` flow)

## Configuration / Permissions

- **Transfer button role gate:** `session.InfoClient.CodeFonction` must be `1031` or `1032` (chef de cellule / cell chief roles)
- **No other permission checks** gate the Consult, Go, or Details buttons
- **Language:** `session.Langue` / `arguments.Langue` control bilingual text on buttons' title attributes

## Initial Evidence Map

| Source File | Lines | Evidence For |
|-------------|-------|-------------|
| `src/old/EcransSeatPly/cfc/Tableau_principal.cfm` | 1-107 | Button HTML, visibility conditions, onclick params |
| `src/old/EcransSeatPly/cfc/operation.cfc` | 425-1148 | `afficheTableauPrincipal()` — button state computation |
| `src/old/EcransSeatPly/cfc/operation.cfc` | 9-35 | `afficheDiv()` — remote method dispatcher |
| `src/old/EcransSeatPly/cfc/operation.cfc` | 3381+ | `afficheTableauCommande()` — order detail query |
| `src/old/EcransSeatPly/prive/multilangue/sp_js.cfm` | 324-472 | `afficheDiv()` JS function |
| `src/old/EcransSeatPly/prive/multilangue/sp_js.cfm` | 1168-1181 | `afficheMOUVEMENT()` JS function |
| `src/old/EcransSeatPly/prive/multilangue/sp_js.cfm` | 2236-2253 | `AfficheDetailCommande()` JS function |
| `src/old/EcransSeatPly/cfc/support.cfc` | 2535+ | `afficheMOUVEMENT()` CFC method |
