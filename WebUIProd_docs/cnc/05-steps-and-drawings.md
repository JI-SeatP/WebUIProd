# Operation Steps, Accessories & Drawings

> **Files:** `src/features/operation/components/CncInfoSection.tsx`, `src/features/operation/components/AccessoriesTable.tsx`, `src/features/operation/components/StepDetailsViewer.tsx`, `src/features/operation/components/DrawingViewer.tsx`, `server/api.cjs` (getOperationAccessories route)
> **Depends on:** [02-operation-details](02-operation-details.md), [12-type-definitions](12-type-definitions.md)
> **Used by:** [02-operation-details](02-operation-details.md)

## Summary

CncInfoSection shows operation steps (left) and accessories (right) side-by-side. Steps are numbered 100+i and can have attached media. When a step's Info button is clicked, StepDetailsViewer replaces the DrawingViewer in the right panel, showing RTF instructions, PDF, video, or images.

---

## CncInfoSection

**File:** `src/features/operation/components/CncInfoSection.tsx:34-142`

**Props:**
```typescript
interface CncInfoSectionProps {
  operation: OperationData;
  language: "fr" | "en";
  hideNextStep?: boolean;                    // true when next-step is in Row 1
  onViewStepDetails?: (step: OperationStep, stepNumber: number) => void;
  activeStepSeq?: number | null;             // highlights active step row
}
```

### Layout (Line 68)

Two cards side-by-side: `flex-[9]` for steps, `flex-[11]` for accessories.

### Steps Table (Lines 84-126)

| Column | Width | Content |
|--------|-------|---------|
| # | 56px, center | `100 + i` (0-indexed: 100, 101, 102...) |
| Production Steps | auto | `METDESC_P` / `METDESC_S` (language-aware) |
| Action | 56px (conditional) | Info button if step has media |

- Active step highlighted: `backgroundColor: "#aeffae"` (green)
- Action column only shown if **any** step has media

### `stepHasMedia()` — Lines 18-24

```typescript
function stepHasMedia(step: OperationStep, language: "fr" | "en"): boolean {
  if (language === "fr") {
    return !!(step.METRTF_P || step.METFICHIER_PDF_P || step.METVIDEO_P || step.IMAGE_COUNT > 0);
  }
  return !!(step.METRTF_S || step.METFICHIER_PDF_S || step.METVIDEO_S || step.IMAGE_COUNT > 0);
}
```

### Next Step Card (Lines 44-65)

When `hideNextStep` is false, shows inline next-step card with `NEXT_OPERATION_P/S` and `NEXT_MACHINE_P/S`. In OperationDetailsPage, this is hidden because next-step is rendered in Row 1.

---

## AccessoriesTable

**File:** `src/features/operation/components/AccessoriesTable.tsx:11-60`

**Props:** `{ accessories: OperationAccessory[], language: "fr" | "en", loading?: boolean }`

**Table (2 columns):**

| Column | Width | Content |
|--------|-------|---------|
| QTE | 60px, center | `acc.qty` |
| ACCESSOIRES NECESSAIRES | auto | `description_fr` / `description_en` |

### Backend: `GET /getOperationAccessories.cfm`

**File:** `server/api.cjs:747-838`

**Input:** `transac`, `copmachine`

**Step 1 (lines 769-790):** Query `AUTOFAB_FctSelectVarCompo` UDF via EXT database:
- `@SA1_ROUTER_BITS@` through `@SA5_PALETTS@` (currently hidden)
- `@TNUT1_CODE@` through `@TNUT4_CODE@` + quantities

**Step 2 (lines 799-807):** Fixed accessories (router bits, drill bits, etc.) — currently all hidden (`fixedItems = []`).

**Step 3 (lines 809-830):** T-NUT accessories:
- For each TNUT slot (1-4): if `qty >= 1` and code exists, look up description in `INVENTAIRE.INNOINV`
- Returns `{ qty, description_fr, description_en }` (descriptions uppercased)

**Response:** `{ success: true, data: OperationAccessory[] }`

---

## StepDetailsViewer

**File:** `src/features/operation/components/StepDetailsViewer.tsx:18-180`

**Props:** `{ step: OperationStep, stepNumber: number, language: "fr" | "en", onClose: () => void }`

Replaces DrawingViewer in the right panel when a step's Info button is clicked.

### Tabs (Lines 30-34)

Tabs are built dynamically based on available media:

| Tab | Condition | Content |
|-----|-----------|---------|
| INSTRUCTIONS | `METRTF_P/S` exists | RTF HTML rendered via `dangerouslySetInnerHTML` |
| PDF | `METFICHIER_PDF_P/S` exists | Embedded `<object>` via `/api/doc-methode/{METSEQ}/pdf_p` |
| VIDEO | `METVIDEO_P/S` exists | `<video>` element via `/api/doc-methode/{METSEQ}/video_p` |
| IMAGES | `IMAGE_COUNT > 0` | Lazy-loaded via `GET /api/doc-methode-images/{METSEQ}` |

### Media Serving

All media is served through Express file proxy endpoints that convert network file paths to HTTP:
- PDF: `/api/doc-methode/{METSEQ}/pdf_p` or `pdf_s`
- Video: `/api/doc-methode/{METSEQ}/video_p` or `video_s`
- Images: `/api/doc-methode-images/{METSEQ}` → `{ images: [{ url, descP, descS }] }`

---

## DrawingViewer

**File:** `src/features/operation/components/DrawingViewer.tsx:15-165`

**Props:** `{ images?: string[] }`

Default right-panel content. Shows product drawings fetched from `getDrawings.cfm`.

### Features
- Page navigation (prev/next) for multiple drawings
- Fullscreen modal (portaled to body) on click
- PDF detection: `/\.pdf$/i` or `/\/doc\/\d+/`
- PDF rendered via `<object>`, images via `<img>`
