# File Index (inspected sources)

## Old software (`src/old/EcransSeatPly`)
| File | Role | Key symbols (lines) |
|---|---|---|
| cfc/QuestionnaireSortie.cfc | lifecycle | afficheTableauQuestionnaire :9-174; retireQuestionnaireSortie :314-597; ModifieTEMPSPROD :599-1293; ajouteModifieStatut :1295-1635; changeTEMPSPROD :1637-1741; ReportSortieMateriel :1743-1786; InsertEnCours :1788-1930; InsertTacheCariste :1932-2113; ReportEntreeProduitFini :2115-2143; verifieStatutSortie :2290-2519 |
| cfc/SortieMateriel.cfc | SM | afficheListeSortieMaterielQS :209-717 (zero-qty cleanup :277-396); calculeQteSMQS :824-1363 (non-VCUT loop :1210-1351); CorrigeDetailSM :1467-1512; ajouteSM :1514-2257 (masked block :1974-2250); InsertSortieMateriel :2259-2405 |
| cfc/QteDefect.cfc | defects | retireDetailDEFECTQS :569-612; AjouteModifieDetailDEFECTQS :743-847 |
| cfc/QteBonne.cfc | good-qty UI + gating | UtiliseInventaire branch :107-165 |
| cfc/ProduitFini.cfc | EPF | AjouteEPF :1311-1860; InsertEntreeProduitFini :1869-1907; InsertDetailsEntreeProduitFini :~1960-2030 |
| cfc/support.cfc | infra | envoiXMLGet :3329-3513; Clarion :872-873 |
| cfc/operation.cfc | infra | trouveLesInfosTransac :4466-4473; DivQuestionnaire routing :94-111 |
| prive/multilangue/sp_js.cfm | JS orchestration | changeStatut :1024-1067; RetireQuestionnaireSortie :1326-1339; retireDetailDEFECTQS :1364-1380; AjouteModifieDetailDEFECTQS :1382-1421; AjouteModifieEPFQS :1562-1634; calculeQteSMQS :1751-1808; verifieStatutSortie :1811-1875; ajouteQuestionnaireSortie :1957-1983; ouvrirModaleZero/fermerModale :2980-3027 |

## New implementation
| File | Role |
|---|---|
| src/features/questionnaire/QuestionnairePage.tsx | orchestration (handlers :138-405) |
| src/features/questionnaire/hooks/useQuestionnaireSubmit.ts | submit payload/validation |
| src/features/operation/hooks/useStatusChange.ts | status change + tjseq propagation |
| src/features/questionnaire/components/* | sections (MaterialOutputSection renders originalQty) |
| server/api.cjs | endpoints: submitQuestionnaire :1794+; ajouteSM :2846+; corrigeDetailSM :3421+; addDefect :3518+; removeDefect :3650+; cancelQuestionnaire :3725+; changeStatus :4250+; callAutofab+fallback :39-185 |
| queries/ajouteSM.cfm, addDefect.cfm, removeDefect.cfm, corrigeDetailSM.cfm, submitQuestionnaire.cfm, cancelQuestionnaire.cfm, changeStatus.cfm, getOperation.cfm | CF deployment mirrors |

## Database objects verified
sys.parameters: Nba_Sp_Insert_Sortie_Materiel (12p), Nba_Sp_Sortie_Materiel (10p),
Nba_Insert_Det_Trans_Avec_Contenant (11p). OBJECT_DEFINITION: NULL (encrypted) for all Nba_* SPs.
Data forensics: SORTIEMATERIEL/TRANSAC/DET_TRANS/TEMPSPROD rows for SM-083403/083404 (TRPOSTER
behavior, duplicate-line origin, SMNOTRANS decay).
