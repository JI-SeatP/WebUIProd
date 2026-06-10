# Operation Details Page (Read-Only Display)

> **Files:** `src/features/operation/OperationDetailsPage.tsx`, `src/features/operation/components/OperationHeader.tsx`, `src/features/operation/components/VcutInfoSection.tsx`, `src/features/operation/hooks/useVcutData.ts`
> **Depends on:** [01-overview](01-overview.md)
> **Used by:** [03-questionnaire-layout](03-questionnaire-layout.md)

## Summary

The Operation Details page shows VCUT-specific read-only data: components table, containers table, and big-sheet quantities in the header. Data is fetched via `useVcutData` hook calling `GET /getVcutData.cfm`.

## Hook: `useVcutData(transac)`

**File:** `src/features/operation/hooks/useVcutData.ts:5-31`

```typescript
function useVcutData(transac: number | null): {
  vcutData: VcutData | null;
  loading: boolean;
  error: string | null;
}
```

- **Activation:** Only called when `isVcutCheck` is true (OperationDetailsPage.tsx:37)
- **API call:** `GET /getVcutData.cfm?transac={transac}`
- **Returns:** `VcutData` object (see [11-type-definitions](11-type-definitions.md))

## Backend: `GET /getVcutData.cfm`

**File:** `server/api.cjs:350-480`

**Queries executed (in order):**

| # | Query | Database | Purpose |
|---|-------|----------|---------|
| 1 | `vEcransProduction` WHERE `NO_INVENTAIRE = 'VCUT'` | EXT | Get `QTE_FORCEE`, VCUT descriptions |
| 2 | `DET_TRANS` JOIN `TRANSAC` WHERE `TRNO_EQUATE = 7` | Primary | BigSheet total used (`qteUtilisee`) |
| 3 | `cNOMENCOP` WHERE `INVENTAIRE_P` not VCUT | Primary | BigSheet inventory info (code, descriptions) |
| 4 | `cNOMENCLATURE` JOIN `INVENTAIRE` + VENEER subquery | Primary | Component list with `QTY_REQ` |
| 5 | Per-component: `TEMPSPROD` SUM | Primary | `totalProd`, `totalDefect` per component |
| 6 | Per-component: `DET_TRANS` via `SMNOTRANS` | Primary | `totalBigSheet` per component |
| 7 | `VSP_BonTravail_VeneerReserve` JOIN `ENTREPOT` | EXT + Primary | Veneer containers (SKID info) |

**Response:**
```json
{
  "success": true,
  "data": {
    "components": [VcutComponent],
    "containers": [VcutContainer],
    "qteForcee": 100,
    "qteUtilisee": 45,
    "bigsheetDesc_P": "...", "bigsheetDesc_S": "...",
    "bigsheetCode": "...",
    "vcutDesc_P": "...", "vcutDesc_S": "..."
  }
}
```

## Layout Differences from Non-VCUT

| Feature | VCUT | Non-VCUT |
|---------|------|----------|
| Left panel width | `w-full` (line 255) | `w-1/2` |
| Right drawing panel | Hidden (line 398) | Visible |
| Machine info panel | Hidden (line 310) | Visible |
| Client field in header | Hidden (line 150) | Visible |
| Product field | "BIG SHEET: {qteForcee} {desc}" (line 162-174) | Product code + description |
| Qty boxes | To Make / Used / Remaining (lines 206-224) | To Make / Produced / Defect / Remaining |
| Qty label | "Qty Used" (line 116) | "Qty Produced/Pressed/Machined" |

## VcutInfoSection Component

**File:** `src/features/operation/components/VcutInfoSection.tsx:21-136`

**Props:** `{ vcutData: VcutData | null, language: "fr" | "en", loading?: boolean }`

**Layout:** Two side-by-side cards (55% / 45%)

**Left card — Components table (6 columns):**

| Column | Field | Notes |
|--------|-------|-------|
| Product No. | `INVENTAIRE_M_INNOINV` | |
| Description | `INDESC1` / `INDESC2` | Language-aware |
| Order | `NIVALEUR_CHAR1` | |
| Big Sheets | `totalBigSheet / QTY_REQ` | Red row if `QTY_REQ === 0` |
| Good | `totalProd / ceil(NIQTE)` | |
| Defect | `totalDefect` | Red text |

**Right card — Containers table (4 columns):**

| Column | Field |
|--------|-------|
| SKID # | `CONTENANT_CON_NUMERO` |
| Qty | `DTRQTE` |
| Warehouse | `ENTREPOT_ENCODE` + descriptions |
| Description | `SPECIE / GRADE / CUT / THICKNESS` |

Shows red alert "NO CONTAINERS" if containers array is empty.
