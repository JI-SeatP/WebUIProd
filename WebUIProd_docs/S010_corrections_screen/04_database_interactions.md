# 04 - Database Interactions

## Reads

### R1: TEMPSPROD mode check (display)
- **Source:** `CorrectionInventaire.cfc:25-29`
- **SQL:** `SELECT MODEPROD_MPCODE FROM TEMPSPROD WHERE TJSEQ = @TJSEQ`
- **Table:** `TEMPSPROD`
- **Fields read:** `MODEPROD_MPCODE`
- **Purpose:** Determine PROD vs SETUP mode for conditional rendering

### R2: Full TEMPSPROD row (submit)
- **Source:** `CorrectionInventaire.cfc:208-212`
- **SQL:** `SELECT * FROM TEMPSPROD WHERE TJSEQ = @TJSEQ`
- **Table:** `TEMPSPROD`
- **Fields used:** `TRANSAC`, `CNOMENCOP`, `MODEPROD_MPCODE`, `CNOMENCLATURE`, `INVENTAIRE_C`, `SMNOTRANS`
- **Purpose:** Base data for all subsequent operations

### R3: Aggregate production quantities (submit)
- **Source:** `CorrectionInventaire.cfc:213-219`
- **SQL:**
  ```sql
  SELECT SUM(TJQTEPROD) AS TotalPROD, SUM(TJQTEDEFECT) AS TotalDEFECT
  FROM TEMPSPROD
  WHERE TRANSAC = @TRANSAC AND cNomencOp = @cNOMENCOP AND MODEPROD = 1
  ```
- **Table:** `TEMPSPROD`
- **Purpose:** Calculate totals across all production-mode entries for the same operation

### R4: Finished products DET_TRANS (display + submit)
- **Source:** `CorrectionInventaire.cfc:72-81` (display) and `227-233` (submit)
- **SQL:**
  ```sql
  SELECT DT.DTRSEQ, DT.DTRQTE, DT.CONTENANT_CON_NUMERO, ...
         T.INVENTAIRE_INNOINV, T.INVENTAIRE_INDESC1, T.INVENTAIRE_INDESC2,
         ABS(DETTRANS.DTRQTE_TRANSACTION) AS QTECORRIGEE
  FROM DET_TRANS DT
  INNER JOIN TRANSAC T ON DT.TRANSAC = T.TRSEQ
  INNER JOIN TEMPSPROD TP ON T.TRNO = TP.ENTRERPRODFINI_PFNOTRANS
  OUTER APPLY (
    SELECT DT.DTRQTE_INV + ISNULL((
      SELECT SUM(DTCOR.DTRQTE_INV) QTE
      FROM DET_TRANS DTCOR
      INNER JOIN TRANSAC TR ON (TR.TRSEQ = DTCOR.TRANSAC AND TR.TRPOSTER = 1)
      WHERE DTCOR.DTRSEQ_PERE = DT.DTRSEQ AND DTCOR.TRANSAC_TRNO_EQUATE = 14
    ), 0) DTRQTE_TRANSACTION
  ) DETTRANS
  WHERE TP.TJSEQ = @TJSEQ
  ```
- **Tables:** `DET_TRANS`, `TRANSAC`, `TEMPSPROD`
- **Purpose:** Get finished-product quantities with correction adjustments (TRNO_EQUATE=14 indicates prior correction transactions)
- **Note:** Display query includes `QTECORRIGEE` column; submit query does not (it only needs `DTRSEQ` and `DTRQTE`)

### R5: Material exits DET_TRANS (submit)
- **Source:** `CorrectionInventaire.cfc:291-298`
- **SQL:**
  ```sql
  SELECT DT.DTRSEQ, DT.DTRQTE, DT.CONTENANT_CON_NUMERO, ...
         T.INVENTAIRE_INNOINV, T.UNITE_INV_UNDESC1, T.UNITE_INV_UNDESC2
  FROM TEMPSPROD TP
  INNER JOIN DET_TRANS DT ON DT.TRANSAC_TRNO = TP.SMNOTRANS
  INNER JOIN TRANSAC T ON DT.TRANSAC = T.TRSEQ
  WHERE TP.TJSEQ = @TJSEQ
  ```
- **Tables:** `TEMPSPROD`, `DET_TRANS`, `TRANSAC`
- **Purpose:** Get material-exit transaction rows linked via SMNOTRANS

