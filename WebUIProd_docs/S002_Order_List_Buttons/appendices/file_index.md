# File Index

## Old ColdFusion Source Files

| File | Role | Key Lines |
|------|------|-----------|
| `src/old/EcransSeatPly/cfc/Tableau_principal.cfm` | Row template — all 4 buttons rendered here | 1-107 |
| `src/old/EcransSeatPly/cfc/operation.cfc` | Main CFC: `afficheTableauPrincipal()`, `afficheDiv()`, `afficheTableauCommande()` | 9-35, 425-1148, 3381+ |
| `src/old/EcransSeatPly/cfc/support.cfc` | Support CFC: `afficheMOUVEMENT()`, `affichePiedDePage()`, `afficheEntete()` | 2535+ |
| `src/old/EcransSeatPly/cfc/tableau.cfc` | Table CFC: `afficheTableauOperation()` | Called from afficheDiv |
| `src/old/EcransSeatPly/cfc/initialise.cfc` | Login/session init: `initialiseEmploye()`, sets `CodeFonction`, `TJSEQ` | 12+ |
| `src/old/EcransSeatPly/prive/multilangue/sp_js.cfm` | All JS functions: `afficheDiv`, `afficheMOUVEMENT`, `AfficheDetailCommande`, `changeStatut` | 324, 1024, 1168, 2236 |
| `src/old/EcransSeatPly/requetes/vEcransProduction.sql` | Main production view definition | 146, 174 (TREPOSTER subquery) |

## React Migration Files

| File | Role |
|------|------|
| `src/features/work-orders/components/ActionsDropdown.tsx` | Current button migration (dropdown menu) |
| `src/features/work-orders/components/WorkOrderTable.tsx` | Table rendering with status logic |
| `src/features/work-orders/hooks/useWorkOrders.ts` | Data fetching hook |
| `src/features/work-orders/WorkOrderListPage.tsx` | Page component |
| `src/lib/utils.ts` | `isVcutCompleted()`, `pressQtyDisplay()`, `computeQteRestante()` |
| `src/components/shared/StatusBadge.tsx` | Status badge rendering and color mapping |

## Documentation

| File | Role |
|------|------|
| `docs/SOURCE_FEATURES/S002-WorkOrderList-Analysis.md` | Prior analysis of table structure and data fields |
| `docs/SOURCE_FEATURES/S000-ScreenFlow-Summary.md` | Screen flow showing DivPrincipal as main entry point |

## Database Objects

See [database_object_index.md](database_object_index.md) for detailed database object listing.
