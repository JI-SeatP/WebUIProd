# Appendix: Database Object Index

Every database object touched by the VCUT questionnaire, with references to where each appears in the audit docs.

## Tables

| Table | Read | Written | Docs |
|-------|------|---------|------|
| `TEMPSPROD` | Yes | Yes | [01](../01_state_model.md), [03](../03_execution_paths.md), [04](../04_database_interactions.md), [05](../05_outputs_and_side_effects.md) |
| `TEMPSPRODEX` | No | Yes (insert/delete) | [03](../03_execution_paths.md) Flow D/E, [04](../04_database_interactions.md) |
| `ENTRERPRODFINI` | Yes | Yes (insert/delete) | [03](../03_execution_paths.md) Flow B/E, [04](../04_database_interactions.md) |
| `DET_TRANS` | Yes | Yes (insert/delete) | [03](../03_execution_paths.md) Flow B/C/E, [04](../04_database_interactions.md) |
| `TRANSAC` | Yes | Yes (update/delete) | [03](../03_execution_paths.md) Flow B/D/E, [04](../04_database_interactions.md), [05](../05_outputs_and_side_effects.md) |
| `SORTIEMATERIEL` | Yes | Yes (insert/update/delete) | [03](../03_execution_paths.md) Flow C/E, [04](../04_database_interactions.md) |
| `cNOMENCOP` | Yes | Yes (update) | [03](../03_execution_paths.md) Flow D, [04](../04_database_interactions.md), [05](../05_outputs_and_side_effects.md) |
| `cNOMENCOP_Machine` | Yes | No | [00](../00_scope_and_entrypoints.md) |
| `CNOMENCLATURE` / `cNOMENCLATURE` | Yes | No | [03](../03_execution_paths.md) Flow B/C, [04](../04_database_interactions.md). Note: same physical table — CFC code uses both casings (SQL Server is case-insensitive for object names). |
| `INVENTAIRE` | Yes | No | [00](../00_scope_and_entrypoints.md) |
| `PL_RESULTAT` | Yes | Yes (update) | [03](../03_execution_paths.md) Flow D, [04](../04_database_interactions.md), [05](../05_outputs_and_side_effects.md) |
| `DET_DEFECT` | No | Yes (delete) | [03](../03_execution_paths.md) Flow E |
| `CONTENANT` | No | Yes (insert via SP) | [03](../03_execution_paths.md) Flow B |
| `MODEPROD` | Yes (implicit) | No | Referenced via `MODEPROD_MPCODE` and `MPSEQ` |
| `COMMANDE` | Yes | No | Joined in SM creation queries (`SortieMateriel.cfc`). Not directly cited in main docs — see [open_questions.md C3](open_questions.md#c3--missing-table-schemas) |
| `PARA_CIE` | Yes | No | Company parameters referenced in EPF creation (`ProduitFini.cfc`). Not directly cited in main docs |
| `TableSequence` | Yes | No | Sequence generation referenced in EPF creation (`ProduitFini.cfc`). Not directly cited in main docs |

## Views

| View | Datasource | Read by | Docs |
|------|-----------|---------|------|
| `vEcransProduction` | EXT | `support.cfc::trouveUneOperation` | [00](../00_scope_and_entrypoints.md), [01](../01_state_model.md) |
| `VOperationParTransac` | Primary | `QuestionnaireSortie.cfc`, `ProduitFini.cfc` | [00](../00_scope_and_entrypoints.md), [03](../03_execution_paths.md) |
| `VSP_BonTravail_Entete` | Primary | Joined in `trouveUneOperation` | [00](../00_scope_and_entrypoints.md) |
| `VSP_BonTravail_VeneerReserve` | EXT+Primary | Container data (operation details) | [00](../00_scope_and_entrypoints.md) |

## Stored procedures

| SP Name | Called via | Parameters | Output | Docs |
|---------|-----------|------------|--------|------|
| `Nba_Sp_Insert_Production` | EXECUTE_STORED_PROC | 24 positional args | `TJSEQ` | [03](../03_execution_paths.md) Flow B/D, [04](../04_database_interactions.md) |
| `Nba_Sp_Update_Production` | EXECUTE_STORED_PROC | `TJSEQ, DateFin, HeureFin, Note` | — | [03](../03_execution_paths.md) Flow D, [04](../04_database_interactions.md) |
| `Nba_Sp_Insert_Sortie_Materiel` | EXECUTE_STORED_PROC | 10 positional args | `NEWSMNOTRANS` | [03](../03_execution_paths.md) Flow C, [04](../04_database_interactions.md) |
| `Nba_Sp_Sortie_Materiel` | EXECUTE_STORED_PROC | 9 positional args | — | [03](../03_execution_paths.md) Flow C, [04](../04_database_interactions.md) |
| `Nba_Insert_Contenant` | AutoFab SOAP | `22, stmSeq, entrepot, conNumero, 1` | — | [03](../03_execution_paths.md) Flow B, [04](../04_database_interactions.md) |
| `Nba_Insert_Det_Trans_Avec_Contenant` | AutoFab SOAP | Transaction-specific | — | [03](../03_execution_paths.md) Flow B, [04](../04_database_interactions.md) |

## Scalar functions

| Function | Used in | Purpose | Docs |
|----------|---------|---------|------|
| `DBO.AUTOFAB_FctSelectVar` | `vEcransProduction.sql:144` | Resolve `@QTE_FORCE@`, `@TOTAL_BIGSHEET@` | [00](../00_scope_and_entrypoints.md), [01](../01_state_model.md) |
| `DBO.FctSelectVar` | `operation.cfc:4489` | Same function, unprefixed variant. Used in `trouveUnTableauVCut` query | [00](../00_scope_and_entrypoints.md) (listed in SP/functions table) |
| `FctCalculTempsDeProduction` | `QuestionnaireSortie.cfc:1581` | Cost recalculation — **SKIPPED for VCUT** | [00](../00_scope_and_entrypoints.md), [07](../07_porting_invariants.md) I4 |

## AutoFab SOAP transaction commands

| Command | Traitement | Operation | Purpose | Docs |
|---------|-----------|-----------|---------|------|
| `EXECUTE_TRANSACTION` | `EPF` | `INS` | Create EPF header | [03](../03_execution_paths.md) Flow B |
| `EXECUTE_TRANSACTION` | `EPFDETAIL` | `INS` | Create EPF detail rows | [03](../03_execution_paths.md) Flow B |
| `EXECUTE_TRANSACTION` | `EPF` | `REPORT` | Post EPF transaction | [03](../03_execution_paths.md) Flow D, [07](../07_porting_invariants.md) I8 |
| `EXECUTE_TRANSACTION` | `SM` | `REPORT` | Post SM transaction | [03](../03_execution_paths.md) Flow D |

## Not used by VCUT (clarification)

| Object | Note |
|--------|------|
| `Nba_ReporteUnTransac` | Does NOT appear anywhere in the CFC questionnaire source files. Neither VCUT nor non-VCUT uses it. Both use `EXECUTE_TRANSACTION EPF/REPORT` via AutoFab SOAP. The claim in `docs/vcut/09-database-tables.md` is incorrect. |
| `InsertTacheCariste` | Forklift transfer — CNC/PRESS only, not VCUT |
| `AjouteChariot` | Mold action — PRESS/CNC only, not VCUT (TableSaw FMCODE does not match) |
