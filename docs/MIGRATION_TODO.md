# MIGRATION TODO

> Last updated: 2026-03-06
> Progress: 56/70+ features completed (Phases 1-4 done)

---

## S001 - App Shell & Foundation

### S001-01 Project Setup
- [x] **S001-01-F001** Install new npm dependencies `Completed`
- [x] **S001-01-F002** Install new shadcn/ui components `Completed`
- [x] **S001-01-F003** Configure Roboto Condensed font `Completed`
- [x] **S001-01-F004** Add custom Tailwind utilities (touch-target, no-select) `Completed`
- [x] **S001-01-F005** Set up React Router with route structure `Completed`
- [x] **S001-01-F006** Set up i18next with FR/EN translation files `Completed`

### S001-02 Mock Data Infrastructure
- [x] **S001-02-F001** Create TypeScript interfaces for CSV data `Completed`
- [x] **S001-02-F002** Create CSV parsing utilities + typed data loaders `Completed`
- [x] **S001-02-F003** Create MSW request handlers `Completed`
- [x] **S001-02-F004** Configure MSW browser worker + dev init `Completed`

### S001-03 Auth & Session Context
- [x] **S001-03-F001** Create SessionContext with useReducer `Completed`
- [x] **S001-03-F002** Build Login page (S000) `Completed`

### S001-04 App Shell Layout
- [x] **S001-04-F001** Build AppLayout (fixed header + scrollable content + fixed footer) `Completed`
- [x] **S001-04-F002** Build Header component `Completed`
- [x] **S001-04-F003** Build Footer component `Completed`
- [x] **S001-04-F004** Build InfoBar component `Completed`

### S001-05 Shared UI Components
- [x] **S001-05-F001** Build OnScreenKeyboard (draggable, QWERTY, French chars) `Completed`
- [x] **S001-05-F002** Build NumPad component `Completed`
- [x] **S001-05-F003** Build useInputMethod hook `Completed`
- [x] **S001-05-F004** Build StatusBadge component `Completed`
- [x] **S001-05-F005** Build LoadingSpinner component `Completed`
- [x] **S001-05-F006** Build ConfirmDialog wrapper `Completed`

### S001-06 Width Constants
- [x] **S001-06-F001** Define all width constant blocks `Completed`

### S001-07 Test Utilities
- [x] **S001-07-F001** Create custom render with providers `Completed`

---

## S002 - Work Order List

### S002-01 Filters Section
- [x] **S002-01-F001** Build FiltersDrawer (Sheet component) `Completed`
- [x] **S002-01-F002** Machine filter chips (ToggleGroup, double height, wrap) `Completed`
- [x] **S002-01-F003** Date preset dropdown with Custom Dates option `Completed`
- [x] **S002-01-F004** Search box with Enter-to-execute `Completed`
- [x] **S002-01-F005** Operation type filter dropdown `Completed`
- [x] **S002-01-F006** Status multi-select filter `Completed`

### S002-02 Work Order Table
- [x] **S002-02-F001** Build WorkOrderTable with sortable column headers `Completed`
- [x] **S002-02-F002** Build ActionsDropdown per row `Completed`
- [x] **S002-02-F003** Order comments indicator (Popover) `Completed`
- [x] **S002-02-F004** PPAP indicator `Completed`
- [ ] **S002-02-F005** Expandable rows for operations/machines `Not Started`
- [ ] **S002-02-F006** Virtualized/infinite scroll `Not Started`

### S002-03 Page Composition
- [x] **S002-03-F001** Build WorkOrderListPage `Completed`
- [x] **S002-03-F002** Create useWorkOrders hook `Completed`
- [x] **S002-03-F003** Create MSW handler for work orders `Completed`

---

## S003 - Operation Details

### S003-01 Header Info Block
- [x] **S003-01-F001** Build OperationHeader with improved layout `Completed`

