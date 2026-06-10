# 00 - Scope & Entrypoints

## In Scope

The complete execution path from the moment the user taps the OK/Go button on a work order row in DivPrincipal through to the operation detail screen (DivOperation) being fully loaded. Specifically:

1. The JS function `afficheDiv` in `sp_js.cfm`
2. The CFC method `operation.cfc:afficheDiv` (dispatcher)
3. The CFC method `tableau.cfc:afficheTableauOperation` (operation screen builder)
4. The CFC method `support.cfc:trouveUneOperation` (operation data lookup)
5. The equivalent React path: `ActionsDropdown.handleGo()` → `useOperation` → `getOperation.cfm`

## Out of Scope

- The Consult button flow (identical path except `Type='Consulter'` disables footer buttons)
- Footer status buttons and `changeStatut` flow (what happens after DivOperation loads)
- Transfer and Details button flows (covered in S002_Order_List_Buttons audit)
- Filter bar logic

## User-Visible Trigger

| Software | Action | What happens |
|----------|--------|--------------|
| **Old CF** | Tap OK button on order row | Navigates to DivOperation with active status buttons. Works for all orders including unstarted (COPMACHINE=0). |
| **New React** | Tap Go in dropdown menu | Navigates to `/orders/:transac/operation/:copmachine`. Fails with "Operation not found" when copmachine=0. |

## Backend Entrypoints

### Old Software
| Step | Target | Method |
|------|--------|--------|
| 1 | `operation.cfc` | `afficheDiv(Div='DivOperation', Type='Go', TRANSAC, COPMACHINE, NOPSEQ, MASEQ, ...)` |
| 2 | `tableau.cfc` | `afficheTableauOperation(TRANSAC, COPMACHINE, NOPSEQ, MASEQ, ...)` |
| 3 | `support.cfc` | `trouveUneOperation(TRANSAC, COPMACHINE, NOPSEQ)` — main data lookup |
| 4 | `support.cfc` | `afficheEntete(Type, TRANSAC, COPMACHINE, NOPSEQ, ...)` — header |
| 5 | `support.cfc` | `affichePiedDePage(Type, TRANSAC, COPMACHINE, NOPSEQ, ...)` — footer/status buttons |

### New Software
| Step | Target | Method |
|------|--------|--------|
| 1 | React Router | Navigate to `/orders/:transac/operation/:copmachine` |
| 2 | `useOperation.ts` | Fetch `getOperation.cfm?transac=X&copmachine=Y` |
| 3 | `getOperation.cfm` | Step 1: lookup TJSEQ, Step 2: full query by TJSEQ |

## Evidence Map

| Source File | Lines | Evidence For |
|-------------|-------|-------------|
| `src/old/.../sp_js.cfm` | 324-472 | JS `afficheDiv` function |
| `src/old/.../operation.cfc` | 9-35, 381-401 | CFC dispatcher |
| `src/old/.../tableau.cfc` | 1-300+ | `afficheTableauOperation` |
| `src/old/.../support.cfc` | 3595-3617 | `trouveUneOperation` — key COPMACHINE=0 guard |
| `queries/getOperation.cfm` | 1-175 | New endpoint with bugs |
| `src/features/work-orders/components/ActionsDropdown.tsx` | 66-70 | React Go handler |
| `src/features/operation/hooks/useOperation.ts` | 1-37 | React data fetch |
