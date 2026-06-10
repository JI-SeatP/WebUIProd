# CNC Overview & Identification

> **Files:** `OperationDetailsPage.tsx`, `QuestionnairePage.tsx`, `MachineInfoPanel.tsx`, `OrderInfoBlock.tsx`
> **Depends on:** none
> **Used by:** [02-operation-details](02-operation-details.md), [06-questionnaire-layout](06-questionnaire-layout.md)

## Summary

CNC operations represent machining and sanding steps. They are detected by checking `FMCODE` for "CNC" or "SAND". CNC shares some infrastructure with PRESS (materials card, mold action) but has unique features: operation steps, accessories, inline next-step card, and dedicated TRNOTE display.

## Detection Logic

```typescript
const isCnc = fmcode.toUpperCase().includes("CNC") || fmcode.toUpperCase().includes("SAND");
```

### Detection in Code

| Location | Line | Variable |
|----------|------|----------|
| `OperationDetailsPage.tsx` | 235 | `isCnc` |
| `QuestionnairePage.tsx` | 273 | `isCnc` |
| `MachineInfoPanel.tsx` | 42-43 | `isCnc` |
| `OrderInfoBlock.tsx` | 25 | `isCnc` |

## CNC vs PRESS vs VCUT Comparison

| Feature | CNC | PRESS | VCUT |
|---------|-----|-------|------|
| Detection | `FMCODE` has "CNC"/"SAND" | `FMCODE` has "PRESS" | `NO_INVENTAIRE`="VCUT" or `FMCODE`="TableSaw" |
| Layout | Standard 50/50 split | Standard 50/50 split | Full-width stacked |
| Left panel | PressInfoSection (no mold) + next-step inline + MachineInfoPanel + PanelDetails + CncInfoSection | PressInfoSection (with mold) + next-step row + PanelDetails + PanelLayers | VcutInfoSection (components + containers) |
| Right panel | DrawingViewer / StepDetailsViewer | DrawingViewer | Hidden |
| Qty label | "Qty Machined" | "Qty Pressed" | "Qty Used" |
| Qty boxes | 4 (To Make / Produced / Defect / Remaining) | 4 (same) | 3 (To Make / Used / Remaining) |
| Defects | Shown (filtered by FMCODE for CNC scrap types) | Shown (filtered for PRESS scrap types) | Hidden |
| Mold action | Keep/Uninstall on COMP | Keep/Uninstall on COMP | N/A |
| Operation steps | CncInfoSection (100+i numbered, with media) | None | None |
| Accessories | T-nuts via `AUTOFAB_FctSelectVarCompo` | None | None |
| MachineInfoPanel | Group + Product Type + TRNOTE row | Group + Product Type + PRESSAGE_NOTE | Hidden |
| EPF posting on submit | Non-VCUT path (query unposted EPFs) | Same | VCUT path (iterate listeEpfSeq) |
| TJPROD_TERMINE | Set to 1 on COMP | Set to 1 on COMP | NOT set |
| Scrap codes | `SCRAP-CNC%` + `Usinage%` | `SCRAP-PRS%` + `Presse%` | N/A |
