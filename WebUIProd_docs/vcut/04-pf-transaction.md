# PF (Produit Fini) Transaction — VcutQuantitySection + addVcutQty.cfm

> **Files:** `src/features/questionnaire/components/VcutQuantitySection.tsx`, `server/api.cjs` (addVcutQty route)
> **Depends on:** [03-questionnaire-layout](03-questionnaire-layout.md), [09-database-tables](09-database-tables.md)
> **Used by:** [05-produced-items](05-produced-items.md), [07-submit-flow](07-submit-flow.md)

## Summary

VcutQuantitySection renders a per-component input table. When the user clicks "+", it calls `POST /addVcutQty.cfm` which creates an EPF (finished product) transaction replicating the old software's `ProduitFini.cfc -> AjouteEPF`. Each component gets its own TEMPSPROD row and EPF transaction.

## Props

```typescript
interface VcutQuantitySectionProps {
  operation: OperationData;
  language: "fr" | "en";
  onItemAdded: () => void;   // Callback: refresh produced items + trigger SM recalc
  employeeSeq?: number;
}
```

## Internal State (Lines 63-72)

```typescript
const [components, setComponents] = useState<VcutComponent[]>([]);       // BOM components
const [containers, setContainers] = useState<VcutContainer[]>([]);       // Available containers
const [qtyInputs, setQtyInputs] = useState<Record<number, string>>({});  // Per-component good qty (keyed by nopseq)
const [defectInputs, setDefectInputs] = useState<Record<number, string>>({});
const [containerInputs, setContainerInputs] = useState<Record<number, string>>({});
const [activeNumpad, setActiveNumpad] = useState<string | null>(null);
```

## `fetchComponents()` — Lines 79-106

**API:** `GET /getVcutComponents.cfm?transac={transac}&nopseq={nopseq}`

**Response:**
```typescript
{ components: VcutComponent[], containers: VcutContainer[], producedItems: ProducedItem[] }
```

**Pre-fill logic (lines 91-99):** For each component where the user hasn't modified the input, sets `qtyInputs[comp.nopseq] = comp.defaultQty` (remaining quantity).

## `handleRowAdd(comp)` — Lines 113-154

**Validation:** Skips if `qty <= 0` (line 118).

**API:** `POST /addVcutQty.cfm`

**Payload:**
```typescript
{
  transac: number,           // Work order TRANSAC
  copmachine: number,        // Component's machine
  nopseq: number,            // Component's operation NOPSEQ
  mainNopseq: number,        // Main VCUT operation NOPSEQ
  qty: number,               // Good quantity entered
  defectQty: number,         // Defect quantity entered
  container: string,         // Container number
  inventaireP: number,       // Material inventory seq (comp.inventaireM)
  niseq: number,             // Nomenclature item sequence
  employeeSeq: number        // Current employee
}
```

**Response:**
```typescript
{ producedItems: ProducedItem[], tjseq: number, listeTjseq: string }
```

**After success (lines 139-153):**
1. Clears inputs for this row
2. Calls `onItemAdded()` → parent refreshes produced items + SM recalc
3. Calls `fetchComponents()` → refreshes components with updated `defaultQty`

## Backend: `POST /addVcutQty.cfm` — EPF Creation (6 Steps)

Replicates old software's **ProduitFini.cfc -> AjouteEPF**.

### Step A: Find/Validate NOPSEQ and TRANSAC

Query `cNOMENCOP` + `VOperationParTransac` for the component's operation data.

### Step B: Find or Create TEMPSPROD

- If component `nopseq !== mainNopseq` → create new TEMPSPROD via **`Nba_Sp_Insert_Production`**
  - Parameters: employee, operation, machine, CNOMENCOP, INVENTAIRE_C, dates
  - Output: `TJSEQ`
- Otherwise → find existing TEMPSPROD with matching NOPSEQ + MODEPROD='PROD'
- Update TEMPSPROD: set `TJQTEPROD`, `CNOMENCOP`, `INVENTAIRE_C`

### Step C: Create EPF Header

AutoFab SOAP: `EXECUTE_TRANSACTION EPF/INS`
```
params: '';{LaDateClarion};{LaHeureClarion};'WebUI New';'0';'Ecran de production pour EPF';
```
- Returns: `PFSEQ`
- Query `ENTRERPRODFINI` to get `PFNOTRANS`

### Step D: Create EPF Details (2 Calls)

AutoFab SOAP: `EXECUTE_TRANSACTION EPFDETAIL/INS`

**Call 1 (DtrSeq=0):** Creates EPF transaction header
```
params: '';0;{epfSeq};{inventaireP};{epfEntrepot};{epfNiseq};{conotrans};{tritem};{goodQty};;'';;'{trnorelache}';
```

**Call 2 (DtrSeq=-1):** Creates EPF transaction detail with container link
```
params: '{epfTrSeq}';-1;{epfSeq};{inventaireP};{epfEntrepot};{epfNiseq};{conotrans};{tritem};{goodQty};;'';;'{trnorelache}';
```

### Step E: Link TEMPSPROD to EPF

```sql
UPDATE TEMPSPROD SET ENTRERPRODFINI_PFNOTRANS = @pfnotrans WHERE TJSEQ = @tjseq
```
Also updates `TJQTEPROD` with qty.

### Step F: Container Creation + DET_TRANS Update

1. Check if company uses containers (`PARA_CIE.UTILISE_MODULE_CONTENANT`)
2. If container doesn't exist:
   - Get next sequence from `TableSequence.CONTENANT`
   - Call **`Nba_Insert_Contenant`** via AutoFab: `params: 22,{stmSeq},{leEntrepot},'{conNumero}',1`
   - Returns `CON_SEQ`
3. Find EPF TRANSAC from `PFNOTRANS`
4. If no `DET_TRANS` exists → call **`Nba_Insert_Det_Trans_Avec_Contenant`**
5. Otherwise → Update `DET_TRANS`: set `DTRQTE`, `DTRQTEUNINV`, `CONTENANT`, `CONTENANT_CON_NUMERO`
6. Update `TRANSAC`: set `TRQTETRANSAC`, `TRQTEUNINV`

### Multiple Product Handling

Each component gets its **own TEMPSPROD row** and its **own EPF transaction**. The `listeTjseq` and `listeEpfSeq` CSV strings accumulate all sequences across components for batch posting at submit time.

## UI Table Structure (Lines 166-268)

| Column | Width | Input Type | Notes |
|--------|-------|------------|-------|
| QTE BONNES | 120px | NumPad popover | Green text, pre-filled with `defaultQty` |
| QTE DEFECTUEUSES | 120px | NumPad popover | Default "0" |
| CONTENANT | 140px | Text input (number) | Container number |
| PRODUIT (CODE) | auto | Read-only | `desc_P/desc_S (code)` |
| ACTION | 60px | "+" Button | Triggers `handleRowAdd()` |
