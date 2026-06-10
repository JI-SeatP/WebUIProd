# Questionnaire Page — VCUT Layout

> **Files:** `src/features/questionnaire/QuestionnairePage.tsx`
> **Depends on:** [01-overview](01-overview.md)
> **Used by:** [04-pf-transaction](04-pf-transaction.md), [05-produced-items](05-produced-items.md), [06-sm-transaction](06-sm-transaction.md), [07-submit-flow](07-submit-flow.md)

## Summary

The Questionnaire page detects VCUT at line 274 and renders a stacked single-column layout instead of the standard side-by-side layout. Defects are hidden. Six VCUT-specific state variables track produced items, TEMPSPROD sequences, EPF sequences, and SM data.

## VCUT Detection (Line 274)

```typescript
const isVcut = operation.NO_INVENTAIRE === "VCUT" || fmcode === "TableSaw";
```

## VCUT-Specific State Variables (Lines 63-70)

```typescript
const [smnotrans, setSmnotrans] = useState("");                    // SM transaction number
const [smseq, setSmseq] = useState<number | null>(null);           // SM sequence
const [smMaterials, setSmMaterials] = useState<MaterialRow[]>([]);  // Material output rows
const [vcutProducedItems, setVcutProducedItems] = useState<ProducedItem[]>([]); // Added items
const [vcutListeTjseq, setVcutListeTjseq] = useState("");          // CSV of TEMPSPROD TJSEQ values
const [vcutListeEpfSeq, setVcutListeEpfSeq] = useState("");        // CSV of ENTRERPRODFINI PFSEQ values
```

## VCUT-Specific Behavior

- **Defects section hidden** (line 282): `const showDefects = !isVcut`
- **Layout is stacked single-column** (lines 321-381) instead of side-by-side

## Layout Structure (Lines 321-381)

```
┌────────────────────────────────────────────────────┐
│ OrderInfoBlock (label: STOP/COMP survey)            │
├────────────────────────────────────────────────────┤
│ Row 1: [EmployeeEntry] | [StopCauseSection if STOP]│
├────────────────────────────────────────────────────┤
│ Row 2: VcutQuantitySection (full width)             │
│   Per-component input table: qty/defect/container   │
│   See: 04-pf-transaction.md                         │
├────────────────────────────────────────────────────┤
│ Row 3: ProducedItemsTable (full width)              │
│   Read-only display of submitted items              │
│   See: 05-produced-items.md                         │
├────────────────────────────────────────────────────┤
│ Row 4: MaterialOutputSection (full width)           │
│   SM transaction materials                          │
│   See: 06-sm-transaction.md                         │
├────────────────────────────────────────────────────┤
│ Footer: [Cancel] [Confirm Quantities]               │
│   See: 07-submit-flow.md, 08-cancel-flow.md        │
└────────────────────────────────────────────────────┘
```

## Component Wiring

```typescript
// Row 2: VcutQuantitySection (line 352)
<VcutQuantitySection
  operation={operation}
  language={state.language}
  employeeSeq={employeeSeq}
  onItemAdded={async () => {
    // Refresh produced items from backend
    const res = await apiGet(`getVcutComponents.cfm?...`);
    setVcutProducedItems(res.data.producedItems);
    setVcutListeTjseq(res.data.listeTjseq);
    setVcutListeEpfSeq(res.data.listeEpfSeq);
    // Trigger SM recalc
    handleGoodQtyOk();
  }}
/>

// Row 3: ProducedItemsTable (line 374)
<ProducedItemsTable items={vcutProducedItems} language={state.language} />

// Row 4: MaterialOutputSection (line 377)
<MaterialOutputSection materials={smMaterials} smnotrans={smnotrans} />
```
