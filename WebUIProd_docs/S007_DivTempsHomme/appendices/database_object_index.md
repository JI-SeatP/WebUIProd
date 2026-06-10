# Appendix B — Database Object Index

## Primary Datasource (`dsClient` — `TS_SEATPL` / `AF_SEATPLY`)

### Tables

| Table | Read By | Written By | Key Columns |
|-------|---------|------------|-------------|
| `TEMPSPROD` | `afficheTempsProd` | `ModifieStatutTempsProd` (UPDATE) | `TJSEQ` (PK), `MACHINE`, `TRANSAC`, `OPERATION`, `CNOMENCOP`, `MODEPROD`, `MODEPROD_MPCODE`, `MODEPROD_MPDESC_P/S`, `TJQTEPROD`, `TJQTEDEFECT`, `TRANSAC_TRNO`, `TRANSAC_TRITEM`, `SMNOTRANS`, `ENTRERPRODFINI_PFNOTRANS`, `TJDEBUTDATE`, `TJFINDATE`, `TJDUREE`, `cNomencOp_Machine`, `INVENTAIRE_C`, `EMPLOYE_EMNOM` |
| `MACHINE` | `afficheTableauTempsHomme`, `afficheMachines`, `afficheMachinesRecherche`, `afficheMachinesTempsProd`, `afficheTempsProd` (JOIN), `trouveEffort` | — | `MASEQ` (PK), `MACODE`, `MADESC_P`, `MADESC_S`, `DEPARTEMENT` (FK), `MAEFFORTHOMME` (effort rate decimal) |
| `DEPARTEMENT` | `trouveDepartements`, `afficheTempsProd` (JOIN) | — | `DESEQ` (PK), `DECODE`, `DEDESCRIPTION_P`, `DEDESCRIPTION_S`, `DEVOIRDANSUSINE` |
| `EMPLOYE` | `afficheTableauTempsHomme`, `afficheTempsEmploye` | — | `EMSEQ` (PK), `EMNOM`, `EMNOIDENT` |
| `EQUIPE` | `afficheTableauTempsHomme` | — | `EQDEBUTQUART`, `EQFINQUART` |
| `MODEPROD` | `ModifieStatutTempsProd` | — | `MPSEQ` (PK), `MPCODE`, `MPDESC_P`, `MPDESC_S` |
| `PL_RESULTAT` | `afficheTempsProd` (JOIN) | — | `TRANSAC`, `CNOMENCOP` |
| `cNOMENCOP` | `afficheTempsProd` (JOIN) | — | `NOPSEQ` (PK) |
| `INVENTAIRE` | `afficheTempsProd` (LEFT JOIN) | — | `INSEQ` (PK), `INDESC1`, `INDESC2`, `INNOINV` |

### Functions

| Function | Used By | Purpose |
|----------|---------|---------|
| `dbo.FctFormatNoProd(TRNO, TRITEM)` | `afficheTempsProd` | Formats order number for display and LIKE search |

---

## EXT Datasource (`dsClientEXT` — `TS_SEATPL_EXT` / `AF_SEATPLY_EXT`)

### Tables

| Table | Read By | Written By | Key Columns |
|-------|---------|------------|-------------|
| `EMPLOYE_HEURES` | `afficheTempsHomme`, `afficheTempsEmploye`, `ajouteModifieTempsHomme`, `retireTempsHomme` | `ajouteModifieTempsHomme` (INSERT/UPDATE), `retireTempsHomme` (DELETE) | `EMPHSEQ` (PK, identity), `EMPHDATEDEBUT`, `EMPHDATEFIN`, `EMPHEFFORT_HOMME`, `DEPARTEMENT` (FK), `MACHINE` (FK), `EMPLOYE` (FK) |

### Views/Synonyms (cross-database references)

| Object | Maps To | Used By |
|--------|---------|---------|
| `AutoFAB_DEPARTEMENT` | `DEPARTEMENT` (primary DB) | `afficheTempsHomme`, `afficheTempsEmploye` (JOIN) |
| `AutoFAB_MACHINE` | `MACHINE` (primary DB) | `afficheTempsHomme`, `afficheTempsEmploye` (JOIN) |
| `AutoFAB_EMPLOYE` | `EMPLOYE` (primary DB) | `afficheTempsHomme`, `afficheTempsEmploye` (JOIN) |

---

## Write Operations Summary

| Operation | Table | Datasource | Columns Written | Trigger |
|-----------|-------|------------|-----------------|---------|
| INSERT | `EMPLOYE_HEURES` | dsClientEXT | `EMPHDATEDEBUT`, `EMPHDATEFIN`, `EMPHEFFORT_HOMME`, `DEPARTEMENT`, `MACHINE`, `EMPLOYE` | Add Hours OK button |
| UPDATE | `EMPLOYE_HEURES` | dsClientEXT | All 6 data columns | Edit button on search/employee row |
| DELETE | `EMPLOYE_HEURES` | dsClientEXT | (full row) | Delete button on search/employee row |
| UPDATE | `TEMPSPROD` | dsClient | `MODEPROD`, `MODEPROD_MPCODE`, `MODEPROD_MPDESC_P`, `MODEPROD_MPDESC_S` | Status dropdown change |

---

## Document Cross-References

| Object | Referenced In |
|--------|---------------|
| `TEMPSPROD` | [03_execution_paths.md](../03_execution_paths.md) Path 2, Path 5; [04_database_interactions.md](../04_database_interactions.md) |
| `EMPLOYE_HEURES` | [03_execution_paths.md](../03_execution_paths.md) Path 3, 4, 6, 7; [04_database_interactions.md](../04_database_interactions.md) |
| `MODEPROD` | [01_state_model.md](../01_state_model.md) status transitions; [03_execution_paths.md](../03_execution_paths.md) Path 5 |
| `dbo.FctFormatNoProd` | [04_database_interactions.md](../04_database_interactions.md); [07_porting_invariants.md](../07_porting_invariants.md) #13 |
