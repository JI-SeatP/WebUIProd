# S003 — Database Operations Audit: Questionnaire, Correction & Status Change

> Full audit of the old ColdFusion software's exact SQL queries, stored procedures, and execution order.
> Our Express API (`server/api.cjs`) must call the **exact same stored procedures with the same parameters** — no custom SQL substitutions, no fallbacks.

---

## 1. Status Change Flow (`ajouteModifieStatut`)

**Old file:** `QuestionnaireSortie.cfc` lines 1295–1635

### Step 1: Find last TEMPSPROD with DIFFERENT status
```sql
SELECT TOP 1 TJSEQ, MODEPROD_MPCODE, TJQTEPROD, TJQTEDEFECT, TJDEBUTDATE,
       SMNOTRANS, cNOMENCOP, CNOMENCLATURE, EMPLOYE, EMPLOYE_EMNO, EMPLOYE_EMNOM
FROM TEMPSPROD
WHERE TRANSAC = @TRANSAC
  AND cNOMENCOP_MACHINE = @COPMACHINE  -- if COPMACHINE <> 0
  AND cNOMENCOP = @NOPSEQ
  AND MODEPROD_MPCODE <> @Statut
  AND TJNOTE LIKE 'Ecran de production pour Temps prod%'
ORDER BY TJSEQ DESC
```

### Step 2: Find last SETUP status
```sql
SELECT TOP 1 TJSEQ, MODEPROD_MPCODE, TJQTEPROD, TJQTEDEFECT, TJDEBUTDATE,
       SMNOTRANS, cNOMENCOP, CNOMENCLATURE
FROM TEMPSPROD
WHERE TRANSAC = @TRANSAC
  AND cNOMENCOP_MACHINE = @COPMACHINE
  AND cNOMENCOP = @NOPSEQ
  AND MODEPROD_MPCODE = 'SETUP'
  AND TJNOTE LIKE 'Ecran de production pour Temps prod%'
ORDER BY TJSEQ DESC
```

### Step 3: Get MODEPROD record
```sql
SELECT MPSEQ, MPCODE, MPDESC_P, MPDESC_S FROM MODEPROD WHERE MPCODE = @Statut
```

### Step 4: Get employee
```sql
SELECT EMSEQ, EMNO, EMNOM, EMTAUXHOR FROM EMPLOYE WHERE EMSEQ = @EMSEQ
```

### Decision: INSERT vs UPDATE

**Path A — No previous status AND Statut ≠ "SETUP":**
- Call `support.ConstruitDonneesLocales` to get Operation_Seq, Machine_Seq, etc.
- Call **`Nba_Sp_Insert_Production`** (22 params + 2 OUTPUT)

**Path B — Previous status exists:**
- Call **`Nba_Sp_Update_Production`** (20 params + 1 OUTPUT) to close previous row
- Then call **`Nba_Sp_Insert_Production`** to create new status row

### Post-Insert Updates
```sql
-- Fix CNOMENCOP and INVENTAIRE_C on new row
UPDATE TEMPSPROD SET CNOMENCOP = @NOPSEQ, INVENTAIRE_C = @INVENTAIRE_SEQ WHERE TJSEQ = @newTJSEQ

-- Mark operation as started
UPDATE PL_RESULTAT SET PR_DEBUTE = 1, MODEPROD = @MPSEQ WHERE CNOMENCOP = @NOPSEQ

-- If PAUSE/STOP/COMP: zero out hourly rates on new row
UPDATE TEMPSPROD SET TJEMTAUXHOR=0, TJOPTAUXHOR=0, TJMATAUXHOR=0,
  TJSYSTEMPSHOMME=0, TJTEMPSHOMME=0, TJEMCOUT=0, TJOPCOUT=0, TJMACOUT=0
WHERE TJSEQ = @newTJSEQ

-- If STOP/COMP (not VCUT): recalculate costs on PREVIOUS PROD row
UPDATE TEMPSPROD SET
  TJSYSTEMPSHOMME = ISNULL(C.CALCSYSTEMPSHOMME,0), ...
FROM TEMPSPROD
INNER JOIN dbo.FctCalculTempsDeProduction(@prevTJSEQ) C ON C.TJSEQ = @prevTJSEQ
WHERE TEMPSPROD.TJSEQ = @prevTJSEQ
```

