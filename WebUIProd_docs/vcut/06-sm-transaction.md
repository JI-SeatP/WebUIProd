# SM (Sortie de Materiel) Transaction Flow

> **Files:** `src/features/questionnaire/QuestionnairePage.tsx`, `src/features/questionnaire/components/MaterialOutputSection.tsx`, `server/api.cjs` (ajouteSM + submitQuestionnaire SM section)
> **Depends on:** [03-questionnaire-layout](03-questionnaire-layout.md), [09-database-tables](09-database-tables.md), [10-stored-procedures](10-stored-procedures.md)
> **Used by:** [07-submit-flow](07-submit-flow.md)

## Summary

SM (Sortie de Materiel / Material Output) tracks raw material consumption based on BOM ratios. For VCUT, the SM is shared across all components and recalculated after each component addition. The SM is created via `ajouteSM.cfm` during write-as-you-go, then posted during final submission.

## Frontend Trigger: `handleGoodQtyOk()`

**File:** `QuestionnairePage.tsx:90-117`

```typescript
async function handleGoodQtyOk() {
  const res = await apiPost("ajouteSM.cfm", {
    transac, copmachine, nopseq,
    qteBonne: Number(goodQty) || 0,
    smnotrans,                          // existing SM (empty on first call)
    ...(vcutOp ? { isVcut: true, listeTjseq: vcutListeTjseq } : {}),
  });
  // Response: { smnotrans, smseq, materials: MaterialRow[] }
  setSmnotrans(res.data.smnotrans);
  setSmseq(res.data.smseq);
  setSmMaterials(res.data.materials);
}
```

## SM Recalculation Triggers (4 Scenarios)

| # | Trigger | Location | How |
|---|---------|----------|-----|
| 1 | Good qty OK button | `handleGoodQtyOk()` (line 90) | Direct call |
| 2 | Defect added | `handleAddDefect()` (line 137) | Calls `handleGoodQtyOk()` after defect save |
| 3 | Defect removed | `handleRemoveDefect()` (line 150) | Calls `handleGoodQtyOk()` after defect delete |
| 4 | VCUT item added | `onItemAdded()` (line 369) | Calls `handleGoodQtyOk()` after item refresh |

## Backend: `POST /ajouteSM.cfm`

**Input:**
```typescript
{
  transac: number, copmachine: number, nopseq: number,
  qteBonne: number,       // Good quantity
  smnotrans: string,      // Existing SM number (empty if first call)
  isVcut?: boolean,       // VCUT flag
  listeTjseq?: string,    // CSV of TEMPSPROD sequences (VCUT batch)
}
```

**Output:**
```typescript
{ smnotrans: string, smseq: number, materials: MaterialRow[] }
```

## Backend SM Flow in `submitQuestionnaire.cfm` (Lines 1920-2084)

### Step 1: Check If SM Should Be Created (Line 1926)

Condition: `totalQte > 0 || frontendIsVcut`

### Step 2: Get Supporting Data (Lines 1929-1948)

- `TRANSAC` + `COMMANDE` → `TRITEM`, `CONOTRANS`
- `VOperationParTransac` → `NISTR_NIVEAU`, `UtiliseInventaire`
- Only proceed if `UtiliseInventaire === 1`

### Step 3: Check If SM Already Exists (Lines 1953-1964)

- **VCUT:** Checks ALL TEMPSPROD rows for this TRANSAC (SM shared across batch)
- **Non-VCUT:** Checks only the current TJSEQ

### Step 4: Compute SM Quantities

- **Non-VCUT:** `smTotalQte = qteBonne + qteDefect`
- **VCUT:** `smTotalQte = MAX(TJQTEPROD) + MAX(TJQTEDEFECT)` from batch TJSEQ (SortieMateriel.cfc:1706-1718)

### Step 5: Create SM If Needed (Lines 1968-1988)

Calls **`Nba_Sp_Insert_Sortie_Materiel`** with `SMQTEPRODUIT = smTotalQte`.

**Output:** `NEWSMNOTRANS` (CHAR 9)

### Step 6: Create SM Detail Lines (Lines 1990-2057)

1. Call **`Nba_Sp_Sortie_Materiel`** → creates initial `DET_TRANS` records
   - **VCUT overrides** (ConstruitDonneesLocales:922-924): `OPERATION=1`, `NISTR_NIVEAU="00101"`
   - **Non-VCUT:** Uses operation's actual `OPERATION` and `NISTR_NIVEAU` from `VOperationParTransac`
2. Recalculate DET_TRANS quantities:
   - **VCUT:** Weighted sum: `SUM((TJQTEPROD + TJQTEDEFECT) * component_NIQTE_ratio)` across batch TJSEQ (same formula as ajouteSM VCUT path)
   - **Non-VCUT:** Simple: `nouvelleQte = ABS(smTotalQte * NIQTE)`
   - Update via **`Nba_Insert_Det_Trans_Avec_Contenant`**

### Step 6: Link SM to TEMPSPROD (Lines 2006-2010)

```sql
UPDATE TEMPSPROD SET SMNOTRANS = @smnotrans
WHERE TJSEQ = @tjseq AND MODEPROD_MPCODE = 'Prod'
```

### Step 8: Post SM Transaction

Calls **`EXECUTE_TRANSACTION SM/REPORT`** via AutoFab SOAP API (old software: `ReportSortieMateriel`, QuestionnaireSortie.cfc:1767-1779).

**Parameters** (semicolon-delimited):
```
{SMSEQ};{LaDateClarion};{LaHeureClarion};'WebUI New';'';'';'';'''';'''';'';'';'';''
```

- `SMSEQ`: From `SORTIEMATERIEL` table (NOT `TRANSAC.TRSEQ`)
- `LaDateClarion`: `DATEDIFF(DAY, '1800-12-28', GETDATE())`
- `LaHeureClarion`: `DATEDIFF(SECOND, midnight, GETDATE()) * 100`

## MaterialOutputSection Component

**File:** `src/features/questionnaire/components/MaterialOutputSection.tsx:36-94`

**Props:** `{ materials: MaterialRow[], smnotrans?: string }`

**Display:**
- Header bar: "SORTIE DE MATERIEL" + SM transaction number badge
- Table (6 columns):

| Column | Field | Notes |
|--------|-------|-------|
| Raw Material | `code` | |
| Description | `description_P/S` | Language-aware |
| Qty | `originalQty.toFixed(2)` | Bold, right-aligned |
| Unit | `unit_P/S` | Language-aware |
| Warehouse | `warehouse_P/S` | Language-aware |
| SKID | `container` | |
