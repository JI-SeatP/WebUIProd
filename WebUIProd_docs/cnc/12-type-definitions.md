# Type Definitions — CNC

> **Files:** `src/types/workOrder.ts`, `src/features/operation/components/PanelDetailsTable.tsx`, `src/features/operation/components/PanelLayersTable.tsx`
> **Depends on:** none
> **Used by:** [05-steps-and-drawings](05-steps-and-drawings.md), [06-questionnaire-layout](06-questionnaire-layout.md)

## Summary

CNC uses `OperationStep` for step media, `OperationAccessory` for T-nuts, and the shared `OperationData` type with CNC-relevant fields. Panel types (`PanelDetail`, `PanelLayer`) are shared with PRESS.

---

## OperationStep

**File:** `src/types/workOrder.ts`

```typescript
export interface OperationStep {
  METSEQ: number;                     // Method sequence (PK)
  METNUMERO: number;                  // Step number
  METDESC_P: string;                  // French description
  METDESC_S: string;                  // English description
  METFICHIER_PDF_P: string | null;    // French PDF path
  METFICHIER_PDF_S: string | null;    // English PDF path
  METVIDEO_P: string | null;          // French video path
  METVIDEO_S: string | null;          // English video path
  METRTF_P: string | null;            // French RTF/HTML instructions
  METRTF_S: string | null;            // English RTF/HTML instructions
  IMAGE_COUNT: number;                // Number of attached images
}
```

## OperationAccessory

**File:** `src/types/workOrder.ts`

```typescript
export interface OperationAccessory {
  qty: number;                        // Quantity needed
  description_fr: string | null;      // French description (uppercased)
  description_en: string | null;      // English description (uppercased)
}
```

## OperationData — CNC-Relevant Fields

**File:** `src/types/workOrder.ts` (union type: `WorkOrder & Partial<WorkOrderDetail>`)

Key fields used by CNC:

| Field | Type | Usage |
|-------|------|-------|
| `FMCODE` | string | Detection: "CNC" or "SAND" |
| `TRANSAC` | number | Work order ID |
| `COPMACHINE` | number | Machine assignment |
| `NO_PROD` | string | Order number |
| `STATUT_CODE` | string | Current status |
| `QTE_A_FAB` | number | Quantity to manufacture |
| `QTE_PRODUITE` | number | Quantity produced |
| `NOPQTESCRAP` | number | Defect quantity |
| `GROUPE` | string | Product group |
| `TYPEPRODUIT` | string | Product type (via extended fields) |
| `TRNOTE` | string | Transaction note (shown in MachineInfoPanel) |
| `ENTREPOT` | number | Warehouse (determines if EPF section shows) |
| `MOULE_CODE` | string | Mold code |
| `MOULE_CAVITE` | number | Mold cavities |
| `Panneau` | string | Panel designation |
| `REVISION` | string | Product revision |
| `NEXT_OPERATION` | number | Next operation flag |
| `NEXT_OPERATION_P/S` | string | Next operation description |
| `NEXT_MACHINE_P/S` | string | Next machine description |
| `NEXT_DEPT_P/S` | string | Next department description |
| `PV_PANEAU` | string | Panel number for warning message |
| `PANEL_SOURCE` | string | "LOCAL" or outsourced |
| `steps` | OperationStep[] | Operation steps array |

## PanelDetail

**File:** `src/features/operation/components/PanelDetailsTable.tsx`

```typescript
export interface PanelDetail {
  ITEM: string;
  PANNEAU: string;
  DESCRIPTION: string;
  VERSION: string;
  TYPE: string;
  THICKNESS: number;
  WEIGHT: number;
  drawingSeqs?: number[];    // DOSEQ values for drawings
}
```

## PanelLayer

**File:** `src/features/operation/components/PanelLayersTable.tsx`

```typescript
export interface PanelLayer {
  SEQ: number;
  LONGUEUR: number;         // Length
  LARGEUR: number;          // Width
  SPECIES: string;
  GRADE: string;
  CUT: string;
  THICKNESS: number;
  GRAIN: string;
  LAMINATE: string;
  GLUE: string;             // "Oui"/"Non" or "Yes"/"No"
  TAPE: string;
  SAND: string;
  isPly?: boolean;          // Highlighted with yellow background
}
```

## StepDetails (Image Fetch Response)

**File:** `src/types/workOrder.ts`

```typescript
export interface StepDetails {
  images: {
    url: string;
    descP: string;
    descS: string;
  }[];
}
```
