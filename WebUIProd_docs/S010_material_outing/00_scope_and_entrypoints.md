# 00 - Scope and Entrypoints

## In scope

- Display of SM quantities in correction screen and questionnaire screen
- SM quantity recalculation when good/defect quantities change (`calculeQteSM`, `calculeQteSMQS`)
- SM creation (`InsertSortieMateriel`, `ajouteSM`)
- SM correction via `Nba_Corrige_Quantite_Transaction` in the corrections flow
- SM container/warehouse correction (`CorrigeDetailSM`)
- SM deletion on cancel
- SP `Nba_Sp_Sortie_Materiel` — populates TRANSAC + DET_TRANS from BOM
- SP `Nba_Sp_Insert_Sortie_Materiel` — creates SORTIEMATERIEL header

## Out of scope

- The reporting/posting step (`EXECUTE_TRANSACTION SM REPORT`) — a black-box AutofabAPI call
- The `SCRIPT CORRIGE PRODUCTION.SQL::Nba_Corrige_Production` alternate correction path

## CFC methods in SortieMateriel.cfc

| Method | Line | Access | Description |
|--------|------|--------|-------------|
| `_getDetailsSM` | 10 | private | Fetch TRANSAC/DET_TRANS rows for an SMNOTRANS |
| `_renderDetailsSMTable` | 41 | private | Render HTML table of SM detail rows |
| `afficheListeSortieMateriel` | 92 | remote | **Display SM in corrections screen** |
| `afficheListeSortieMaterielQS` | 209 | remote | Display SM in questionnaire screen |
| `calculeQteSM` | 719 | remote | **Recalculate SM quantities (non-QS, returns JSON)** |
| `calculeQteSMQS` | 824 | remote | Recalculate + write SM quantities (QS, returns JSON) |
| `CorrigeQteSM` | 1365 | remote | Correct a specific DET_TRANS line (delete+reinsert) |
| `CorrigeDetailSM` | 1467 | remote | Update container/warehouse on DET_TRANS line |
| `ajouteSM` | 1514 | remote | Create or update SM (main entry point) |
| `InsertSortieMateriel` | 2259 | remote | Create new SM via `Nba_Sp_Insert_Sortie_Materiel` + `Nba_Sp_Sortie_Materiel` |
| `RetireSortieMateriel` | 2407 | remote | Post/report an existing SM |

## Two contexts where SM is used

### 1. Corrections Screen (DivCorrection)
- SM quantities are **display-only** (`type="hidden"`)
- Recalculated via `calculeQteSM` (non-QS) when good/defect quantities change
- On submit, corrections go through `Nba_Corrige_Quantite_Transaction`

### 2. Questionnaire Screen (DivQuestionnaire)
- SM quantities are created/updated via `calculeQteSMQS` (writes to DB immediately)
- Uses `ajouteSM` + `InsertSortieMateriel` for SM creation
- Container/warehouse dropdowns for VCUT
- On questionnaire submit, SM is posted via `EXECUTE_TRANSACTION SM REPORT`