### R6: Employee lookup (submit)
- **Source:** `CorrectionInventaire.cfc:353-357`
- **SQL:**
  ```sql
  SELECT em.EMSEQ, em.EMNO, em.EMNOM, em.EMTAUXHOR
  FROM EMPLOYE em
  WHERE em.EMNO = @EMNO
  ```
- **Table:** `EMPLOYE`
- **Purpose:** Resolve employee number to EMSEQ for stored procedure call

### R7: Order info (display)
- **Source:** `CorrectionInventaire.cfc:110-115`
- **SQL:**
  ```sql
  SELECT TP.TRANSAC_TRNO, TP.TRANSAC_TRITEM, TP.INVENTAIRE_INDESC1,
         TP.INVENTAIRE_INDESC2, T.INVENTAIRE_INNOINV
  FROM TEMPSPROD TP
  INNER JOIN TRANSAC T ON TP.TRANSAC = T.TRSEQ
  WHERE TP.TJSEQ = @TJSEQ
  ```
- **Tables:** `TEMPSPROD`, `TRANSAC`
- **Purpose:** Display order number and item description

### R8: Next TEMPSPROD row (submit)
- **Source:** `CorrectionInventaire.cfc:425-431`
- **SQL:**
  ```sql
  SELECT TOP 1 TJSEQ, MACHINE, TRANSAC, OPERATION, EMPLOYE, MODEPROD,
         MODEPROD_MPCODE, TJDEBUTDATE, TJFINDATE, TJQTEPROD, TJQTEDEFECT,
         TJNOTE, ... SMNOTRANS, ENTRERPRODFINI_PFNOTRANS
  FROM TEMPSPROD
  WHERE TRANSAC = @TRANSAC AND CNOMENCOP = @CNOMENCOP AND TJSEQ > @TJSEQ
  ```
- **Table:** `TEMPSPROD`
- **Purpose:** Find the immediately following TEMPSPROD row to cascade time changes

### R9: Operation lookup (display)
- **Source:** `CorrectionInventaire.cfc:33-39` via `support.trouveUneOperation`
- **Purpose:** Get STATUT_CODE, PRODUIT_CODE, NO_INVENTAIRE for the current operation

---

## Writes

### W1: cNOMENCOP scrap update (direct SQL)
- **Source:** `CorrectionInventaire.cfc:283-287`
- **SQL:**
  ```sql
  UPDATE cNOMENCOP
  SET NOPQTESCRAP = @TotalDefect
  WHERE NOPSEQ = @cNOMENCOP
  ```
- **Table:** `cNOMENCOP`
- **Field:** `NOPQTESCRAP`
- **Condition:** Only when `MODEPROD_MPCODE = "PROD"`
- **Timing:** After EPF corrections, before SM corrections

### W2: TEMPSPROD cost recalculation (direct SQL)
- **Source:** `CorrectionInventaire.cfc:392-402`
- **SQL:**
  ```sql
  UPDATE TEMPSPROD
  SET TJSYSTEMPSHOMME = ISNULL(COUTS_TEMPSPROD.CALCSYSTEMPSHOMME, 0),
      TJTEMPSHOMME    = ISNULL(COUTS_TEMPSPROD.CALCTEMPSHOMME, 0),
      TJEMCOUT        = ISNULL(COUTS_TEMPSPROD.CALCEMCOUT, 0),
      TJOPCOUT        = ISNULL(COUTS_TEMPSPROD.CALCOPCOUT, 0),
      TJMACOUT        = ISNULL(COUTS_TEMPSPROD.CALCMACOUT, 0)
  FROM TEMPSPROD
  INNER JOIN dbo.FctCalculTempsDeProduction(@TJSEQ) COUTS_TEMPSPROD
    ON COUTS_TEMPSPROD.TJSEQ = @TJSEQ
  WHERE TEMPSPROD.TJSEQ = @TJSEQ
  ```
- **Table:** `TEMPSPROD`
- **Fields:** `TJSYSTEMPSHOMME`, `TJTEMPSHOMME`, `TJEMCOUT`, `TJOPCOUT`, `TJMACOUT`
- **Condition:** Only when `MODEPROD_MPCODE = "PROD"`
- **Timing:** After `Nba_Sp_Update_Production`, before `Nba_Recalcul_Un_Produit_EnCours`

### W3-W6: Stored procedure writes (via envoiXMLGet SOAP)

