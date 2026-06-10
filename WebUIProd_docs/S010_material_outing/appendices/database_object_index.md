# Appendix: Database Object Index

## Tables

| Table | Read | Write | Notes |
|-------|------|-------|-------|
| `SORTIEMATERIEL` | SM header lookup | INSERT (via SP), UPDATE SMQTEPRODUIT, DELETE (cancel) | Lightweight header/link table |
| `TRANSAC` | SM component rows, inventory info | INSERT (via SP), UPDATE quantities | One row per BOM material line; TRNO_EQUATE=7 |
| `DET_TRANS` | Stock lot detail, correction children | INSERT (via SP), UPDATE container/warehouse | Per lot; TRNO_EQUATE=14 for corrections |
| `TEMPSPROD` | SMNOTRANS link, quantities | UPDATE SMNOTRANS | Links production to SM |
| `cNOMENCLATURE` | BOM lines, NIQTE ratio | - | Central to quantity computation |
| `cNOMENCOP` | Operation-to-BOM mapping, INVENTAIRE_P | - | Joins BOM to operation |
| `INVENTAIRE` | Item master | - | Unit, serial flag, cost |
| `NO_SERIE` | Stock lots | - | For auto-serial selection |
| `ENTREPOT` | Warehouse descriptor | - | Default warehouse resolution |
| `PARAMETRE` | Company settings | - | Affects SM behavior (auto-serial, grouping, reservations) |
| `VSP_BonTravail_VeneerReserve` | VCUT container/warehouse | - | EXT datasource only |
| `CONTENANT` | Container | - | Container lookup for VCUT |

## Stored procedures

| SP | Parameters | Where called |
|----|-----------|-------------|
| `Nba_Sp_Insert_Sortie_Materiel` | (not in repo — called via SOAP) | `InsertSortieMateriel:2289` |
| `Nba_Sp_Sortie_Materiel` | SMNOTRANS, SMITEM, SMNOORIGINE, SMQTEPRODUIT, OPERATION, USER, NISTR_NIVEAU, NOSERIE, SMNORELACHE, SQLERREUR OUTPUT | `InsertSortieMateriel:2339`, `ajouteSM:1761`, `calculeQteSMQS` |
| `Nba_Insert_Det_Trans_Avec_Contenant` | (inside Nba_Sp_Sortie_Materiel + calculeQteSMQS) | Lines 1174, 1317 in calculeQteSMQS |
| `Nba_Delete_det_Trans_No_Serie` | (via SOAP) | `CorrigeQteSM:1406` |
| `Nba_Corrige_Quantite_Transaction` | DTRSEQ, new_qty, username | `CorrectionInventaire.cfc:313` |
| `Nba_Execute_Ceiling` | NOMENCLATURE_SEQ_INV, DTRQTE OUTPUT | Inside Nba_Sp_Sortie_Materiel:510 |

## SQL functions

| Function | Purpose |
|----------|---------|
| `dbo.FctGetEntrepotSM(INVENTAIRE_M)` | Default warehouse for an inventory item |
| `dbo.Nba_Get_Entrepot` | Fallback warehouse resolution |
| `dbo.FctGetParaCie()` | Company parameter retrieval |

## Key constants

| Constant | Value | Meaning |
|----------|-------|---------|
| `TRNO_EQUATE` = 7 | SM | Sortie de Matériel transaction type |
| `TRNO_EQUATE` = 14 | Correction | Correction child row |
| `TRNO_EQUATE` = 15 | Reservation | Material reservation |
| `MODEPROD_MPCODE` = "PROD" | Production | Normal production mode |
| `MODEPROD_MPCODE` = "SETUP" | Setup | Setup mode (no SM) |