---

## 2. Stored Procedure Signatures

### `Nba_Sp_Insert_Production`
| #       | Parameter            | Type          | Value                                 |
| ------- | -------------------- | ------------- | ------------------------------------- |
| 1       | @EMPLOYE             | int           | Employee EMSEQ                        |
| 2       | @EMPLOYE_TAUXH       | float         | 0                                     |
| 3       | @OPERATION           | int           | Operation_Seq                         |
| 4       | @OPERATION_TAUXH     | float         | 0                                     |
| 5       | @MACHINE             | int           | Machine_Seq                           |
| 6       | @MACHINE_TAUXH       | float         | 0                                     |
| 7       | @TRSEQ               | int           | TRANSAC                               |
| 8       | @NO_SERIE            | int           | 0                                     |
| 9       | @NO_SERIE_NSNO_SERIE | varchar(20)   | ''                                    |
| 10      | @cNOMENCLATURE       | int           | CNOMENCLATURE or 0                    |
| 11      | @INVENTAIRE_C        | int           | INVENTAIRE_SEQ                        |
| 12      | @TJQTEPROD           | float         | 0                                     |
| 13      | @TJQTEDEFECT         | float         | 0                                     |
| 14      | @TJVALIDE            | bit           | 1                                     |
| 15      | @TJPROD_TERMINE      | bit           | 0                                     |
| 16      | @StrDateD            | char(10)      | 'YYYY-MM-DD' (start)                  |
| 17      | @StrHeureD           | char(8)       | 'HH:mm:ss' (start)                    |
| 18      | @StrDateF            | char(10)      | '' or 'YYYY-MM-DD' (end, for COMP)    |
| 19      | @StrHeureF           | char(8)       | '' or 'HH:mm:ss' (end, for COMP)      |
| 20      | @MODEPROD            | int           | MPSEQ                                 |
| 21      | @TjNote              | varchar(7500) | 'Ecran de production pour Temps prod New' |
| 22      | @LOT_FAB             | int           | 0                                     |
| 23      | @SMNOTRANS           | char(9)       | ''                                    |
| 24      | @CNOMENCOP_MACHINE   | int           | COPMACHINE                            |
| **OUT** | @TJSEQ               | int           | New TJSEQ                             |
| **OUT** | @ERREUR              | int           | Error code                            |

### `Nba_Sp_Update_Production`
| # | Parameter | Type | Value |
|---|-----------|------|-------|
| 1 | @TJSEQ | int | Row to close |
| 2 | @EMPLOYE | int | Employee EMSEQ |
| 3 | @OPERATION | int | Operation_Seq |
| 4 | @MACHINE | int | Machine_Seq |
| 5 | @TRSEQ | int | TRANSAC |
| 6 | @NO_SERIE | int | 0 |
| 7 | @NO_SERIE_NSNO_SERIE | varchar(20) | '' |
| 8 | @cNOMENCLATURE | int | CNOMENCLATURE or 0 |
| 9 | @INVENTAIRE_C | int | INVENTAIRE_SEQ |
| 10 | @TJVALIDE | bit | 1 |
| 11 | @TJPROD_TERMINE | bit | 0 or 1 (COMP) |
| 12 | @TJQTEPROD | float | Good qty |
| 13 | @TJQTEDEFECT | float | Defect qty |
| 14 | @StrDateD | char(10) | Original start date |
| 15 | @StrHeureD | char(8) | Original start time |
| 16 | @StrDateF | char(10) | End date (NOW) |
| 17 | @StrHeureF | char(8) | End time (NOW) |
| 18 | @sModeProd | varchar(5) | MODEPROD_MPCODE (left 5) |
| 19 | @TjNote | varchar(7500) | Note text |
| 20 | @SMNOTRANS | char(9) | SM transaction number |
| **OUT** | @ERREUR | int | Error code |

