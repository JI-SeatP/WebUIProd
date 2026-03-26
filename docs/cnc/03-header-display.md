# OperationHeader — CNC Display

> **Files:** `src/features/operation/components/OperationHeader.tsx`
> **Depends on:** [01-overview](01-overview.md)
> **Used by:** none

## Summary

The OperationHeader shows order info, quantities, status badge, and a machine switcher. For CNC, it displays "Qty Machined" as the quantity label, shows the product prominently (similar to PRESS), and uses the standard 4-box quantity layout.

## Quantity Label (Lines 116-122)

```typescript
const qtyLabel = isVcut
  ? t("vcut.qtyUsed")
  : operation.FMCODE?.includes("PRESS")
  ? t("order.qtyPressed")
  : operation.FMCODE?.includes("CNC")
  ? t("order.qtyMachined")    // ← "Qty Machined" / "Qté machinée"
  : t("order.qtyProduced");
```

## Quantity Boxes (Lines 225-250)

CNC uses the standard 4-box layout (same as PRESS, differs from VCUT's 3-box):

| Box | Label | Value | Background |
|-----|-------|-------|------------|
| 1 | Qty To Make | `pressQtyDisplay(...)` | `#F2F2F2` |
| 2 | Qty Machined | `QTE_PRODUITE` | `#F2F2F2`, green text |
| 3 | Qty Defect | `NOPQTESCRAP` | `#F2F2F2`, red text |
| 4 | Remaining | `computeQteRestante(operation)` | `#FFF88E` (yellow) |

## Product Display (Lines 148-195)

CNC does **not** hide the client field (unlike VCUT which hides it at line 150). CNC shows:
- Client name + PO number
- Product code + revision + description

## Machine Switcher

The header includes a machine dropdown (shared across all operation types) that calls `changeMachine.cfm` to update the current machine assignment.
