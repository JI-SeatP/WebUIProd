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
  client:      "w-[260px]",
  product:     "w-[200px]",
  group:       "w-[60px]",
  panel:       "w-[100px]",
  mold:        "w-[80px]",
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
  qtyValue:       "w-[100px]",
  operationLabel: "w-[100px]",
  operationValue: "w-[250px]",
  statusLabel:    "w-[80px]",
  statusValue:    "w-[140px]",
} as const;

// ───────────────────────────────────────
// WIDTH - PANEL_DETAILS_TABLE (S003 Press)
// ───────────────────────────────────────
export const W_PANEL_DETAILS = {
  item:        "w-[160px]",
  panneau:     "w-[140px]",
  description: "w-[320px]",
  version:     "w-[60px]",
  type:        "w-[120px]",
  weight:      "w-[80px]",
} as const;

// ───────────────────────────────────────
// WIDTH - PANEL_LAYERS_TABLE (S003 Press)
// ───────────────────────────────────────
export const W_PANEL_LAYERS = {
  seq:       "w-[50px]",
  length:    "w-[55px]",
  width:     "w-[55px]",
  species:   "w-[380px]",
  grade:     "w-[55px]",
  cut:       "w-[70px]",
  thickness: "w-[65px]",
  grain:     "w-[70px]",
  pLam:      "w-[70px]",
  glue:      "w-[50px]",
  tape:      "w-[50px]",
  sand:      "w-[55px]",
} as const;

// ───────────────────────────────────────
// WIDTH - DRAWING PANEL (S003 right column)
// ───────────────────────────────────────
export const W_DRAWING_PANEL = {
  container: "w-1/2 shrink-0",
} as const;

// ───────────────────────────────────────
// WIDTH - PRESS_SECTION (S003 Press)
// ───────────────────────────────────────
export const W_PRESS_SECTION = {
  materialsCard:    "w-[150px]",
  machineCard:      "w-[228px]",
  moldCard:         "w-[461px]",
  machineInfoMin:   "min-w-[150px]",
} as const;

// ───────────────────────────────────────
// WIDTH - MOLD_INFO (S003 Press)
// ───────────────────────────────────────
export const W_MOLD_INFO = {
  label:     "w-[192px]",
  value:     "w-[240px]",
} as const;

// ───────────────────────────────────────
// WIDTH - QUESTIONNAIRE (S004)
// ───────────────────────────────────────
export const W_QUESTIONNAIRE = {
  label:     "w-[180px]",
  input:     "w-[135px]",
  dropdown:  "w-[300px]",
  footerBtn: "w-[300px]",
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
  date:      "w-[10%]",
  dateEnd:   "w-[7%]",
  duration:  "w-[7%]",
  status:    "w-[10%]",
  statusDropdown: "w-[150px]",
  order:     "w-[13%]",
  shift:     "w-[9%]",
  employee:  "w-[28%]",
  qty:       "w-[7%]",
  actions:   "w-[7%]",
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
// WIDTH - EMPLOYEE_HOURS_TABLE (S007 Add Hours)
// ───────────────────────────────────────
export const W_EMPLOYEE_HOURS = {
  startEnd:    "w-[150px]",
  duration:    "w-[90px]",
  department:  "w-[120px]",
  machine:     "w-[120px]",
  employee:    "w-[160px]",
  effortRate:  "w-[90px]",
  hoursWorked: "w-[110px]",
  actions:     "w-[100px]",
} as const;

// ───────────────────────────────────────
// WIDTH - CORRECTIONS (S010)
// ───────────────────────────────────────
export const W_CORRECTIONS = {
  label:     "w-[160px]",
  input:     "w-[200px]",
  qtyField:  "w-[120px]",
} as const;

// ───────────────────────────────────────
// WIDTH - COMPONENTS_TABLE (S003 CNC)
// ───────────────────────────────────────
export const W_COMPONENTS = {
  seq:       "w-[50px]",
  length:    "w-[70px]",
  width:     "w-[70px]",
  species:   "w-[100px]",
  grade:     "w-[70px]",
  cut:       "w-[100px]",
  thickness: "w-[90px]",
  grain:     "w-[80px]",
  laminate:  "w-[80px]",
  glue:      "w-[80px]",
  tape:      "w-[70px]",
  sand:      "w-[70px]",
} as const;