### `Nba_Update_ProduitEnCours`
| # | Parameter | Type | Value |
|---|-----------|------|-------|
| 1 | @TRANSAC | int | Transaction ID |
| 2 | @NOPSEQ | int | Operation NOPSEQ |
| 3 | @QteBon | float | Good quantity |
| 4 | @QteScrap | float | Defect quantity |
| 5 | @CoutMatiere | float | Material cost (from TRANSAC SUM) |
| 6 | @CoutOperation | float | TJEMCOUT + TJOPCOUT + TJMACOUT |
| **OUT** | @SQLERREUR | int | SQL error |
| **OUT** | @ERREUR | int | Error code |

### `Nba_Corrige_Quantite_Transaction`
| # | Parameter | Type | Value |
|---|-----------|------|-------|
| 1 | @DTRSEQ | int | DET_TRANS detail sequence |
| 2 | @DTRQTE_CORRECTION | float | New corrected quantity |
| 3 | @USAGER | varchar(50) | User/employee name |
| **OUT** | @ERREUR | int | Error code |
| **OUT** | @MSG_EQUATE | varchar(255) | Message |

### `Nba_Recalcul_Un_Produit_EnCours`
| # | Parameter | Type | Value |
|---|-----------|------|-------|
| 1 | @TRANSAC | int | Transaction ID |
| 2 | @MODE_TEST | bit | 0 |

### `Nba_Insert_Det_Trans_Avec_Contenant` (used by SortieMateriel)
Called during material quantity recalculation (`calculeQteSMQS`) to update DET_TRANS with new quantities.

| # | Parameter | Type | Value |
|---|-----------|------|-------|
| 1 | @TRSEQ | int | TRANSAC (the SM transaction TRSEQ from DET_TRANS.TRANSAC) |
| 2 | @INSEQ | int | INVENTAIRE (material inventory INSEQ from trouveSortiesMateriel.INVENTAIRE) |
| 3 | @NSNO_SERIE | varchar(20) | '' (empty) |
| 4 | @ENSEQ | int | ENTREPOT (warehouse ENSEQ from DET_TRANS.ENTREPOT) |
| 5 | @DTRQTEUNINV | float | NouvelleQte (recalculated material quantity) |
| 6 | @TRFACTEURCONV | float | 1 (conversion factor) |
| 7 | @CONTENANT | int | CONTENANT (container SEQ from DET_TRANS.CONTENANT) |
| 8 | @UTILISATEUR | varchar(50) | Employee name (left 50 chars) |
| **OUT** | @SQLERREUR | int | SQL error |
| **OUT** | @ERROR | int | Error code |
| **OUT** | @DTRSEQ | int | New/updated DET_TRANS sequence |

**Old software call pattern** (from SortieMateriel.cfc line 1169):
```
ListeParametres = "TRSEQ, INVENTAIRE, '', ENTREPOT, NouvelleQte, 1, CONTENANT, 'EmployeeName'"
```

---

## 3. Questionnaire Submission (`ModifieTEMPSPROD`)

**Old file:** `QuestionnaireSortie.cfc` lines 599–1293

### Execution Order:

1. **Find PROD TEMPSPROD row** (trouveDernierStatut)
   - `WHERE MODEPROD_MPCODE = 'PROD' AND TJNOTE LIKE 'Ecran de production%'`
   - Gets: TJSEQ, SMNOTRANS, CNOMENCLATURE, CNOMENCOP

2. **Get SMNOTRANS and PFNOTRANS** from that TJSEQ (trouveTEMPSPRODQS)

3. **Reset TJPROD_TERMINE=0** on all rows for this operation

4. **Update employee** on the TJSEQ row

5. **Check if production complete** → set TJPROD_TERMINE=1 if qty remaining ≤ 0

6. **Call `changeTEMPSPROD`** — updates quantities, defects, employee

7. **Find STOP row** → update TEMPSPRODEX with causes (INSERT or UPDATE)

8. **Report material outputs** — for each SMNOTRANS in related TEMPSPROD rows:
   - Find SMSEQ from SORTIEMATERIEL
   - Call **`ReportSortieMateriel`** (uses EXECUTE_TRANSACTION with Clarion dates)

