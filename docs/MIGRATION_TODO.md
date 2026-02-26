# MIGRATION TODO

> Last updated: 2026-02-25
> Progress: 0/70+ features completed

---

## S001 - App Shell & Foundation

### S001-01 Project Setup
- [ ] **S001-01-F001** Install new npm dependencies `Not Started`
- [ ] **S001-01-F002** Install new shadcn/ui components `Not Started`
- [ ] **S001-01-F003** Configure Roboto Condensed font `Not Started`
- [ ] **S001-01-F004** Add custom Tailwind utilities (touch-target, no-select) `Not Started`
- [ ] **S001-01-F005** Set up React Router with route structure `Not Started`
- [ ] **S001-01-F006** Set up i18next with FR/EN translation files `Not Started`

### S001-02 Mock Data Infrastructure
- [ ] **S001-02-F001** Create TypeScript interfaces for CSV data `Not Started`
- [ ] **S001-02-F002** Create CSV parsing utilities + typed data loaders `Not Started`
- [ ] **S001-02-F003** Create MSW request handlers `Not Started`
  - Depends on: S001-02-F001, S001-02-F002
- [ ] **S001-02-F004** Configure MSW browser worker + dev init `Not Started`
  - Depends on: S001-02-F003

### S001-03 Auth & Session Context
- [ ] **S001-03-F001** Create SessionContext with useReducer `Not Started`
- [ ] **S001-03-F002** Build Login page (S000) `Not Started`
  - Depends on: S001-03-F001, S001-02-F004

### S001-04 App Shell Layout
- [ ] **S001-04-F001** Build AppLayout (fixed header + scrollable content + fixed footer) `Not Started`
- [ ] **S001-04-F002** Build Header component `Not Started`
  - Depends on: S001-03-F001
- [ ] **S001-04-F003** Build Footer component `Not Started`
- [ ] **S001-04-F004** Build InfoBar component `Not Started`
  - Depends on: S001-03-F001

### S001-05 Shared UI Components
- [ ] **S001-05-F001** Build OnScreenKeyboard (draggable, QWERTY, French chars) `Not Started`
- [ ] **S001-05-F002** Build NumPad component `Not Started`
- [ ] **S001-05-F003** Build useInputMethod hook `Not Started`
  - Depends on: S001-05-F001, S001-05-F002
- [ ] **S001-05-F004** Build StatusBadge component `Not Started`
- [ ] **S001-05-F005** Build LoadingSpinner component `Not Started`
- [ ] **S001-05-F006** Build ConfirmDialog wrapper `Not Started`

### S001-06 Width Constants
- [ ] **S001-06-F001** Define all width constant blocks `Not Started`

### S001-07 Test Utilities
- [ ] **S001-07-F001** Create custom render with providers `Not Started`
  - Depends on: S001-03-F001, S001-01-F005, S001-01-F006

---

## S002 - Work Order List

### S002-01 Filters Section
- [ ] **S002-01-F001** Build FiltersDrawer (Sheet component) `Not Started`
- [ ] **S002-01-F002** Machine filter chips (ToggleGroup, double height, wrap) `Not Started`
- [ ] **S002-01-F003** Date preset dropdown with Custom Dates option `Not Started`
- [ ] **S002-01-F004** Search box with Enter-to-execute `Not Started`
- [ ] **S002-01-F005** Operation type filter dropdown `Not Started`
- [ ] **S002-01-F006** Status multi-select filter `Not Started`

### S002-02 Work Order Table
- [ ] **S002-02-F001** Build WorkOrderTable with sortable column headers `Not Started`
- [ ] **S002-02-F002** Build ActionsDropdown per row `Not Started`
- [ ] **S002-02-F003** Order comments indicator (Popover) `Not Started`
- [ ] **S002-02-F004** PPAP indicator `Not Started`
- [ ] **S002-02-F005** Expandable rows for operations/machines `Not Started`
- [ ] **S002-02-F006** Virtualized/infinite scroll `Not Started`

### S002-03 Page Composition
- [ ] **S002-03-F001** Build WorkOrderListPage `Not Started`
- [ ] **S002-03-F002** Create useWorkOrders hook `Not Started`
- [ ] **S002-03-F003** Create MSW handler for work orders `Not Started`

---

## S003 - Operation Details

### S003-01 Header Info Block
- [ ] **S003-01-F001** Build OperationHeader with improved layout `Not Started`

### S003-02 Machine-Specific Sections
- [ ] **S003-02-F001** Build PressInfoSection `Not Started`
- [ ] **S003-02-F002** Build PanelLayersTable `Not Started`
- [ ] **S003-02-F003** Build CncInfoSection `Not Started`
- [ ] **S003-02-F004** Build VcutInfoSection `Not Started`

### S003-03 Machine Info Block
- [ ] **S003-03-F001** Build MachineInfoPanel `Not Started`

### S003-04 Document Viewer
- [ ] **S003-04-F001** Build DrawingViewer (PDF with zoom extents) `Not Started`

### S003-05 Status Action Footer
- [ ] **S003-05-F001** Build StatusActionBar (with ON_HOLD + Reset Ready) `Not Started`
- [ ] **S003-05-F002** Build useStatusChange hook `Not Started`

### S003-06 Alerts
- [ ] **S003-06-F001** Build PpapAlert `Not Started`
- [ ] **S003-06-F002** Build DoNotPressAlert `Not Started`

### S003-07 Page Composition
- [ ] **S003-07-F001** Build OperationDetailsPage `Not Started`
- [ ] **S003-07-F002** Create useOperation hook `Not Started`
- [ ] **S003-07-F003** Create MSW handler for operations `Not Started`

---

## S004 - Production Questionnaire

### S004-01 Questionnaire Layout
- [ ] **S004-01-F001** Build QuestionnairePage (form container) `Not Started`
- [ ] **S004-01-F002** Build OrderInfoBlock `Not Started`

### S004-02 Employee Section
- [ ] **S004-02-F001** Build EmployeeEntry (code input + name lookup) `Not Started`

### S004-03 Stop Cause Section
- [ ] **S004-03-F001** Build StopCauseSection (cascading dropdowns) `Not Started`

### S004-04 Quantity Entry
- [ ] **S004-04-F001** Build DefectQuantitySection `Not Started`
- [ ] **S004-04-F002** Build GoodQuantitySection `Not Started`
- [ ] **S004-04-F003** Build FinishedProductsSection `Not Started`

### S004-05 Material & Mold
- [ ] **S004-05-F001** Build MaterialOutputSection `Not Started`
- [ ] **S004-05-F002** Build MoldActionSection `Not Started`

### S004-06 Form Submission
- [ ] **S004-06-F001** Build useQuestionnaireSubmit hook `Not Started`

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
- [ ] **S009-01-F002** Label Printing modal `Not Started`
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
