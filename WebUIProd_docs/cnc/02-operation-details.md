# Operation Details Page — CNC Layout

> **Files:** `src/features/operation/OperationDetailsPage.tsx`
> **Depends on:** [01-overview](01-overview.md)
> **Used by:** [05-steps-and-drawings](05-steps-and-drawings.md)

## Summary

The OperationDetailsPage uses a standard 50/50 split for CNC. The left panel stacks: PressInfoSection (materials, no mold), an inline next-step card (CNC-only), MachineInfoPanel, PanelDetailsTable (if panel exists), and CncInfoSection (steps + accessories). The right panel shows either DrawingViewer or StepDetailsViewer.

## Left Panel Layout (Lines 254-395)

```
┌──────────────────────────────── Left 50% ────────────────────────────────┐
│ Row 1 (flex row, lines 257-315):                                         │
│   [PressInfoSection]  [Next Step inline card]  [MachineInfoPanel]        │
│    (no mold for CNC)    (CNC only)                                       │
├──────────────────────────────────────────────────────────────────────────┤
│ Row 2 (lines 375-388):                                                   │
│   [PanelDetailsTable]  ← if panel data exists                           │
│   [CncInfoSection]     ← steps table (left) + accessories table (right) │
│     hideNextStep=true (already shown in Row 1)                           │
└──────────────────────────────────────────────────────────────────────────┘
```

### Row 1: Materials + Next Step + Machine Info

**PressInfoSection** (line 260): Shown for both PRESS and CNC (`isPress || isCnc`). For CNC, `showMoldInfo={isPress}` means the mold card is hidden — only the materials section shows.

**Next Step Inline Card** (lines 265-308, CNC only): Shows:
- Panel warning: "USE LOCALLY PRESSED PANEL #{PV_PANEAU}" or "USE OUTSOURCED PANEL #{PV_PANEAU}" if `PV_PANEAU` exists
- Next operation: machine description + department from `NEXT_MACHINE_P/S`, `NEXT_DEPT_P/S`

**MachineInfoPanel** (lines 310-314): Shown for all non-VCUT operations. See [04-machine-info](04-machine-info.md).

### Row 2: Panel Details + CNC Info

**PanelDetailsTable** (line 377): Shown if `panelDetail` exists — single-row table with ITEM, PANNEAU, DESCRIPTION, VERSION, TYPE, THICKNESS, WEIGHT.

**CncInfoSection** (lines 379-386):
```typescript
<CncInfoSection
  operation={operation}
  language={state.language}
  hideNextStep           // Next step already shown in Row 1
  onViewStepDetails={handleViewStepDetails}
  activeStepSeq={activeStep?.METSEQ ?? null}
/>
```

See [05-steps-and-drawings](05-steps-and-drawings.md) for details.

## Right Panel (Lines 397-409)

Shown for CNC (hidden only for VCUT):

```typescript
{!isVcut && (
  <div className={W_DRAWING_PANEL.container}>
    {activeStep ? (
      <StepDetailsViewer step={activeStep} stepNumber={activeStepNumber}
        language={state.language} onClose={() => setActiveStep(null)} />
    ) : (
      <DrawingViewer images={drawingUrls} />
    )}
  </div>
)}
```

- **Default:** DrawingViewer shows product drawings (from `getDrawings.cfm`)
- **When step selected:** StepDetailsViewer replaces DrawingViewer with step media (RTF/PDF/video/images)

## Data Fetching

| Data | Endpoint | Trigger |
|------|----------|---------|
| Operation data | `getOperation.cfm?transac=X&copmachine=Y` | On mount via `useOperation()` |
| Panel data | `getPanelData.cfm?transac=X&panelNiSeq=Y` | When operation has `Panel_NiSeq` |
| Drawings | `getDrawings.cfm?produitSeq=X&inventaireSeq=Y&kitSeq=Z` | On mount |
| Steps & accessories | Embedded in operation data (`steps[]`) + `getOperationAccessories.cfm` | Via `useOperationAccessories()` in CncInfoSection |