9. **Process finished products** — for each EPF in ListeEPFSEQ:
   - Update DET_TRANS costs
   - Call `ReportEntreeProduitFini`

10. **For each TJSEQ** — call `InsertEnCours` and `InsertTacheCariste`

11. **Call `Nba_Update_ProduitEnCours`** with costs:
    - CoutMatiere from `SELECT SUM(0-TRCOUTTRANS) FROM TRANSAC`
    - CoutOperation from `TJEMCOUT + TJOPCOUT + TJMACOUT`

12. **Auto-complete check** — if STOP and total qty ≥ target, change to COMP

13. **Update cNOMENCOP quantities** (NOPQTETERMINE, NOPQTESCRAP, NOPQTERESTE)

---

## 4. Material Output Display (`afficheListeSortieMaterielQS`)

**Old file:** `SortieMateriel.cfc` lines 209–718

### Key: How materials are found

The query does NOT simply join on SMNOTRANS from a single TJSEQ. It aggregates across ALL related TEMPSPROD rows:

```sql
-- Step A: Find reference TJSEQ (PROD mode, with note pattern)
SELECT TOP 1 TJSEQ FROM TEMPSPROD
WHERE TRANSAC = @TRANSAC AND CNOMENCOP = @NOPSEQ
  AND MODEPROD_MPCODE = 'PROD'
  AND TJNOTE LIKE 'Ecran de production pour Temps prod%'
ORDER BY TJSEQ DESC

-- Step B: Get total quantities across all related TJSEQ
SELECT SUM(TJQTEPROD), SUM(TJQTEDEFECT), ...
FROM TEMPSPROD WHERE TJSEQ IN (@ListeTJSEQCalc) AND MODEPROD_MPCODE = 'PROD'

-- Step C: Get SMNOTRANS from any related TEMPSPROD
SELECT TOP 1 SMNOTRANS FROM TEMPSPROD
WHERE TJSEQ IN (@ListeTJSEQCalc) AND SMNOTRANS <> ''
ORDER BY TJSEQ DESC

-- Step D: Main query — finds materials by ANY matching SMNOTRANS
SELECT DISTINCT DT.*, T.*, TP.*, ABS(DETTRANS.DTRQTE_TRANSACTION) AS QTECORRIGEE
FROM TRANSAC T
LEFT OUTER JOIN cNOMENCLATURE CN ON T.TRSEQ = CN.TRANSAC
LEFT OUTER JOIN CNOMENCOP CNOP ON CNOP.TRANSAC = CN.TRANSAC
LEFT OUTER JOIN DET_TRANS DT ON DT.TRANSAC = T.TRSEQ
OUTER APPLY (
  SELECT TOP 1 TP2.TJSEQ, TP2.TJQTEPROD, TP2.TJQTEDEFECT, TP2.INVENTAIRE_C, TP2.CNOMENCLATURE
  FROM TEMPSPROD TP2
  WHERE TP2.SMNOTRANS = T.TRNO
    AND TP2.TRANSAC = @TRANSAC
    AND TP2.CNOMENCOP = @NOPSEQ   -- ← CRITICAL: filters by THIS operation
  ORDER BY TP2.TJSEQ DESC
) TP
OUTER APPLY (...corrected qty calculation...) DETTRANS
WHERE 1=1 AND (
  1=0
  OR T.TRNO = @SMNOTRANS                    -- explicit SM passed in
  OR T.TRNO = @trouveTEMPSPROD_SMNOTRANS    -- from reference TJSEQ
  OR T.TRNO IN (@ListeSMNoTrans)            -- from ListeSMSEQ
  OR EXISTS (SELECT 1 FROM TEMPSPROD TPX WHERE TPX.SMNOTRANS = T.TRNO
             AND TPX.TJSEQ IN (@ListeTJSEQ))
  OR EXISTS (SELECT 1 FROM TEMPSPROD TPX WHERE TPX.SMNOTRANS = T.TRNO
             AND TPX.TJSEQ IN (@TJSEQ, @LeTJSEQ))
)
```

