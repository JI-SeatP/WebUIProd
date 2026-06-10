# Cancel & Correction Flow

> **Files:** `src/features/questionnaire/QuestionnairePage.tsx`, `queries/getCorrection.cfm`, `queries/submitCorrection.cfm`
> **Depends on:** [06-questionnaire-layout](06-questionnaire-layout.md), [10-database-tables](10-database-tables.md)
> **Used by:** none

## Summary

Cancel sends SM cleanup data to `cancelQuestionnaire.cfm` and navigates back. Corrections allow modifying finished product quantities, defect records, and material output after submission — using `Nba_Corrige_Quantite_Transaction` SP.

---

## Cancel Flow

**File:** `QuestionnairePage.tsx:248-257`

```typescript
const handleCancel = useCallback(async () => {
  await apiPost("cancelQuestionnaire.cfm", {
    transac: Number(transac),
    nopseq,
    smnotrans,
    smseq,
  });
  navigate(`/orders/${transac}/operation/${copmachine}`);
}, [...]);
```

Undoes write-as-you-go changes (SM creation, defect records) then navigates back.

---

## Correction Flow

### `GET /getCorrection.cfm`

**Purpose:** Load the current state of a submitted production entry for correction.

**Returns:**
- **Operation state:** TEMPSPROD row (TJQTEPROD, TJQTEDEFECT, employee, machine, dates)
- **ENTREPF flag:** `CASE WHEN ENTRERPRODFINI_PFNOTRANS IS NOT NULL THEN 1 ELSE 0 END`
  - Determines if operation has finished product tracking
- **Defects:** DET_DEFECT records with RAISON (type), quantity, cost
- **Finished products:** DET_TRANS via ENTRERPRODFINI_PFNOTRANS:
  ```
  { id, product, container, description_P, description_S, warehouse, originalQty, correctedQty }
  ```
- **Materials:** DET_TRANS via SMNOTRANS:
  ```
  { id, code, description_P, description_S, originalQty, correctedQty, unit, warehouse, container }
  ```

### `POST /submitCorrection.cfm`

**Step 3a: Correct Finished Product Quantities**

For each finished product:
```typescript
await pool.request()
  .input("DTRSEQ", sql.Int, fp.dtrseq)
  .input("DTRQTE_CORRECTION", sql.Float, fp.qty)
  .input("USAGER", sql.VarChar(50), "WebUI Correction")
  .execute("Nba_Corrige_Quantite_Transaction");
```

**Step 3b: Insert/Update Defects**

Updates `DET_DEFECT` records with:
- `DDQTEUNINV` (quantity in inventory unit)
- `RAISON` (defect type from RAISON table)
- Cost valuation from operation's estimated unit value

**Step 3c: Recalculate Total Defects**

Updates `TEMPSPROD.TJQTEDEFECT` = SUM of all DET_DEFECT quantities.

**Step 3d: Update cNOMENCOP Scrap**

Updates `NOPQTESCRAP` on the operation record.

**Step 3e: Correct Material Output**

For each SM material line:
```typescript
await pool.request()
  .input("DTRSEQ", sql.Int, mat.dtrseq)
  .input("DTRQTE_CORRECTION", sql.Float, mat.qty)
  .input("USAGER", sql.VarChar(50), "WebUI Correction")
  .execute("Nba_Corrige_Quantite_Transaction");
```

**Final:** Calls `Nba_Recalcul_Un_Produit_EnCours` to recalculate product-in-progress costs.
