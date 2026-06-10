# Appendix: Database Object Index

Every table, view, stored procedure, function, and SQL object touched by the corrections feature.

## Tables

| Table | Operation | Where documented |
|-------|-----------|-----------------|
| `TEMPSPROD` | Read (mode check, full row, aggregates, next row) + Write (costs via FctCalculTempsDeProduction) | [04_database_interactions.md](../04_database_interactions.md) R1-R3, R8, W2 |
| `DET_TRANS` | Read (EPF rows, SM rows) + Write (via Nba_Corrige_Quantite_Transaction) | [04_database_interactions.md](../04_database_interactions.md) R4, R5, W3, W4 |
| `TRANSAC` | Read (join for order info, EPF, SM) | [04_database_interactions.md](../04_database_interactions.md) R4, R5, R7 |
| `cNOMENCOP` | Write (NOPQTESCRAP update) | [04_database_interactions.md](../04_database_interactions.md) W1 |
| `EMPLOYE` | Read (employee lookup by EMNO) | [04_database_interactions.md](../04_database_interactions.md) R6 |

## Fields read

### TEMPSPROD
| Field | Used in |
|-------|---------|
| `TJSEQ` | Primary key, all queries |
| `MODEPROD_MPCODE` | Mode check (PROD/SETUP) |
| `TRANSAC` | FK to TRANSAC, aggregate queries |
| `CNOMENCOP` | FK to cNOMENCOP, aggregate queries |
| `CNOMENCLATURE` | SP parameter |
| `INVENTAIRE_C` | SP parameter |
| `SMNOTRANS` | FK to material-exit transaction |
| `ENTRERPRODFINI_PFNOTRANS` | FK to finished-product transaction |
| `TJDEBUTDATE`, `TJFINDATE` | Date display + next-row cascade |
| `TJQTEPROD`, `TJQTEDEFECT` | Quantity display |
| `TRANSAC_TRNO`, `TRANSAC_TRITEM` | Order number display |
| `INVENTAIRE_INDESC1`, `INVENTAIRE_INDESC2` | Item description |
| `MACHINE`, `OPERATION`, `EMPLOYE` | Next-row cascade params |
| `MODEPROD` | Aggregate filter (=1 for production) |

### DET_TRANS
| Field | Used in |
|-------|---------|
| `DTRSEQ` | Primary key, SP parameter |
| `DTRQTE` | Current quantity (compared with form value) |
| `DTRQTE_INV` | Base qty for QTECORRIGEE calculation |
| `DTRSEQ_PERE` | Parent row for correction lookup |
| `TRANSAC_TRNO_EQUATE` | =14 for correction transactions |
| `TRANSAC_TRNO` | SM transaction number |
| `CONTENANT_CON_NUMERO` | Container number (display) |
| `ENTREPOT_ENCODE`, `ENTREPOT_ENDESC_P/S` | Warehouse info (display) |
| `NO_SERIE_NSNO_SERIE` | Serial number (display) |

### TRANSAC
| Field | Used in |
|-------|---------|
| `TRSEQ` | Primary key |
| `TRNO` | Transaction number (join to TEMPSPROD) |
| `TRPOSTER` | =1 for posted transactions (correction lookup) |
| `INVENTAIRE_INNOINV` | Inventory number (display) |
| `INVENTAIRE_INDESC1`, `INVENTAIRE_INDESC2` | Description (display) |
| `UNITE_INV_UNDESC1`, `UNITE_INV_UNDESC2` | Unit description (SM display) |

### EMPLOYE
| Field | Used in |
|-------|---------|
| `EMSEQ` | Employee PK → SP parameter |
| `EMNO` | Employee number (form input) |
| `EMNOM` | Employee name (display) |
| `EMTAUXHOR` | Hourly rate (queried but usage unclear) |

## Fields written

### cNOMENCOP
| Field | Operation | Value |
|-------|-----------|-------|
| `NOPQTESCRAP` | UPDATE | Aggregate SUM(TJQTEDEFECT) from TEMPSPROD |

