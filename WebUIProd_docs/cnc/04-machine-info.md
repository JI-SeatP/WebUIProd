# MachineInfoPanel — CNC Behavior

> **Files:** `src/features/operation/components/MachineInfoPanel.tsx`
> **Depends on:** [01-overview](01-overview.md)
> **Used by:** [02-operation-details](02-operation-details.md)

## Summary

MachineInfoPanel displays group, product type, and notes. CNC has a unique behavior: TRNOTE is shown in a dedicated full-width row at the bottom instead of inline with other notes.

## CNC Detection (Lines 42-43)

```typescript
const isCnc = operation.FMCODE?.toUpperCase().includes("CNC") ||
              operation.FMCODE?.toUpperCase().includes("SAND");
```

## Notes Routing by FMCODE (Lines 46-51)

```typescript
const getNotes = (): string => {
  if (operation.FMCODE?.includes("PRESS")) return String(op.PRESSAGE_NOTE ?? "");
  if (operation.FMCODE?.includes("PACK"))  return String(op.EMBALLAGE_NOTE ?? "");
  if (isCnc) return "";   // CNC: TRNOTE shown as its own row below
  return String(op.PLACAGE_NOTE ?? op.TRNOTE ?? "");
};
```

- **PRESS:** Shows `PRESSAGE_NOTE` in the mold card (not here)
- **PACK:** Shows `EMBALLAGE_NOTE`
- **CNC:** Returns empty — TRNOTE is shown separately
- **Other:** Shows `PLACAGE_NOTE` or `TRNOTE`

## Layout

```
┌──────────────────────────────────────────────────┐
│ [Group]           [Product Type]                 │
│  operation.GROUPE   op.TYPEPRODUIT               │
├──────────────────────────────────────────────────┤
│ Note: {op.TRNOTE}                  ← CNC only   │
│ (full-width row, border-top)                     │
└──────────────────────────────────────────────────┘
```

## TRNOTE Row (Lines 78-81, CNC Only)

```typescript
{isCnc && !!op.TRNOTE && (
  <InfoRow label={t("production.note")} value={String(op.TRNOTE ?? "")} className="border-t pt-2" />
)}
```

This shows the transaction note in a dedicated row with a top border separator. Non-CNC operations show notes inline in the right section of the top row.
