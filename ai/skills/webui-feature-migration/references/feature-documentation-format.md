# Feature Documentation Format

This document defines the exact structure for documenting features extracted from the old WebUI 
codebase. All docs live in `docs/SOURCE_FEATURES/` and form an Obsidian vault.

## Directory Structure

```
docs/SOURCE_FEATURES/
├── README.md                    ← Vault index with links to all screens
├── S001-WorkOrders.md
├── S002-ProductionEntry.md
├── S003-InventoryCheck.md
└── ...
```

Each screen gets one markdown file. No subdirectories per screen — sections and features are 
headings within the file.

## File Naming

`S{NNN}-{ScreenName}.md`

- `S` prefix + 3-digit zero-padded number
- PascalCase screen name, no spaces
- Example: `S001-WorkOrders.md`

## Document Structure

```markdown
# S001 - Work Orders

> Brief description of what this screen does in the old system.
> Source file(s): `src/old/workorders.cfm`, `src/old/includes/wo_functions.cfm`

## S001-01 Header Section

### S001-01-F001 Company Logo Display
- Displays the company logo in the top-left corner
- Logo is loaded from `/images/logo.png`
- Fixed width: 150px

### S001-01-F002 User Greeting
- Shows "Welcome, {username}" text
- Username pulled from session variable `SESSION.username`
<!-- NOTE: This feature may not be needed in WebUIProd since we have a global navbar -->

## S001-02 Work Order List

### S001-02-F001 Work Order Table
- Displays all open work orders for the current shift
- Columns: WO Number, Product, Qty Required, Qty Produced, Status
- Sorted by WO Number ascending by default
- Data source: stored procedure `sp_GetWorkOrders`

### S001-02-F002 Row Selection
- Clicking a row highlights it and loads details below
- Only one row can be selected at a time
- Selected row has a blue background
<!-- NOTE: On touchscreen, rows need to be large enough for finger taps -->

## S001-03 Detail Panel

### S001-03-F001 Quantity Entry Form
- Input field for entering produced quantity
- Numeric keyboard should appear on touch devices
- Submit button saves to database via `saveQuantity.cfm`
- Validation: quantity must be > 0 and <= remaining quantity
```

## Coding Scheme

| Level   | Code Format | Example       | Description                          |
|---------|-------------|---------------|--------------------------------------|
| Screen  | `SXXX`      | `S001`        | One per .cfm page/screen             |
| Section | `-XX`       | `S001-01`     | Appended to screen code, one per H2  |
| Feature | `FXXX`      | `S001-01-F001`| Unique within the screen             |

Feature codes (`FXXX`) are globally unique within a screen file. They reset per screen — 
so `S001-01-F001` and `S002-01-F001` are different features.

## Obsidian Wikilinks

Use `[[wikilinks]]` to connect related items:

- Link between screens: `This table is also used in [[S003-InventoryCheck]]`
- Link to TODO items: `Migration tracked in [[MIGRATION_TODO#S001-02-F001]]`
- Link between features: `Depends on [[S001-01-F002|User Greeting]] for session data`

## Inline Comments

Users add observations using HTML comments that won't render in Obsidian preview but are 
visible in edit mode:

```markdown
<!-- NOTE: This is a user observation about the feature -->
<!-- TODO: Clarify whether this feature is still needed -->
<!-- ISSUE: The old code has a bug here where quantities can go negative -->
```

Comment prefixes:
- `NOTE:` — general observation or context
- `TODO:` — something that needs clarification before migration
- `ISSUE:` — known bug or problem in the old code

## README.md (Vault Index)

```markdown
# SOURCE_FEATURES

Feature inventory for WebUI → WebUIProd migration.

## Screens

| Code | Screen | Features | Status |
|------|--------|----------|--------|
| [[S001-WorkOrders]] | Work Orders | 12 | Documented |
| [[S002-ProductionEntry]] | Production Entry | 8 | In Progress |
| [[S003-InventoryCheck]] | Inventory Check | 6 | Not Started |

## Statistics
- Total screens: 3
- Total features: 26
- Documented: 12
- Pending: 14
```
