# Appendix: File Index

All files inspected during this audit, grouped by role.

## Legacy ColdFusion source (primary evidence)

| File | Role in audit |
|------|---------------|
| `src/old/EcransSeatPly/cfc/QuestionnaireSortie.cfc` | Main questionnaire: render (9-174), save (599-1293), status change (1295-1635), validate (2290-2519), cancel (314-597) |
| `src/old/EcransSeatPly/cfc/ProduitFini.cfc` | EPF creation: `AjouteEPF` (1311+), product list by TYPEPRODUIT (385-416), VCUT NiSeq resolution (1947-1959), EPF detail insertion (2001-2022) |
| `src/old/EcransSeatPly/cfc/SortieMateriel.cfc` | SM creation: `ajouteSM` VCUT branch (1648-1836), `InsertSortieMateriel` (2259-2404), SM recalc `calculeQteSMQS` (1070-1205), `RetireSortieMateriel` (2407-2445) |
| `src/old/EcransSeatPly/cfc/operation.cfc` | `trouveUnTableauVCut` BOM query (4477-4502), VCUT detection in dashboard (3478) |
| `src/old/EcransSeatPly/cfc/support.cfc` | `trouveUneOperation` (3602-3615), `envoiXMLGet` AutoFab SOAP proxy (3329-3513), `ConvertXmlToStruct` (3515-3591) |

## SQL views and queries

| File | Role in audit |
|------|---------------|
| `src/old/EcransSeatPly/requetes/vEcransProduction.sql` | View definition: QTE_FORCEE computation (line 144), VCUT detection columns (84-87), TYPEPRODUIT 17 (line 117) |

## New ColdFusion endpoints (migration artifacts, not primary evidence)

These files are new-stack implementations, not legacy source. They were reviewed during the research phase to understand current migration progress but are **not cited as evidence** in the main audit docs (00–07). The legacy CFC files above are the authoritative source for old-software behavior.

| File | Role in audit |
|------|---------------|
| `queries/changeStatus.cfm` | New status-change endpoint (357 lines) — reviewed to confirm SP call signatures match legacy |
| `queries/submitQuestionnaire.cfm` | New submit endpoint (stub/partial) — noted as incomplete migration |
| `queries/getVcutData.cfm` | VCUT data fetching endpoint — reviewed for query structure comparison |

## Existing VCUT migration docs (cross-referenced)

| File | Role in audit |
|------|---------------|
| `docs/vcut/INDEX.md` | Navigation hub — contradictions identified |
| `docs/vcut/01-overview.md` | Detection logic — detection inconsistency noted |
| `docs/vcut/03-questionnaire-layout.md` | Layout and state variables |
| `docs/vcut/04-pf-transaction.md` | EPF creation flow — cross-referenced |
| `docs/vcut/06-sm-transaction.md` | SM flow — step numbering gaps identified |
| `docs/vcut/07-submit-flow.md` | Submit flow — `Nba_ReporteUnTransac` discrepancy identified |
| `docs/vcut/08-cancel-flow.md` | Cancel flow — backend undocumented |
| `docs/vcut/09-database-tables.md` | Table schemas — `Nba_ReporteUnTransac` claim incorrect, missing tables |
| `docs/vcut/10-stored-procedures.md` | SP signatures — AutoFab REPORT param inconsistency |

## React components (referenced for trigger identification only)

| File | Role in audit |
|------|---------------|
| `src/features/questionnaire/QuestionnairePage.tsx` | VCUT detection (line 274), state variables (63-70) |
| `src/features/questionnaire/components/VcutQuantitySection.tsx` | Per-component "+" button trigger |
| `src/features/operation/OperationDetailsPage.tsx` | VCUT detection (line 36) |
| `src/features/operation/hooks/useVcutData.ts` | `getVcutData.cfm` call |

## Type definitions (referenced for contract verification)

| File | Role in audit |
|------|---------------|
| `src/types/workOrder.ts` | `VcutComponent`, `VcutContainer`, `VcutData`, `WorkOrder` types |
