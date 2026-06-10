# Final Submission Flow

> **Files:** `src/features/questionnaire/QuestionnairePage.tsx`, `src/features/questionnaire/hooks/useQuestionnaireSubmit.ts`, `server/api.cjs` (submitQuestionnaire route)
> **Depends on:** [03-questionnaire-layout](03-questionnaire-layout.md), [04-pf-transaction](04-pf-transaction.md), [06-sm-transaction](06-sm-transaction.md), [09-database-tables](09-database-tables.md), [10-stored-procedures](10-stored-procedures.md)
> **Used by:** none (terminal step)

## Summary

When the user clicks "Confirm Quantities", the frontend fetches fresh VCUT data, assembles the payload with `listeTjseq` + `listeEpfSeq` + `smnotrans`, and sends it to `POST /submitQuestionnaire.cfm`. The backend runs 11 sequential steps: find PROD row, update quantities, create/post SM, post all EPF transactions, close the production entry, and recalculate costs.

---

## Frontend: `handleSubmit()` (QuestionnairePage.tsx:154-246)

### Step 1: VCUT Fresh Data Fetch (Lines 186-198)

```typescript
if (vcutOp) {
  const freshRes = await apiGet(
    `getVcutComponents.cfm?transac=${transac}&nopseq=${nopseq}&copmachine=${copmachine}`
  );
  effectiveGoodQty = String(freshRes.data.producedItems.reduce((sum, item) => sum + item.qty, 0));
  submitListeTjseq = freshRes.data.listeTjseq;
  submitListeEpfSeq = freshRes.data.listeEpfSeq;
  if (freshRes.data.smnotrans) submitSmnotrans = freshRes.data.smnotrans;
}
```

This ensures the latest data is used even if local state is stale.

### Step 2: Payload Assembly (Lines 199-222)

```typescript
{
  transac, copmachine, type: "stop" | "comp",
  employeeCode, primaryCause, secondaryCause, notes,
  goodQty: effectiveGoodQty,    // sum of all produced items
  isVcut: true,
  listeTjseq: "123,124,125",   // CSV of TEMPSPROD TJSEQ values
  listeEpfSeq: "456,457,458",  // CSV of ENTRERPRODFINI PFSEQ values
  smnotrans: "SM-000123",
  defects: [],                  // empty for VCUT
  nopseq,
}
```

## Frontend: `useQuestionnaireSubmit()` (useQuestionnaireSubmit.ts)

**Validation (lines 38-52):**
- `employeeCode` is required
- `primaryCause` is required if type is `"stop"`

**Zero-qty confirmation (lines 80-97):** If both goodQty and total defect are 0, shows a confirmation dialog.

**Submit (lines 54-73):** Calls `apiPost("submitQuestionnaire.cfm", payload)`. On success → navigates back.

---

## Backend: `POST /submitQuestionnaire.cfm` (server/api.cjs:1593-2420)

Mirrors old ColdFusion `QuestionnaireSortie.cfc -> ModifieTEMPSPROD`.

### Step 1: Find PROD TEMPSPROD Row (Lines 1628-1664)

```sql
SELECT TOP 1 TP.TJSEQ, TP.CNOMENCOP, TP.SMNOTRANS,
       TP.ENTRERPRODFINI_PFNOTRANS, TP.CNOMENCLATURE, ...
FROM TEMPSPROD TP
INNER JOIN cNOMENCOP CNOP ON CNOP.NOPSEQ = TP.CNOMENCOP
WHERE TP.TRANSAC = @transac
  AND TP.MODEPROD_MPCODE = 'PROD'
  AND TP.TJNOTE LIKE 'Ecran de production pour Temps prod%'
  AND TP.cNOMENCOP_MACHINE = @copmachine
ORDER BY TP.TJSEQ DESC
```

### Step 2: Find STOP Row (Lines 1676-1698, if STOP)

Finds the STOP row (`MODEPROD = 8`) to save causes and employee.

### Step 3: Update Employee + Causes (Lines 1699-1768)

- Reset `TJPROD_TERMINE = 0` on PROD row
- Update employee on both STOP and PROD rows
- Record primary/secondary cause on STOP row

### Step 4: Update Quantities on PROD Row (Lines 1776-1789)