### Critical Filter
The **OUTER APPLY** filters `TP2.CNOMENCOP = @NOPSEQ` — this ensures only materials for THIS specific operation are returned, even when SMNOTRANS covers multiple operations.

---

## 5. Material Quantity Recalculation (`calculeQteSMQS`)

**Old file:** `SortieMateriel.cfc` lines 824–1363

### Non-VCUT Formula:
```
BOM lookup: cNOMENCOP.cNOMENCLATURE → cNOMENCLATURE.NIQTE (where INVENTAIRE_M = material)
NouvelleQte = ABS(TotalProduit × NIQTE)
```

### VCUT Formula:
```
NouvelleQte = SUM(
  CASE WHEN TJSEQ = current THEN newQty ELSE existingQty END × MAX(NIQTE)
) across all TJSEQ in batch
```

### After calculation, updates via SP:
- **`Nba_Insert_Det_Trans_Avec_Contenant`** — updates DET_TRANS quantity

---

## 6. Correction Flow (`CorrigeProduction`)

**Old file:** `CorrectionInventaire.cfc` lines 199–471

### Execution Order:

1. **Fetch TEMPSPROD** row by TJSEQ
2. **Sum production totals** (WHERE MODEPROD = 1)
3. **For each finished product** with changed qty → **`Nba_Corrige_Quantite_Transaction`**
4. **Update cNOMENCOP.NOPQTESCRAP**
5. **For each material output** with changed qty → **`Nba_Corrige_Quantite_Transaction`**
6. **Call `Nba_Sp_Update_Production`** with corrected quantities and note "Correction temps prod avec Ecran de production"
7. **Recalculate costs** via `FctCalculTempsDeProduction`
8. **Call `Nba_Recalcul_Un_Produit_EnCours`** (TRANSAC, 0)
9. **Adjust next TEMPSPROD row** start time = current row end time (via another `Nba_Sp_Update_Production`)

---

## 7. Intermediate Questionnaire Flows (Before Final Submit)

The old software performs database operations **during** questionnaire interaction, not just on final submit. These are triggered by "OK" buttons on quantity fields.

### 7.1 Good Quantity OK Button Flow

**User action:** Enter good qty → click OK
**JavaScript:** `calculeQteSMQS()` (sp_js.cfm line 1694)
**Two sequential AJAX calls:**

1. **`SortieMateriel.cfc::ajouteSM()`** — Creates or reuses Sortie Matériel
   - If no SM exists for this operation: calls `Nba_Sp_Insert_Sortie_Materiel` + `Nba_Sp_Sortie_Materiel`
   - If SM exists: calls `Nba_Sp_Sortie_Materiel` to update
   - Links SM to TEMPSPROD via `UPDATE TEMPSPROD SET SMNOTRANS = @sm WHERE TJSEQ = @tjseq`
   - Updates TEMPSPROD quantities: `SET TJQTEPROD = @good, TJQTEDEFECT = @defect`

2. **`SortieMateriel.cfc::calculeQteSMQS()`** — Recalculates DET_TRANS detail quantities
   - Uses BOM ratio (`cNOMENCLATURE.NIQTE`) to calculate material quantities
   - For non-VCUT: `NouvelleQte = ABS(TotalProduit × NIQTE)`
   - Calls `Nba_Insert_Det_Trans_Avec_Contenant` to update each DET_TRANS line

### 7.2 Defect Quantity Add/Modify Flow

**User action:** Enter defect qty + select reason → click OK
**JavaScript:** `AjouteModifieDetailDEFECTQS()`
**AJAX call:** `QteDefect.cfc::AjouteModifieDetailDEFECTQS()`

- INSERT or UPDATE `DET_DEFECT` (DDQTEUNINV, RAISON, DDNOTE, DDDATE, TEMPSPROD)
- UPDATE `TEMPSPROD SET TJQTEDEFECT = SUM(all defects for TJSEQ)`
- Then triggers `calculeQteSMQS()` to recalculate material quantities

### 7.3 Defect Delete Flow

