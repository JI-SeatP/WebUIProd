# ProducedItemsTable — Display + onItemAdded Callback

> **Files:** `src/features/questionnaire/components/ProducedItemsTable.tsx`, `src/features/questionnaire/QuestionnairePage.tsx`
> **Depends on:** [04-pf-transaction](04-pf-transaction.md)
> **Used by:** [07-submit-flow](07-submit-flow.md)

## Summary

ProducedItemsTable is a read-only display of items already submitted via `addVcutQty.cfm`. It shows quantity, container, product code, and EPF transaction number, with a total row at the bottom. Data flows in via the `onItemAdded()` callback chain.

## Props

```typescript
interface ProducedItemsTableProps {
  items: ProducedItem[];   // Array from QuestionnairePage.vcutProducedItems
  language: "fr" | "en";
}
```

## Table Columns

| Column | Field | Width | Notes |
|--------|-------|-------|-------|
| Qty Produced | `item.qty` | 10% | |
| Container | `item.container` | 15% | |
| Product Code | `desc_P/desc_S (code)` | auto | Language-aware |
| Finished Product | `item.epfTrno` | 12% | EPF transaction number |

**Total row** (line 21): `items.reduce((sum, p) => sum + p.qty, 0)`

When empty, shows a single row with total = 0.

## `onItemAdded()` Callback Chain

**File:** `QuestionnairePage.tsx:356-370`

When VcutQuantitySection calls `onItemAdded()` after a successful "+" click, the parent:

```
1. GET /getVcutComponents.cfm?transac=X&nopseq=Y&copmachine=Z
   ↓
2. setVcutProducedItems(res.data.producedItems)   → updates table
   setVcutListeTjseq(res.data.listeTjseq)         → updates TJSEQ CSV
   setVcutListeEpfSeq(res.data.listeEpfSeq)       → updates EPF CSV
   ↓
3. handleGoodQtyOk()  → POST /ajouteSM.cfm        → recalculates SM
   ↓
4. setSmnotrans / setSmMaterials                   → updates MaterialOutputSection
```

This chain ensures all three sections (ProducedItemsTable, MaterialOutputSection, and the CSV lists for submit) stay in sync after each component addition.