```sql
UPDATE TEMPSPROD SET TJQTEPROD = @qteBonne, TJQTEDEFECT = @qteDefect,
  CNOMENCOP = @nopseq, INVENTAIRE_C = @inventaireC
WHERE TJSEQ = @tjseq
```

**VCUT exception:** Steps 4 and 5 are **entirely skipped** for VCUT (old software QuestionnaireSortie.cfc:708 — gated by `PRODUIT_CODE NEQ "VCUT"`). Each component has its own TEMPSPROD row with quantities already set by `addVcutQty`.

### Step 5: TJPROD_TERMINE Pre-Check (Lines 1791-1811)

If remaining qty <= 0 → sets `TJPROD_TERMINE = 1`.

**VCUT exception:** Skipped (same guard as Step 4).

### Step 6: Create/Post SM (Lines 1920-2084)

Full details in [06-sm-transaction.md](06-sm-transaction.md).

### Step 7: Post EPF/PF Transactions (Lines 2086-2213)

**For VCUT (lines 2094-2162):**

```
for each PFSEQ in listeEpfSeq:
  1. Get TJSEQ at same index from listeTjseq
  2. Query TEMPSPROD for component NOPSEQ
  3. Query DET_TRANS + ENTRERPRODFINI for EPF details
  4. Update DET_TRANS costs:
     DTRCOUT_UNIT = FctNbaRound(@valUnit, 'PANB_DECIMAL_PRIX')
     DTRCOUT_TRANS = FctNbaRound(@valUnit * DTRQTE, 'PANB_DECIMAL_PRIX')
  5. Report EPF via EXECUTE_TRANSACTION EPF/REPORT (AutoFab SOAP)
     Params: {PFSEQ};{LaDateClarion};{LaHeureClarion};'WebUI New';...empty...
  6. DO NOT set TJPROD_TERMINE (old software line 918)
```

**For non-VCUT (lines 2163-2209):**
- Queries unposted `ENTRERPRODFINI` (`PFPOSTER = 0`)
- Same cost update + report via `EXECUTE_TRANSACTION EPF/REPORT`
- **Does** set `TJPROD_TERMINE = 1`

**Important:** Both SM and EPF posting use the AutoFab SOAP API (`EXECUTE_TRANSACTION` with operation `REPORT`), NOT the `Nba_ReporteUnTransac` stored procedure. The SM call uses `SMSEQ` (from SORTIEMATERIEL), and the EPF call uses `PFSEQ` (from ENTRERPRODFINI).

**Key VCUT difference:** Iterates over the explicit `listeEpfSeq` list, matching each EPF to its TEMPSPROD via the parallel `listeTjseq` list. Non-VCUT queries the database for unposted EPFs.

### Step 8: Close PROD Row (Lines 2333-2367)

Calls **`Nba_Sp_Update_Production`** with:
- `TJSEQ`, employee, operation, machine, TRANSAC
- `TJPROD_TERMINE = 1` for COMP, `0` for STOP
- `SMNOTRANS` (newly created or existing)
- Start/end dates

### Step 9: Recalculate Costs (Lines 2369-2386)

```sql
UPDATE TEMPSPROD SET
  TJSYSTEMPSHOMME = C.CALCSYSTEMPSHOMME, TJTEMPSHOMME = C.CALCTEMPSHOMME,
  TJEMCOUT = C.CALCEMCOUT, TJOPCOUT = C.CALCOPCOUT, TJMACOUT = C.CALCMACOUT
FROM TEMPSPROD
  INNER JOIN dbo.FctCalculTempsDeProduction(@tjseq) C ON C.TJSEQ = @tjseq
WHERE TEMPSPROD.TJSEQ = @tjseq
```

### Step 10: Update Material Value (Lines 2388-2402)

```sql
UPDATE TEMPSPROD SET
  TJVALEUR_MATIERE = ISNULL((SELECT SUM(0 - TRCOUTTRANS) FROM TRANSAC WHERE TRSEQ = @transac), 0)
WHERE TJSEQ = @tjseq
```

### Step 11: KPI Insert (Lines 2404-2419)

Calls **`Nba_SP_Kpi_Insert_Valeur_Operation_Reel`** if no KPI record exists for this NOPSEQ.
