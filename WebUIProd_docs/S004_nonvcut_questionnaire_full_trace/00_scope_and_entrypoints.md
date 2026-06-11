# 00 — Scope and Entrypoints

## In scope
The NON-VCUT production questionnaire: everything from the status-button click that opens it through
submit or cancel, on both stacks (old: `src/old/EcransSeatPly`; new: React FE + `server/api.cjs` +
`queries/*.cfm`). Includes the client-side JS orchestration layer (event→call mapping, session state).

## Out of scope
VCUT-specific branches (noted only where they gate shared code), Setup questionnaire, corrections
screen, PQTT toolbar internals (only its handoff seeds are noted), label printing.

## User-visible triggers (old → new)
| Trigger | Old handler | New handler |
|---|---|---|
| STOP/COMP status button | `changeStatut` JS:1024 → `ajouteModifieStatut` QS:1295 → `afficheDiv('DivQuestionnaire')` | StatusActionBar → useStatusChange → `/changeStatus.cfm` → navigate questionnaire URL |
| Good-qty OK (UtiliseInventaire=1) | `calculeQteSMQS` JS chain (QB:126) | handleGoodQtyOk → `/ajouteSM.cfm` |
| Good-qty OK (UtiliseInventaire=0) | `verifieStatutSortie` only (QB:146-151) | gate no-op (QuestionnairePage:147-148) |
| Defect add / edit / reason change | `AjouteModifieDetailDEFECTQS` JS:1382 | handleAddDefect → `/addDefect.cfm` |
| Defect trash | `retireDetailDEFECTQS` JS:1364 | handleRemoveDefect → `/removeDefect.cfm` |
| EPF (finished product) add | `AjouteModifieEPFQS` JS:1562 → `AjouteEPF` PF:1311 | **missing** (FIX-5) |
| SKID/container dropdown | `CorrigeDetailSM` SM:1467 | handleContainerChange → `/corrigeDetailSM.cfm` |
| Submit OK | `ouvrirModaleZero` JS:2980 → `ajouteQuestionnaireSortie` JS:1957 → `ModifieTEMPSPROD` QS:599 | handleSubmit → `/submitQuestionnaire.cfm` |
| Cancel X | `RetireQuestionnaireSortie` JS:1326 → QS:314 | handleCancel → `/cancelQuestionnaire.cfm` |

## Backend entrypoints (old, all in-repo CFCs)
`QuestionnaireSortie.cfc`: afficheTableauQuestionnaire(:9), retireQuestionnaireSortie(:314),
ModifieTEMPSPROD(:599), changeTEMPSPROD(:1637), ReportSortieMateriel(:1743), InsertEnCours(:1788),
InsertTacheCariste(:1932), ReportEntreeProduitFini(:2115), verifieStatutSortie(:2290),
ajouteModifieStatut(:1295).
`SortieMateriel.cfc`: afficheListeSortieMaterielQS(:209), calculeQteSMQS(:824), CorrigeDetailSM(:1467),
ajouteSM(:1514), InsertSortieMateriel(:2259).
`QteDefect.cfc`: retireDetailDEFECTQS(:569), AjouteModifieDetailDEFECTQS(:743).
`QteBonne.cfc`: afficheTableauQteBonnesQS(:~107).
`ProduitFini.cfc`: AjouteEPF(:1311), InsertEntreeProduitFini(:1869), InsertDetailsEntreeProduitFini(:~1960).
`support.cfc`: envoiXMLGet(:3329), ConstruitDonneesLocales, Clarion date/time (:872-873).

## External dependencies
- **AutoFab SOAP API** (address from `vPARAMETRE.PAWS_IP:PAWS_PORT`): `EXECUTE_STORED_PROC` (relay)
  and `EXECUTE_TRANSACTION` (application logic: SM/EPF REPORT, SM DEL, EPF/EPFDETAIL INS).
- **Encrypted SQL Server SPs** (no source): Nba_Sp_Insert_Sortie_Materiel, Nba_Sp_Sortie_Materiel,
  Nba_Insert_Det_Trans_Avec_Contenant, Nba_Sp_Update_Production, Nba_Sp_Insert_Production,
  Nba_Update_ProduitEnCours, Nba_SP_Kpi_Insert_Valeur_Operation_Reel, Nba_Insert_Transfer_Entrepot_*.
  Signatures verified against `sys.parameters` where needed.

## Configuration / flags controlling behavior
- `VOperationParTransac.UtiliseInventaire` — SM section + good-qty OK behavior (QB:107)
- `vEcransProduction/OPERATIONPARTRANSAC.ENTREPF` — finished-products vs good-qty section (QS:64-82)
- `NO_INVENTAIRE/PRODUIT_CODE = 'VCUT'` — VCUT branches (out of scope)
- `PARA_CIE.PCICODE LIKE '%UTILISE_MODULE_CONTENANT%'` — container module in EPF flow (PF)