**JavaScript:** `retireDetailDEFECTQS()`
- DELETE from `DET_DEFECT`
- UPDATE `TEMPSPROD.TJQTEDEFECT`
- Triggers `calculeQteSMQS()`

---

## 8. Stored Procedure Signatures — Material Output

### `Nba_Sp_Insert_Sortie_Materiel`
| # | Parameter | Type | Value |
|---|-----------|------|-------|
| 1 | @SMITEM | int | TRITEM (from ConstruitDonneesLocales) |
| 2 | @SMNOORIGINE | char(9) | CONOTRANS (from ConstruitDonneesLocales) |
| 3 | @DATE | char(10) | 'YYYY-MM-DD' (NOW) |
| 4 | @HEURE | char(5) | 'HH:mm' (NOW) |
| 5 | @SMQTEPRODUIT | float | Total qty (good + defect) |
| 6 | @USER | varchar(30) | Employee name |
| 7 | @SMNOSERIE | varchar(20) | '' |
| 8 | @SMNOTE | varchar(7500) | 'Ecran de production pour SM' |
| 9 | @LOT_FAB | int | 0 |
| 10 | @SMNORELACHE | int | 0 |
| **OUT** | @NEWSMNOTRANS | char(9) | New SM transaction number (e.g. 'SM-079104') |
| **OUT** | @SQLERREUR | int | SQL error |

### `Nba_Sp_Sortie_Materiel`
| # | Parameter | Type | Value |
|---|-----------|------|-------|
| 1 | @SMNOTRANS | char(9) | SM transaction number |
| 2 | @SMITEM | int | TRITEM |
| 3 | @SMNOORIGINE | char(9) | CONOTRANS |
| 4 | @SMQTEPRODUIT | float | Total qty (good + defect) |
| 5 | @OPERATION | int | Operation_Seq |
| 6 | @USER | varchar(30) | Employee name |
| 7 | @NISTR_NIVEAU | varchar(500) | NISTR_NIVEAU (from ConstruitDonneesLocales) |
| 8 | @NOSERIE | varchar(20) | '' |
| 9 | @SMNORELACHE | int | TRNORELACHE (from ConstruitDonneesLocales) |
| **OUT** | @SQLERREUR | int | SQL error |

---

## 9. Current Issues in Our Implementation

### getMaterialOutput.cfm — ✅ FIXED
- Now uses old software's exact query with `CNOMENCOP = @NOPSEQ` OUTER APPLY filter
- Frontend passes `nopseq` from operation data

### changeStatus.cfm — ✅ FIXED
- Added post-insert: PL_RESULTAT update, zero-out hourly rates, cost recalc on prev PROD, SETUP cost recalc

### submitQuestionnaire.cfm — ✅ PARTIALLY FIXED
- ✅ Fixed CoutMatiere calculation for `Nba_Update_ProduitEnCours`
- ❌ **Missing**: `ajouteSM` flow — creating Sortie Matériel when user enters quantities
- ❌ **Missing**: `calculeQteSMQS` — recalculating DET_TRANS via BOM ratios
- ❌ **Missing**: `ReportSortieMateriel` call on final submit
- ❌ **Missing**: The intermediate "OK on quantity" step that creates SM before final submit

### submitCorrection.cfm — ✅ FIXED
- Added next TEMPSPROD row time adjustment

### Questionnaire UI — ❌ NOT IMPLEMENTED
- **Missing**: OK button on good qty field that triggers `ajouteSM` + `calculeQteSMQS`
- **Missing**: Defect add/modify that triggers DB operations (currently only stores in React state)
- **Missing**: Material output recalculation on quantity changes
- The current UI collects all data in React state and only writes to DB on final "Confirmer" click
- The old software writes to DB at each intermediate step (OK buttons)

### Key Architecture Difference
The old software uses a **write-as-you-go** pattern — each OK button triggers AJAX calls that write to the DB immediately. Our new software uses a **collect-then-submit** pattern — all data stays in React state until the final submit button. To match the old software's behavior exactly, we need to either:
1. Add intermediate API calls on each OK button (matches old software exactly)
2. Or perform all the SM creation + DET_TRANS calculations during the final submit (simpler, same end result)
