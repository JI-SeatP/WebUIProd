# 00 — Scope and Entrypoints

## In scope

- The VCUT-specific questionnaire exit flow: rendering, EPF creation per component, SM creation/recalc, submit, and cancel
- All VCUT conditional branches within `QuestionnaireSortie.cfc`, `ProduitFini.cfc`, `SortieMateriel.cfc`, `operation.cfc`
- The AutoFab SOAP mechanism (`support.cfc::envoiXMLGet`) used for transaction posting
- The `vEcransProduction` view's `QTE_FORCEE` computation
- Database reads and writes specific to VCUT operations

## Out of scope

- Non-VCUT questionnaire flow (standard, CNC, PRESS operations) — documented only where needed for contrast
- Frontend React components (covered in `docs/vcut/`)
- The new `.cfm` endpoints in `queries/` (migration artifacts, not legacy behavior)
- Login, navigation, work order selection flows
- Print/report generation
- KPI insert (`Nba_SP_Kpi_Insert_Valeur_Operation_Reel`) — called for all operations, not VCUT-specific

## VCUT detection logic

VCUT is detected by two conditions checked with OR throughout the CFC codebase:

```
trouveOperation.PRODUIT_CODE EQ "VCUT"
OR
trouveOperation.NO_INVENTAIRE EQ "VCUT"
```

**Source:** `QuestionnaireSortie.cfc:54`, `QuestionnaireSortie.cfc:83`, `QuestionnaireSortie.cfc:340`, `QuestionnaireSortie.cfc:708`, `ProduitFini.cfc:46`, `SortieMateriel.cfc:1648`

A third detection path uses `TYPEPRODUIT EQ 17` in `ProduitFini.cfc:385`, which sets `EstVCUT = 1` for product-list queries.

The `trouveOperation` recordset is populated by `support.cfc::trouveUneOperation` (line 3602), which queries `vEcransProduction v` joined to `VSP_BonTravail_Entete`. Both `PRODUIT_CODE` and `NO_INVENTAIRE` are columns from the `vEcransProduction` view.

**Note:** The VCUT-complete block at `QuestionnaireSortie.cfc:1186` checks only `NO_INVENTAIRE EQ "VCUT"`, not the combined OR. See [06_edge_cases_and_failure_modes.md](06_edge_cases_and_failure_modes.md).

## User-visible triggers

| Trigger | Action |
|---------|--------|
| Worker taps STOP button on a VCUT operation | Opens questionnaire in STOP mode |
| Worker taps COMP (complete) button on a VCUT operation | Opens questionnaire in COMP mode |

The questionnaire is rendered by `QuestionnaireSortie.cfc::afficheTableauQuestionnaire()` (lines 9–174).

## Backend entrypoints (CFC methods)

| Method | File | Lines | Purpose |
|--------|------|-------|---------|
| `afficheTableauQuestionnaire` | `QuestionnaireSortie.cfc` | 9–174 | Render the questionnaire form |
| `ModifieTEMPSPROD` | `QuestionnaireSortie.cfc` | 599–1293 | Save questionnaire data on submit |
| `ajouteModifieStatut` | `QuestionnaireSortie.cfc` | 1295–1635 | Write status change (STOP/COMP) |
| `verifieStatutSortie` | `QuestionnaireSortie.cfc` | 2290–2519 | Validate form state, enable/disable OK button |
| `retireQuestionnaireSortie` | `QuestionnaireSortie.cfc` | 314–597 | Cancel: undo write-as-you-go changes |
| `AjouteEPF` | `ProduitFini.cfc` | 1311+ | Create EPF transaction per VCUT component |
| `afficheListeProduitFiniQS` | `ProduitFini.cfc` | 46+ | Render finished-product section |
| `ajouteSM` | `SortieMateriel.cfc` | 1648+ | Create/update SM for VCUT batch |
| `calculeQteSMQS` | `SortieMateriel.cfc` | 1070–1205 | Recalculate SM quantities (VCUT weighted ratio) |
| `trouveUnTableauVCut` | `operation.cfc` | 4477–4502 | Query BOM tree for VCUT components |
| `trouveUneOperation` | `support.cfc` | 3602–3615 | Load operation data (including QTE_FORCEE) |
| `ReportEntreeProduitFini` | `QuestionnaireSortie.cfc` | 2115–2143 | Post EPF via AutoFab SOAP `EXECUTE_TRANSACTION EPF/REPORT` (used for ALL operations, not VCUT-specific) |
| `ReportSortieMateriel` | `QuestionnaireSortie.cfc` | 1743–1785 | Post SM via AutoFab SOAP `EXECUTE_TRANSACTION SM/REPORT` (used for ALL operations) |
| `envoiXMLGet` | `support.cfc` | 3329–3513 | AutoFab SOAP proxy for transaction execution |

