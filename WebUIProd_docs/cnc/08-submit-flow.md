# Final Submission Flow — CNC

> **Files:** `src/features/questionnaire/QuestionnairePage.tsx`, `src/features/questionnaire/hooks/useQuestionnaireSubmit.ts`, `server/api.cjs` (submitQuestionnaire route)
> **Depends on:** [06-questionnaire-layout](06-questionnaire-layout.md), [07-sm-transaction](07-sm-transaction.md), [10-database-tables](10-database-tables.md), [11-stored-procedures](11-stored-procedures.md)
> **Used by:** none (terminal step)

## Summary

CNC follows the non-VCUT submission path. The backend finds the PROD TEMPSPROD row, updates quantities, creates/posts SM, posts EPF transactions (querying unposted ENTRERPRODFINI from the database), sets TJPROD_TERMINE=1 on COMP, creates forklift transfer tasks if warehouses differ, closes the PROD row, and recalculates costs.

---

## Frontend: `handleSubmit()` (QuestionnairePage.tsx:154-246)

CNC does **not** do the VCUT fresh-data fetch (lines 186-198 are skipped). The payload is assembled directly:

```typescript
{
  transac, copmachine, type: "stop" | "comp",
  employeeCode, primaryCause, secondaryCause, notes,
  moldAction: showMoldAction ? moldAction : undefined,  // "keep" or "uninstall"
  goodQty,
  defects: savedDefects.map(...),
  finishedProducts: showFinishedProducts ? finishedProducts.map(...) : undefined,
  nopseq,
  // No isVcut, listeTjseq, listeEpfSeq, or smnotrans for CNC
}
```

## Frontend Validation (useQuestionnaireSubmit.ts:38-52)

- `employeeCode` is required
- `primaryCause` is required if type is `"stop"`
- Zero-qty confirmation dialog if both goodQty and total defect are 0

---

## Backend: `POST /submitQuestionnaire.cfm` (server/api.cjs:1593-2420)

### Step 1: Find PROD TEMPSPROD Row (Lines 1628-1664)

Same as all operations — queries `TEMPSPROD` where `MODEPROD_MPCODE = 'PROD'`.

### Step 2: Find STOP Row (Lines 1676-1698)

If STOP: finds `MODEPROD = 8` row for cause recording.

### Step 3: Update Employee + Causes (Lines 1699-1768)

Updates employee on both STOP and PROD rows. Records causes on STOP row.

### Step 4: Update Quantities (Lines 1776-1789)

```sql
UPDATE TEMPSPROD SET TJQTEPROD = @qteBonne, TJQTEDEFECT = @qteDefect,
  CNOMENCOP = @nopseq, INVENTAIRE_C = @inventaireC
WHERE TJSEQ = @tjseq
```

**CNC does NOT skip changeTEMPSPROD** (unlike VCUT which skips at line 1816).

### Step 5: TJPROD_TERMINE Pre-Check (Lines 1791-1811)

If remaining qty <= 0 → sets `TJPROD_TERMINE = 1`.

### Step 6: Create/Post SM (Lines 1920-2084)

See [07-sm-transaction](07-sm-transaction.md).

### Step 7: Post EPF/PF Transactions (Lines 2163-2209, Non-VCUT Path)

CNC uses the **non-VCUT EPF posting path**:

```sql
SELECT EPF.PFSEQ, EPF.PFNOTRANS, DT.DTRSEQ, DT.DTRQTE, T.TRSEQ AS EPF_TRSEQ
FROM ENTRERPRODFINI EPF
INNER JOIN TRANSAC T ON T.TRNO = EPF.PFNOTRANS
INNER JOIN DET_TRANS DT ON DT.TRANSAC = T.TRSEQ
WHERE EPF.PFSEQ IN (
  SELECT DISTINCT EPF2.PFSEQ FROM ENTRERPRODFINI EPF2
  INNER JOIN TRANSAC T2 ON T2.TRNO = EPF2.PFNOTRANS
  WHERE T2.TRANSAC_PERE = @transac
)
AND ISNULL(EPF.PFPOSTER, 0) = 0
```

For each unposted EPF:
1. Update `DET_TRANS` costs: `DTRCOUT_UNIT` + `DTRCOUT_TRANS` from `NOPValeurEstime_Unitaire`
2. Report via `Nba_ReporteUnTransac`

### Step 8: Forklift Transfer — InsertTacheCariste (Lines 2215-2331)

When the next operation uses a different warehouse:
1. Find next operation via `vEcransProduction`
2. Find forklift department: `DECODE = 'ForkLift'` or `'ForkLift WHA'`
3. Create transfer tasks:
   - With container: `Nba_Insert_Transfer_Entrepot_Contenant`
   - Without container: `Nba_Insert_Transfer_Entrepot_Sans_Contenant`
4. Update `TRANSFENTREP` with COPMACHINE, CNOMENCOP, DEPARTEMENT

### Step 9: Close PROD Row (Lines 2333-2367)

Calls `Nba_Sp_Update_Production` with `TJPROD_TERMINE = 1` for COMP, `0` for STOP.

### Step 10: Recalculate Costs (Lines 2369-2386)

`FctCalculTempsDeProduction` updates man-hours, employee/operation/machine costs.

### Step 11: Update Material Value (Lines 2388-2402)

`TJVALEUR_MATIERE = SUM(0 - TRCOUTTRANS)` from TRANSAC.

### Step 12: KPI Insert (Lines 2404-2419)

`Nba_SP_Kpi_Insert_Valeur_Operation_Reel` if no KPI record exists.

---

## Known Limitation: Mold Action Not Processed

The `moldAction` field is **accepted** in the request body (line 1611) but **no database action is taken**. The expected behavior (from old software) is to call the `AjouteChariot` SP when `moldAction = "uninstall"`, but this call is missing.