### TEMPSPROD (via FctCalculTempsDeProduction)
| Field | Operation | Value |
|-------|-----------|-------|
| `TJSYSTEMPSHOMME` | UPDATE | Computed by FctCalculTempsDeProduction |
| `TJTEMPSHOMME` | UPDATE | Computed |
| `TJEMCOUT` | UPDATE | Computed |
| `TJOPCOUT` | UPDATE | Computed |
| `TJMACOUT` | UPDATE | Computed |

## Stored procedures (called via SOAP)

| SP Name | Parameters | Called from | Documented in |
|---------|------------|-------------|---------------|
| `Nba_Corrige_Quantite_Transaction` | `DTRSEQ (int), new_qty (float), username (varchar 30)` | `CorrectionInventaire.cfc:250-260`, `313-323` | [03_execution_paths.md](../03_execution_paths.md), [04_database_interactions.md](../04_database_interactions.md) W3-W4 |
| `Nba_Sp_Update_Production` | 20 positional params (see [07_porting_invariants.md](../07_porting_invariants.md) D2) | `CorrectionInventaire.cfc:364-374`, `445-455` | [03_execution_paths.md](../03_execution_paths.md), [04_database_interactions.md](../04_database_interactions.md) W5, W7 |
| `Nba_Recalcul_Un_Produit_EnCours` | `TRANSAC (int), 0 (int)` | `CorrectionInventaire.cfc:408-418` | [04_database_interactions.md](../04_database_interactions.md) W6 |

**Note:** Internal SQL bodies of these SPs are not available in the repository (encrypted server-side).

## SQL functions

| Function | Type | Parameters | Output columns | Called from |
|----------|------|------------|---------------|-------------|
| `dbo.FctCalculTempsDeProduction` | Table-valued | `TJSEQ (int)` | `TJSEQ, CALCSYSTEMPSHOMME, CALCTEMPSHOMME, CALCEMCOUT, CALCOPCOUT, CALCMACOUT` | `CorrectionInventaire.cfc:392-402` |

**Note:** Internal definition not available in repository.

## Tables written by independent defect AJAX (not CorrigeProduction)

| Table | Operation | Where documented |
|-------|-----------|-----------------|
| `DET_DEFECT` | INSERT new defect rows / UPDATE existing rows | [03_execution_paths.md](../03_execution_paths.md) Flow 4, [04_database_interactions.md](../04_database_interactions.md) W8 |
| `TEMPSPROD` | UPDATE `TJQTEDEFECT` (re-sum after each defect save) | [04_database_interactions.md](../04_database_interactions.md) W9 |

### DET_DEFECT fields written on INSERT
`TRANSAC, INVENTAIRE, MACHINE, EMPLOYE, DDQTEUNINV, DDDATE, RAISON, DDNOTE, DDVALEUR_ESTIME_UNITAIRE, DDVALEUR_ESTIME_TOTALE, TEMPSPROD, TRANSAC_PERE`

### DET_DEFECT fields written on UPDATE
`DDQTEUNINV, RAISON, DDNOTE, DDDATE, DDVALEUR_ESTIME_UNITAIRE, DDVALEUR_ESTIME_TOTALE`

## SPs defined in SCRIPT CORRIGE PRODUCTION.SQL (alternate path — NOT used)

| SP Name | Lines | Purpose |
|---------|-------|---------|
| `Nba_Corrige_Production` | 1719-1974 | Master corrections orchestrator (newer path) |
| `Nba_Delete_Transaction` | 29-183 | Delete all TRANSAC rows for a TRNO |
| `Nba_Sp_Sortie_Materiel` | 188-939 | Create/update material-exit transactions |
| `Nba_Valide_Dereport` | 945-997 | Validate un-report is safe |
| `Nba_DereporteTransaction` | 1003-1713 | Full un-report logic |

These SPs are **not called** by the legacy ColdFusion correction path. `Nba_Corrige_Production` is a separate, consolidated SP that orchestrates corrections differently (unreport → recalculate → re-report).
