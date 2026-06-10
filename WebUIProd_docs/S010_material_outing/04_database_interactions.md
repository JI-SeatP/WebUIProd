# 04 - Database Interactions

## Tables read

| Table | Method | Purpose |
|-------|--------|---------|
| `TEMPSPROD` | afficheListeSortieMateriel, calculeQteSM, calculeQteSMQS | Get SMNOTRANS, TJQTEPROD, TJQTEDEFECT |
| `DET_TRANS` | afficheListeSortieMateriel, calculeQteSM | Get SM detail rows with OUTER APPLY |
| `TRANSAC` | afficheListeSortieMateriel, calculeQteSM | Join to get inventory info, TRNO |
| `cNOMENCLATURE` | calculeQteSM, calculeQteSMQS | Get NIQTE (BOM ratio) |
| `cNOMENCOP` | calculeQteSMQS, afficheListeSortieMaterielQS | Get cNOMENCLATURE FK, INVENTAIRE_P |
| `SORTIEMATERIEL` | afficheListeSortieMaterielQS, ajouteSM | SM header lookup by SMNOTRANS |
| `INVENTAIRE` | Nba_Sp_Sortie_Materiel | Item master (unit, serial flag, cost) |
| `NO_SERIE` | Nba_Sp_Sortie_Materiel | Stock lots for auto-selection |
| `ENTREPOT` | Nba_Sp_Sortie_Materiel | Warehouse descriptor |
| `VSP_BonTravail_VeneerReserve` | afficheListeSortieMaterielQS (VCUT) | VCUT container/warehouse options (EXT datasource) |
| `PARAMETRE` | Nba_Sp_Sortie_Materiel | Company settings |

## Tables written

| Table | Method | Operation | Condition |
|-------|--------|-----------|-----------|
| `SORTIEMATERIEL` | Nba_Sp_Insert_Sortie_Materiel | INSERT | SM creation |
| `SORTIEMATERIEL` | Nba_Sp_Sortie_Materiel:541 | UPDATE SMQTEPRODUIT | Modification path |
| `SORTIEMATERIEL` | calculeQteSMQS:1198, ajouteSM:2001 | UPDATE SMQTEPRODUIT | Quantity sync |
| `SORTIEMATERIEL` | QuestionnaireSortie.cfc:500 | DELETE | Cancel path |
| `TRANSAC` | Nba_Sp_Sortie_Materiel:524,562-668 | INSERT/UPDATE | New/modified SM component row |
| `TRANSAC` | calculeQteSMQS:1202-1208, 1343-1350 | UPDATE TRQTETRANSAC/TRQTEUNINV/TRQTEINV_ESTIME | Quantity sync after recalc |
| `DET_TRANS` | Nba_Sp_Sortie_Materiel:681-930 | INSERT | Stock lot rows via Nba_Insert_Det_Trans |
| `DET_TRANS` | CorrigeDetailSM:1499-1509 | UPDATE | Container/warehouse correction |
| `DET_TRANS` | Nba_Corrige_Quantite_Transaction | INSERT/UPDATE | Correction child rows (TRNO_EQUATE=14) |
| `TEMPSPROD` | InsertSortieMateriel:2387-2399 | UPDATE SMNOTRANS | Link SM to production entry |
| `TEMPSPROD` | ajouteSM:1797-1805 (VCUT) | UPDATE SMNOTRANS | Link SM to all batch PROD rows |
| `TEMPSPROD` | QteDefect.cfc:605 | UPDATE via SMQTEPRODUIT sync | After defect entry |

## Key SQL patterns

### OUTER APPLY for QTECORRIGEE
Used in both display and recalculation queries:
```sql
OUTER APPLY (
  SELECT DT.DTRQTE_INV + ISNULL((
    SELECT SUM(DTCOR.DTRQTE_INV) QTE
    FROM DET_TRANS DTCOR
    INNER JOIN TRANSAC TR ON (TR.TRSEQ = DTCOR.TRANSAC AND TR.TRPOSTER = 1)
    WHERE DTCOR.DTRSEQ_PERE = DT.DTRSEQ AND DTCOR.TRANSAC_TRNO_EQUATE = 14
  ), 0) DTRQTE_TRANSACTION
) DETTRANS
```
**Note:** Display query includes `TR.TRPOSTER = 1` (only posted corrections). `calculeQteSM` query omits this filter.

### VCUT QTE_CIBLE computation (calculeQteSMQS)
```sql
SELECT SUM(
  CASE WHEN TP.TJSEQ = @current_TJSEQ
    THEN @submitted_total        -- use form values for current entry
    ELSE ISNULL(TP.TJQTEPROD,0) + ISNULL(TP.TJQTEDEFECT,0)  -- use DB values for others
  END * ISNULL(RATIO.NIQTE, 0)
) AS QTE_CIBLE
FROM TEMPSPROD TP
INNER JOIN cNOMENCOP COP ON COP.TRANSAC = TP.TRANSAC AND COP.INVENTAIRE_P = TP.INVENTAIRE_C
OUTER APPLY (SELECT MAX(CN.NIQTE) AS NIQTE FROM cNOMENCLATURE CN
  WHERE CN.NISEQ_PERE = COP.CNOMENCLATURE AND CN.INVENTAIRE_M = @material_INVENTAIRE) RATIO
WHERE TP.TRANSAC = @TRANSAC AND TP.SMNOTRANS = @SMNOTRANS
  AND TP.TJSEQ IN (@ListeTJSEQ) AND TP.MODEPROD_MPCODE = 'PROD'
```