## Relevant views, stored procedures, and functions

### SQL views
| View | Datasource | Purpose |
|------|-----------|---------|
| `vEcransProduction` | EXT | Main operation view — source of QTE_FORCEE, PRODUIT_CODE, NO_INVENTAIRE, TYPEPRODUIT |
| `VOperationParTransac` | Primary | Operation metadata — ENTREPF, UtiliseInventaire, NISEQ, OPERATION_SEQ |
| `VSP_BonTravail_Entete` | Primary | Work order header join |
| `VSP_BonTravail_VeneerReserve` | EXT+Primary | Veneer container data |

### Stored procedures / functions
| Name | Called via | Purpose |
|------|-----------|---------|
| `Nba_Sp_Insert_Production` | AutoFab SOAP `EXECUTE_STORED_PROC` | Create new TEMPSPROD row |
| `Nba_Sp_Update_Production` | AutoFab SOAP `EXECUTE_STORED_PROC` | Close previous TEMPSPROD row |
| `Nba_Sp_Insert_Sortie_Materiel` | AutoFab SOAP `EXECUTE_STORED_PROC` | Create SM header |
| `Nba_Sp_Sortie_Materiel` | AutoFab SOAP `EXECUTE_STORED_PROC` | Create SM DET_TRANS detail rows |
| `Nba_Insert_Contenant` | AutoFab SOAP `EXECUTE_STORED_PROC` | Create container record |
| `Nba_Insert_Det_Trans_Avec_Contenant` | AutoFab SOAP `EXECUTE_STORED_PROC` | Insert DET_TRANS with container |
| `FctCalculTempsDeProduction` | Direct SQL (table-valued function) | Cost recalculation — **skipped for VCUT** |
| `DBO.AUTOFAB_FctSelectVar` / `DBO.FctSelectVar` | Inline in SQL views (`vEcransProduction.sql:144`) and CFC queries (`operation.cfc:4489`) | Scalar function resolving named variables (`@QTE_FORCE@`, `@TOTAL_BIGSHEET@`). Both names reference the same function — prefixed variant used in views, unprefixed in CFC code. |

### AutoFab SOAP transaction commands
| Command | Traitement | Operation | Purpose |
|---------|-----------|-----------|---------|
| `EXECUTE_TRANSACTION` | `EPF` | `INS` | Create EPF header |
| `EXECUTE_TRANSACTION` | `EPFDETAIL` | `INS` | Create EPF detail rows (DET_TRANS) |
| `EXECUTE_TRANSACTION` | `EPF` | `REPORT` | Post/report EPF transaction |
| `EXECUTE_TRANSACTION` | `SM` | `REPORT` | Post/report SM transaction |

## Configuration and feature flags

No explicit feature flags control the VCUT questionnaire. VCUT behavior is driven entirely by data:
- `PRODUIT_CODE` and `NO_INVENTAIRE` fields on the operation record
- `TYPEPRODUIT = 17` on the product record
- `ENTREPF` flag on `VOperationParTransac` (controls QteBonne vs ProduitFini section — not VCUT-specific)
- `UtiliseInventaire` flag on `VOperationParTransac` (controls SM section — overridden to always-show for VCUT)

## Initial evidence map

| Evidence source | What it proves |
|-----------------|----------------|
| `QuestionnaireSortie.cfc:54` | Defect section suppressed for VCUT |
| `QuestionnaireSortie.cfc:83` | Material exit section forced visible for VCUT |
| `QuestionnaireSortie.cfc:708-730` | `changeTEMPSPROD` skipped for VCUT |
| `QuestionnaireSortie.cfc:1124-1128` | QTE_FORCEE used as completion threshold |
| `QuestionnaireSortie.cfc:1130` | Auto-STOP→COMP promotion suppressed for VCUT |
| `QuestionnaireSortie.cfc:1186-1290` | VCUT-complete block (cNOMENCOP updates, INVENTAIRE_C=10525, TRSTATUTITEM) |
| `QuestionnaireSortie.cfc:1581` | Cost recalculation skipped for VCUT |
| `QuestionnaireSortie.cfc:340-375` | Cancel: KeepTJSEQ logic preserves PROD row |
| `ProduitFini.cfc:385-416` | CNOMENCLATURE-based product list for VCUT |
| `ProduitFini.cfc:1350-1371` | VCUT EPF uses `v.OPERATION = 1` filter |
| `SortieMateriel.cfc:1648-1836` | Batch SM with MAX quantity |
| `SortieMateriel.cfc:1081-1115` | Weighted-ratio SM recalc via cNOMENCLATURE |
| `operation.cfc:4487-4500` | `trouveUnTableauVCut` BOM query |
| `vEcransProduction.sql:144` | QTE_FORCEE = FctSelectVar(@QTE_FORCE@) fallback to @TOTAL_BIGSHEET@ |
