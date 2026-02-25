# TODO Tracking System

This document defines the migration TODO list format, status flow, bug issue handling, 
and approval protocol.

## File Location

`docs/MIGRATION_TODO.md` — a single file tracking all migration work.

## Status Flow

```
Not Started 
  → In Progress 
    → Testing 
      → Testing Passed - Awaiting Approval 
        → Completed ✅
      → Test Not Passed ❌
        → [Bug Issue Created → linked back]
        → Fix applied → Testing (re-enter cycle)
```

### Status Definitions

| Status | Marker | Meaning |
|--------|--------|---------|
| Not Started | `[ ]` | Feature hasn't been worked on |
| In Progress | `[~]` | Currently being developed |
| Testing | `[T]` | Development done, tests being written/run |
| Testing Passed - Awaiting Approval | `[?]` | Tests pass, waiting for user to confirm |
| Completed | `[x]` | User approved, feature is done |
| Test Not Passed | `[!]` | Tests failed, bug issue created |

## TODO File Structure

```markdown
# MIGRATION TODO

> Last updated: 2026-02-24
> Progress: 3/26 features completed

## S001 - Work Orders

### S001-01 Header Section
- [ ] **S001-01-F001** Company Logo Display `Not Started`
- [x] **S001-01-F002** User Greeting `Completed` ✅

### S001-02 Work Order List
- [~] **S001-02-F001** Work Order Table `In Progress`
- [ ] **S001-02-F002** Row Selection `Not Started`
  - Depends on: S001-02-F001

### S001-03 Detail Panel
- [!] **S001-03-F001** Quantity Entry Form `Test Not Passed` ❌
  - Bug: [[#BUG-003]] Negative quantity not caught by validation

## S002 - Production Entry
...

---

## Bug Issues

### BUG-001
- **Source:** S001-02-F001 Work Order Table
- **Description:** Table doesn't sort correctly when WO numbers have mixed formats
- **Status:** `Open`
- **Blocking:** S001-02-F001 cannot be marked Completed

### BUG-003
- **Source:** S001-03-F001 Quantity Entry Form
- **Description:** Negative quantity not caught by validation
- **Status:** `Open`
- **Blocking:** S001-03-F001 cannot be marked Completed
```

## Rules

### Bug Issue Creation

When a test fails:

1. Mark the source TODO as `[!]` with status `Test Not Passed`
2. Create a new entry under `## Bug Issues` with:
   - Auto-incremented `BUG-XXX` ID
   - Reference to the source feature code
   - Description of the failure
   - Status: `Open`
   - Blocking note linking back to the source TODO
3. Add an inline reference on the source TODO: `Bug: [[#BUG-XXX]]`

### Completion Blocking Rule

A feature TODO **cannot** be set to `Completed` if it has any `Open` bug issues linked to it. 
The flow is:

1. Fix the bug in code
2. Re-run the tests
3. If tests pass → close the bug issue (Status: `Resolved`)
4. Mark feature as `Testing Passed - Awaiting Approval`
5. User confirms → `Completed`

### Approval Protocol

When a feature reaches `Testing Passed - Awaiting Approval`:

1. Claude presents a summary: feature code, what was built, which tests passed
2. Claude asks: "Approve S001-02-F001 (Work Order Table) as completed?"
3. User responds with confirmation (e.g., "approved", "yes", "looks good")
4. Claude updates the TODO to `[x]` with `Completed` status
5. Claude updates the progress counter at the top of the file

### Dependency Tracking

If a feature depends on another, note it inline:

```markdown
- [ ] **S001-02-F002** Row Selection `Not Started`
  - Depends on: S001-02-F001
```

Features with unmet dependencies should not be started. When planning work order, 
resolve dependencies first.

## Migration Order Heuristics

When planning the migration order, prioritize:

1. **Shared components first** — layouts, navigation, auth wrappers
2. **Dependencies first** — if Feature B depends on A, do A first
3. **High-impact screens** — screens used most frequently by workers
4. **Simple screens before complex** — build momentum and establish patterns
5. **Data display before data entry** — read-only views are safer to ship first
