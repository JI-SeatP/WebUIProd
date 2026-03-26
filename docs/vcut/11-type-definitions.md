# Type Definitions

> **Files:** `src/types/workOrder.ts`, `src/features/questionnaire/components/VcutQuantitySection.tsx`, `src/features/questionnaire/components/MaterialOutputSection.tsx`, `src/features/questionnaire/hooks/useQuestionnaireSubmit.ts`
> **Depends on:** none
> **Used by:** [02-operation-details](02-operation-details.md), [04-pf-transaction](04-pf-transaction.md), [05-produced-items](05-produced-items.md), [06-sm-transaction](06-sm-transaction.md), [07-submit-flow](07-submit-flow.md)

## Summary

Six TypeScript interfaces define the VCUT data structures. Note that `VcutComponent` exists in two forms: one for the Operation Details page (from `workOrder.ts`) and one for the Questionnaire (from `VcutQuantitySection.tsx`).

---

## VcutData (Operation Details)

**File:** `src/types/workOrder.ts:188-198`

```typescript
export interface VcutData {
  components: VcutComponent[];
  containers: VcutContainer[];
  qteForcee: number;              // Order quantity (big sheets to cut)
  qteUtilisee: number;            // Quantity used so far
  bigsheetDesc_P: string | null;  // French description
  bigsheetDesc_S: string | null;  // English description
  bigsheetCode: string | null;    // Inventory code
  vcutDesc_P: string | null;      // VCUT French description
  vcutDesc_S: string | null;      // VCUT English description
}
```

## VcutComponent — Operation Details Shape

**File:** `src/types/workOrder.ts:158-172`

```typescript
export interface VcutComponent {
  NISEQ: number;                      // Nomenclature item sequence (PK)
  NIQTE: number;                      // BOM quantity per parent
  INVENTAIRE_M: number;               // Material inventory sequence
  INVENTAIRE_M_INNOINV: string;       // Material inventory code
  INDESC1: string;                    // French description
  INDESC2: string;                    // English description
  NIVALEUR_CHAR1: string | null;      // Order reference
  QTY_REQ: number;                    // Required quantity (big sheets)
  NILONGUEUR: number;                 // Length
  NILARGEUR: number;                  // Width
  totalProd: number;                  // Cumulative good produced
  totalDefect: number;                // Cumulative defect count
  totalBigSheet: number;              // Big sheets used for this component
}
```

## VcutContainer — Operation Details Shape

**File:** `src/types/workOrder.ts:174-186`

```typescript
export interface VcutContainer {
  CONTENANT_CON_NUMERO: string;  // Container/SKID number
  DTRQTE: number;                // Quantity
  ENTREPOT_ENCODE: string;       // Warehouse code
  ENDESC_P: string;              // Warehouse French description
  ENDESC_S: string;              // Warehouse English description
  SPECIE: string | null;         // Wood species
  GRADE: string | null;          // Grade
  THICKNESS: string | null;      // Thickness
  CUT: string | null;            // Cut type
  LONGUEUR: number | null;       // Length
  LARGEUR: number | null;        // Width
}
```

## VcutComponent — Questionnaire Shape

**File:** `src/features/questionnaire/components/VcutQuantitySection.tsx:20-31`

```typescript
export interface VcutComponent {
  niseq: number;        // Nomenclature item sequence
  niqte: number;        // BOM quantity
  inventaireM: number;  // Material inventory (parent)
  code: string;         // Inventory code
  desc_P: string;       // French description
  desc_S: string;       // English description
  copmachine: number;   // Component machine assignment
  nopseq: number;       // Component operation sequence
  cumQty: number;       // Cumulative quantity already produced
  defaultQty: number;   // Remaining: NIQTE - cumQty
}
```

## ProducedItem

**File:** `src/features/questionnaire/components/VcutQuantitySection.tsx:42-50`

```typescript
export interface ProducedItem {
  dtrseq: number;     // DET_TRANS sequence
  qty: number;         // Quantity produced
  container: string;   // Container number
  code: string;        // Product code
  desc_P: string;      // French description
  desc_S: string;      // English description
  epfTrno: string;     // EPF transaction number
}
```

## MaterialRow

**File:** `src/features/questionnaire/components/MaterialOutputSection.tsx:13-28`

```typescript
export interface MaterialRow {
  id: number;
  code: string;            // Raw material code
  description_P: string;   // French description
  description_S: string;   // English description
  unit_P: string;          // French unit
  unit_S: string;          // English unit
  originalQty: number;     // Calculated quantity
  correctedQty: number;    // Corrected quantity (after adjustments)
  warehouse: string;       // Warehouse code
  warehouse_P: string;     // French warehouse name
  warehouse_S: string;     // English warehouse name
  container: string;       // Container number
  bomRatio?: number;       // Per-material BOM ratio (NIQTE)
}
```

## QuestionnairePayload

**File:** `src/features/questionnaire/hooks/useQuestionnaireSubmit.ts:7-24`

```typescript
interface QuestionnairePayload {
  transac: number;
  copmachine: number | null;
  type: "stop" | "comp";
  employeeCode: string;
  primaryCause?: string;
  secondaryCause?: string;
  notes?: string;
  moldAction?: string;
  goodQty: string;
  defects: { qty: string; typeId: string; notes: string }[];
  finishedProducts?: { product: string; qty: string; container: string }[];
  nopseq?: number;
  isVcut?: boolean;          // VCUT flag
  listeTjseq?: string;      // CSV of TEMPSPROD TJSEQ values
  listeEpfSeq?: string;     // CSV of ENTRERPRODFINI PFSEQ values
  smnotrans?: string;       // SM transaction number
}
```
