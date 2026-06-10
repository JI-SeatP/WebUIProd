# VCUT Overview & Identification

> **Files:** `OperationDetailsPage.tsx`, `QuestionnairePage.tsx`
> **Depends on:** none
> **Used by:** [02-operation-details](02-operation-details.md), [03-questionnaire-layout](03-questionnaire-layout.md)

## Summary

A VCUT operation represents a table-saw / veneer cutting step. A work order (TRANSAC) has a BOM with multiple components (child products cut from a parent "big sheet"). Each component gets its own finished product (EPF) transaction when produced.

## Detection Logic

A VCUT operation is identified when **any** of three conditions is true:

| # | Field | Value | Source |
|---|-------|-------|--------|
| 1 | `NO_INVENTAIRE` | `"VCUT"` | Operation data from `getOperation.cfm` |
| 2 | `PRODUIT_CODE` | `"VCUT"` | Operation data from `getOperation.cfm` |
| 3 | `FMCODE` | `"TableSaw"` | Machine family code |

### Detection in Code

```
OperationDetailsPage.tsx:36  →  isVcutCheck (for data fetching)
OperationDetailsPage.tsx:236 →  isVcut (for layout rendering)
QuestionnairePage.tsx:274    →  isVcut (for questionnaire layout)
```

```typescript
// OperationDetailsPage.tsx:36
const isVcutCheck = operation?.NO_INVENTAIRE === "VCUT"
  || operation?.PRODUIT_CODE === "VCUT"
  || (operation?.FMCODE ?? "") === "TableSaw";

// QuestionnairePage.tsx:274
const isVcut = operation.NO_INVENTAIRE === "VCUT" || fmcode === "TableSaw";
```

## How VCUT Differs from Standard Operations

| Aspect | VCUT | Standard |
|--------|------|----------|
| BOM components | Multiple child products per work order | Single product |
| Quantity entry | Per-component rows with "+" button | Single good qty input |
| EPF transactions | One per component (created on "+" click) | One per operation |
| TEMPSPROD rows | One per component (if NOPSEQ differs) | One per operation |
| SM calculation | Batch across all components (`listeTjseq`) | Single TJSEQ |
| Defects | Hidden (no defect section) | Visible |
| Layout | Stacked single-column | Side-by-side |
| TJPROD_TERMINE | NOT set on submit (old software line 918) | Set to 1 on COMP |
| Header display | Big Sheet qty + VCUT descriptions | Product code + client |
