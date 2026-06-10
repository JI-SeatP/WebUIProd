# File Index

## Old ColdFusion Source Files

| File | Role | Key Lines |
|------|------|-----------|
| `src/old/EcransSeatPly/prive/multilangue/sp_js.cfm` | JS `afficheDiv` function | 324-472 |
| `src/old/EcransSeatPly/prive/multilangue/sp_js.cfm` | JS `modifieDonneesSession` function | 241-251 |
| `src/old/EcransSeatPly/cfc/operation.cfc` | `afficheDiv` CFC dispatcher | 9-35, 381-401 |
| `src/old/EcransSeatPly/cfc/tableau.cfc` | `afficheTableauOperation` | 1-300+ |
| `src/old/EcransSeatPly/cfc/tableau.cfc` | `trouveLesDetailsOperation` query | 162-165 |
| `src/old/EcransSeatPly/cfc/tableau.cfc` | `trouveDernierStatutOperation` query | 277-279 |
| `src/old/EcransSeatPly/cfc/support.cfc` | `trouveUneOperation` — main data lookup with COPMACHINE guard | 3595-3617 |
| `src/old/EcransSeatPly/cfc/Tableau_principal.cfm` | OK button onclick with params | 12 |

## New Migration Files

| File | Role | Key Lines |
|------|------|-----------|
| `queries/getOperation.cfm` | New endpoint with 3 bugs | 37, 48, 145 |
| `src/features/work-orders/components/ActionsDropdown.tsx` | Go button handler (missing NOPSEQ) | 66-70 |
| `src/features/operation/hooks/useOperation.ts` | Data fetch hook | 17-18 |
| `src/features/operation/OperationDetailsPage.tsx` | Error display | 224 |
| `src/App.tsx` | Route definition | 28-30 |