### S003-02 Machine-Specific Sections
- [x] **S003-02-F001** Build PressInfoSection `Completed`
- [x] **S003-02-F002** Build PanelLayersTable `Completed`
- [x] **S003-02-F003** Build CncInfoSection `Completed`
- [x] **S003-02-F004** Build VcutInfoSection `Completed`

### S003-03 Machine Info Block
- [x] **S003-03-F001** Build MachineInfoPanel `Completed`

### S003-04 Document Viewer
- [x] **S003-04-F001** Build DrawingViewer (PDF with zoom extents) `Completed`

### S003-05 Status Action Footer
- [x] **S003-05-F001** Build StatusActionBar (with ON_HOLD + Reset Ready) `Completed`
- [x] **S003-05-F002** Build useStatusChange hook `Completed`

### S003-06 Alerts
- [x] **S003-06-F001** Build PpapAlert `Completed`
- [x] **S003-06-F002** Build DoNotPressAlert `Completed`

### S003-07 Page Composition
- [x] **S003-07-F001** Build OperationDetailsPage `Completed`
- [x] **S003-07-F002** Create useOperation hook `Completed`
- [x] **S003-07-F003** Create MSW handler for operations `Completed`

### S003-08 CNC Operation Special blocks
- [ ] S003-08-F001 Operation Steps
- [ ] S003-08-F002 Components
---

## S004 - Production Questionnaire

### S004-01 Questionnaire Layout
- [x] **S004-01-F001** Build QuestionnairePage (form container) `Completed`
- [x] **S004-01-F002** Build OrderInfoBlock `Completed`

### S004-02 Employee Section
- [x] **S004-02-F001** Build EmployeeEntry (code input + name lookup) `Completed`

### S004-03 Stop Cause Section
- [x] **S004-03-F001** Build StopCauseSection (cascading dropdowns) `Completed`

### S004-04 Quantity Entry
- [x] **S004-04-F001** Build DefectQuantitySection `Completed`
- [x] **S004-04-F002** Build GoodQuantitySection `Completed`
- [x] **S004-04-F003** Build FinishedProductsSection `Completed`

### S004-05 Material & Mold
- [x] **S004-05-F001** Build MaterialOutputSection `Completed`
- [x] **S004-05-F002** Build MoldActionSection `Completed`

### S004-06 Form Submission
- [x] **S004-06-F001** Build useQuestionnaireSubmit hook `Completed`

---

## S007 - Time Tracking

### S007-01 Time Tracking Screens
- [ ] **S007-01-F001** Tabbed layout (Production Time / Add Hours / Search) `Not Started`
- [ ] **S007-01-F002** Production Time tab `Not Started`
- [ ] **S007-01-F003** Add Hours tab `Not Started`
- [ ] **S007-01-F004** Search tab `Not Started`

---

## S008 - Inventory

### S008-01 Inventory Screen
- [ ] **S008-01-F001** Filter panel `Not Started`
- [ ] **S008-01-F002** Results table `Not Started`
- [ ] **S008-01-F003** Edit Dialog for quantities `Not Started`

---

## S009 - Popup Modals

### S009-01 Modal Screens
- [ ] **S009-01-F001** SKID Scanner modal `Not Started`
- [x] **S009-01-F002** Label Printing modal `Completed`
- [ ] **S009-01-F003** Message modal `Not Started`
- [ ] **S009-01-F004** Warehouse Transfer modal `Not Started`
- [ ] **S009-01-F005** Machine Selection modal `Not Started`

---

## S010 - Corrections

### S010-01 Corrections Screen
- [ ] **S010-01-F001** Correction form `Not Started`
- [ ] **S010-01-F002** Submit corrections `Not Started`

---

## Bug Issues

<!-- Bug issues are created here when tests fail. Format:

### BUG-001
- **Source:** {Feature Code} {Feature Name}
- **Description:** {What failed}
- **Status:** `Open`
- **Blocking:** {Feature Code} cannot be marked Completed

-->