| Write | SP | Parameters | Condition | Timing |
|-------|-----|-----------|-----------|--------|
| W3 | `Nba_Corrige_Quantite_Transaction` | `DTRSEQ, new_qty, username` | Per changed EPF row | First |
| W4 | `Nba_Corrige_Quantite_Transaction` | `DTRSEQ, new_qty, username` | Per changed SM row | After W3 |
| W5 | `Nba_Sp_Update_Production` | 20 params (see below) | Always | After W1/W4 |
| W6 | `Nba_Recalcul_Un_Produit_EnCours` | `TRANSAC, 0` | PROD only | After W2 |
| W7 | `Nba_Sp_Update_Production` | 20 params (next row) | If next row exists | Last |

### `Nba_Sp_Update_Production` parameter signature (20 params)

```
TJSEQ, EMSEQ, OPERATION, MACHINE, TRANSAC,
'', '',                                      -- (unused placeholders)
CNOMENCLATURE, INVENTAIRE_C,
1, 0,                                        -- (flags)
TJQTEPROD, TJQTEDEFECT,
'DateDebut yyyy-mm-dd', 'HeureDebut HH:nn:ss',
'DateFin yyyy-mm-dd', 'HeureFin HH:nn:ss',
'MODEPROD_MPCODE',
'Correction temps prod avec Ecran de production',  -- note
'SMNOTRANS'
```

---

## Write ordering

```
1. Loop: Nba_Corrige_Quantite_Transaction (per changed EPF row)
2. UPDATE cNOMENCOP SET NOPQTESCRAP
3. Loop: Nba_Corrige_Quantite_Transaction (per changed SM row)
4. Nba_Sp_Update_Production (current TEMPSPROD)
5. UPDATE TEMPSPROD costs via FctCalculTempsDeProduction  [PROD only]
6. Nba_Recalcul_Un_Produit_EnCours                       [PROD only]
7. Nba_Sp_Update_Production (next TEMPSPROD)              [if exists]
```

### W8: DET_DEFECT insert/update (via independent AJAX, NOT via CorrigeProduction)
- **Source:** `QteDefect.cfc:692-727`
- **Trigger:** Per-row save button in defect table (independent of OK submit button)
- **INSERT SQL:**
  ```sql
  INSERT INTO DET_DEFECT (TRANSAC, INVENTAIRE, MACHINE, EMPLOYE,
    DDQTEUNINV, DDDATE, RAISON, DDNOTE,
    DDVALEUR_ESTIME_UNITAIRE, DDVALEUR_ESTIME_TOTALE, TEMPSPROD, TRANSAC_PERE)
  VALUES (...)
  ```
- **UPDATE SQL:**
  ```sql
  UPDATE DET_DEFECT SET DDQTEUNINV=@qty, RAISON=@reason, DDNOTE=@note,
    DDDATE=@date, DDVALEUR_ESTIME_UNITAIRE=@unitval, DDVALEUR_ESTIME_TOTALE=@totalval
  WHERE DDSEQ = @DDSEQ
  ```

### W9: TEMPSPROD.TJQTEDEFECT re-sum (after each defect save)
- **Source:** `QteDefect.cfc:729-738`
- **SQL:**
  ```sql
  UPDATE TEMPSPROD SET TJQTEDEFECT = (SELECT SUM(DDQTEUNINV) FROM DET_DEFECT WHERE TEMPSPROD = @TJSEQ)
  WHERE TJSEQ = @TJSEQ
  ```
- **Timing:** Runs after every individual defect INSERT/UPDATE, keeping TEMPSPROD in sync

---

## Write ordering (complete)

```
[Independent AJAX — before OK button:]
A. Per defect row: INSERT/UPDATE DET_DEFECT → UPDATE TEMPSPROD.TJQTEDEFECT

[OK button submit — CorrigeProduction:]
1. Loop: Nba_Corrige_Quantite_Transaction (per changed EPF row)
2. UPDATE cNOMENCOP SET NOPQTESCRAP
3. Loop: Nba_Corrige_Quantite_Transaction (per changed SM row)
4. Nba_Sp_Update_Production (current TEMPSPROD)
5. UPDATE TEMPSPROD costs via FctCalculTempsDeProduction  [PROD only]
6. Nba_Recalcul_Un_Produit_EnCours                       [PROD only]
7. Nba_Sp_Update_Production (next TEMPSPROD)              [if exists]
```

## Idempotency / Transaction notes

- **No explicit transaction wrapper** — all writes are independent. A failure mid-flow leaves partial updates.
- The SOAP calls include a hardcoded `sleep(2000)` between each call.
- **No rollback mechanism** — errors are logged and accumulated in `ResultatTout` but do not stop execution.
- **Confidence:** Direct — no `<cftransaction>` tags observed in `CorrigeProduction`.
