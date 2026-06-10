# Questionnaire Page — CNC Layout

> **Files:** `src/features/questionnaire/QuestionnairePage.tsx`, `src/features/questionnaire/components/MoldActionSection.tsx`, `src/features/questionnaire/components/DefectQuantitySection.tsx`
> **Depends on:** [01-overview](01-overview.md)
> **Used by:** [07-sm-transaction](07-sm-transaction.md), [08-submit-flow](08-submit-flow.md)

## Summary

CNC uses the standard side-by-side questionnaire layout (not the VCUT stacked layout). Key CNC features: MoldActionSection (keep/uninstall) shown on COMP, defects are visible (with FMCODE-filtered scrap types), and GoodQuantitySection or FinishedProductsSection is shown depending on ENTREPOT.

## CNC Detection (Lines 271-282)

```typescript
const fmcode = operation.FMCODE ?? "";
const isCnc = fmcode.toUpperCase().includes("CNC") || fmcode.toUpperCase().includes("SAND");
const isVcut = operation.NO_INVENTAIRE === "VCUT" || fmcode === "TableSaw";
const showMoldAction = isComp && (isPress || isCnc);   // Line 277
const showFinishedProducts = operation.ENTREPOT > 0;     // Line 280
const showDefects = !isVcut;                              // Line 282 — CNC shows defects
```

## Layout Structure (Lines 383-443, Non-VCUT Path)

```
┌────────────────────────────────────────────────────────────────┐
│ MoldActionSection (keep/uninstall)  ← COMP only, line 317     │
├────────────────────────────────────────────────────────────────┤
│ Row 1 (flex, lines 386-418):                                   │
│   [EmployeeEntry]  |  [GoodQtySection OR FinishedProducts]  | │
│                    |  [DefectQuantitySection]                   │
├────────────────────────────────────────────────────────────────┤
│ Row 2 (flex, lines 420-442):                                   │
│   [StopCauseSection]  |  [MaterialOutputSection]               │
│    (if STOP, flex-1)  |   (flex-2)                             │
├────────────────────────────────────────────────────────────────┤
│ Footer: [Cancel] [Confirm Quantities]                          │
└────────────────────────────────────────────────────────────────┘
```

## MoldActionSection

**File:** `src/features/questionnaire/components/MoldActionSection.tsx:19-65`

**Shown when:** `isComp && (isPress || isCnc)` (line 277)

**Props:** `{ value: string, onChange: (value: string) => void, theme?: "modern" | "minimal" | "dense" }`

**Options:**
| Value | Label (en) | Label (fr) |
|-------|-----------|-----------|
| `"keep"` | Keep the mold | Conserver le moule |
| `"uninstall"` | Uninstall mold | Desinstaller le moule |

**Default:** `"keep"` (set in QuestionnairePage.tsx:54)

**Known limitation:** `moldAction` is sent to the backend but **not processed in the database** — the `AjouteChariot` SP call is missing. See [08-submit-flow](08-submit-flow.md).

## Defect Types (FMCODE Filtering)

**File:** `src/features/questionnaire/components/DefectQuantitySection.tsx`

The component passes `fmcode` to `getDefectTypes.cfm`:
```typescript
apiGet<DefectType[]>(`getDefectTypes.cfm?fmcode=${encodeURIComponent(fmcode)}`)
```

**Backend scrap code filtering** (`server/api.cjs:895-924`):

| FMCODE | Scrap Codes Included |
|--------|---------------------|
| CNC | `RRCODE LIKE 'SCRAP-CNC%'` + `RRDESC_P LIKE 'Usinage%'` |
| SAND | `RRCODE LIKE 'SCRAP-SND%'` |
| PRESS | `RRCODE LIKE 'SCRAP-PRS%'` + `RRDESC_P LIKE 'Presse%'` |
| PACK | `RRCODE LIKE 'SCRAP-PKG%'` + `RRDESC_P LIKE 'Emballage%'` |

All families also include: `RRDESC_S LIKE 'Raw-Material%'` and `RRDESC_S LIKE 'Visual%'`.

## Good Quantity vs Finished Products

- If `operation.ENTREPOT > 0` (line 280): shows **FinishedProductsSection** (product + qty + container rows)
- Otherwise: shows **GoodQuantitySection** (single qty input with NumPad + OK button)

The OK button triggers `handleGoodQtyOk()` → SM recalculation. See [07-sm-transaction](07-sm-transaction.md).
