/**
 * Centralized width definitions for the WebUIProd application.
 * All column widths and element widths are defined here.
 * Never use inline w-[Xpx] in JSX — always reference constants from this file.
 */

// ───────────────────────────────────────
// WIDTH - WORK_ORDERS_TABLE (S002)
// ───────────────────────────────────────
export const W_WORK_ORDERS = {
  rowNumber:   "w-[50px]",
  actions:     "w-[70px]",
  orderNumber: "w-[160px]",
  client:      "w-[180px]",
  product:     "w-[200px]",
  group:       "w-[100px]",
  panel:       "w-[100px]",
  mold:        "w-[120px]",
  qtyTotal:    "w-[90px]",
  qtyProduced: "w-[90px]",
  qtyRemaining:"w-[90px]",
  operation:   "w-[200px]",
  status:      "w-[120px]",
} as const;

// ───────────────────────────────────────
// WIDTH - OPERATION_HEADER (S003)
// ───────────────────────────────────────
export const W_OPERATION_HEADER = {
  orderLabel:     "w-[120px]",
  orderValue:     "w-[200px]",
  clientLabel:    "w-[80px]",
  clientValue:    "w-[200px]",
  productLabel:   "w-[80px]",
  productValue:   "w-[250px]",
  qtyLabel:       "w-[100px]",
  qtyValue:       "w-[80px]",
  operationLabel: "w-[100px]",
  operationValue: "w-[250px]",
  statusLabel:    "w-[80px]",
  statusValue:    "w-[140px]",
} as const;

// ───────────────────────────────────────
// WIDTH - PANEL_LAYERS_TABLE (S003 Press)
// ───────────────────────────────────────
export const W_PANEL_LAYERS = {
  seq:       "w-[50px]",
  length:    "w-[70px]",
  width:     "w-[70px]",
  species:   "w-[120px]",
  grade:     "w-[80px]",
  cut:       "w-[80px]",
  thickness: "w-[80px]",
  grain:     "w-[70px]",
  pLam:      "w-[60px]",
  glue:      "w-[80px]",
  tape:      "w-[60px]",
  sand:      "w-[60px]",
} as const;

// ───────────────────────────────────────
// WIDTH - MOLD_INFO (S003 Press)
// ───────────────────────────────────────
export const W_MOLD_INFO = {
  label:     "w-[160px]",
  value:     "w-[200px]",
} as const;

// ───────────────────────────────────────
// WIDTH - QUESTIONNAIRE (S004)
// ───────────────────────────────────────
export const W_QUESTIONNAIRE = {
  label:     "w-[180px]",
  input:     "w-[250px]",
  dropdown:  "w-[300px]",
} as const;

// ───────────────────────────────────────
// WIDTH - DEFECT_TABLE (S004)
// ───────────────────────────────────────
export const W_DEFECT_TABLE = {
  qty:       "w-[100px]",
  type:      "w-[250px]",
  notes:     "w-[300px]",
  actions:   "w-[80px]",
} as const;

// ───────────────────────────────────────
// WIDTH - TIME_TRACKING (S007)
// ───────────────────────────────────────
export const W_TIME_TRACKING = {
  date:      "w-[120px]",
  employee:  "w-[180px]",
  shift:     "w-[100px]",
  duration:  "w-[100px]",
  status:    "w-[120px]",
  order:     "w-[140px]",
  qty:       "w-[80px]",
  actions:   "w-[80px]",
} as const;

// ───────────────────────────────────────
// WIDTH - INVENTORY (S008)
// ───────────────────────────────────────
export const W_INVENTORY = {
  product:     "w-[160px]",
  description: "w-[280px]",
  warehouse:   "w-[200px]",
  qtyEstimated:"w-[100px]",
  qtyActual:   "w-[100px]",
  unit:        "w-[80px]",
  date:        "w-[120px]",
  actions:     "w-[80px]",
} as const;

// ───────────────────────────────────────
// WIDTH - CORRECTIONS (S010)
// ───────────────────────────────────────
export const W_CORRECTIONS = {
  label:     "w-[160px]",
  input:     "w-[200px]",
  qtyField:  "w-[120px]",
} as const;
