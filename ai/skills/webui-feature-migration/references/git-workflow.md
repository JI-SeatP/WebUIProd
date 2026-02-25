# Git Workflow

Commit and branching strategy for the WebUI → WebUIProd migration. Commits map 1:1 to 
feature codes for full traceability.

## Branching Strategy

```
main
 └── feature/S001-work-orders        ← one branch per screen
      ├── commit: feat(S001-01-F001)
      ├── commit: test(S001-01-F001)
      ├── commit: feat(S001-01-F002)
      ├── commit: test(S001-01-F002)
      └── ... all features for S001
 └── feature/S002-production-entry
      └── ...
```

**Branch naming:** `feature/S{NNN}-{screen-name-kebab-case}`

Examples:
- `feature/S001-work-orders`
- `feature/S002-production-entry`
- `feature/S003-inventory-check`

### Branch Lifecycle

1. Create branch from `main` when starting work on a screen
2. Develop all features for that screen on the branch
3. When all features in the screen are `Completed` → merge to `main`
4. Delete the feature branch after merge

## Commit Message Convention

Format: `{type}({feature-code}): {description}`

### Types

| Type | When | Example |
|------|------|---------|
| `feat` | New feature implemented | `feat(S001-02-F001): implement Work Order Table` |
| `test` | Tests written/passing | `test(S001-02-F001): add tests for Work Order Table` |
| `fix` | Bug fix | `fix(BUG-003): fix negative quantity validation` |
| `refactor` | Code restructure, no behavior change | `refactor(S001-02-F001): extract row component` |
| `style` | Formatting, CSS, layout tweaks | `style(S001-02-F001): adjust column widths` |
| `chore` | Config, deps, non-feature work | `chore: add vitest config` |
| `docs` | Documentation changes | `docs(S001): document Work Orders features` |

### Rules

- Feature code in parentheses is **required** for `feat`, `test`, `fix`, `refactor`, `style`
- Bug fixes reference `BUG-XXX` code, not the feature code
- Description is lowercase, imperative mood, no period at end
- Keep descriptions under 72 characters

## Automatic Commit Points

Claude commits automatically at these milestones during the migration workflow:

### Phase 1: Document
```
docs(S001): document Work Orders features
```
Triggered when: feature documentation is complete for a screen.

### Phase 2: Plan
```
docs: create migration TODO for S001
```
Triggered when: TODO entries are created for a screen.

### Phase 3: Execute — per feature
```
feat(S001-02-F001): implement Work Order Table
```
Triggered when: a feature's component code is written and ready for testing.

### Phase 4: Test — per feature
```
test(S001-02-F001): add tests for Work Order Table
```
Triggered when: tests are written and passing for a feature.

### Bug Fixes
```
fix(BUG-003): fix negative quantity validation
test(S001-03-F001): re-run tests after BUG-003 fix
```
Triggered when: a bug is fixed and tests pass again. Two commits — one for the fix, 
one for the updated/passing tests.

### ColdFusion Endpoints
```
feat(S001-02-F001): add getWorkOrders.cfm endpoint
```
Triggered when: a new `.cfm` endpoint is created. Use the feature code it serves.

## Commit Workflow Commands

Claude runs these automatically at each commit point:

```bash
# Stage relevant files
git add src/features/work-orders/WorkOrderTable.tsx
git add src/features/work-orders/WorkOrderTable.test.tsx
git add src/constants/widths.ts

# Commit with conventional message
git commit -m "feat(S001-02-F001): implement Work Order Table"
```

### What Gets Staged

Be selective — only stage files related to the current feature:

| Commit Type | Files to Stage |
|-------------|---------------|
| `feat` | Component files, hooks, types, width constants, API functions |
| `test` | `.test.tsx` files, test mocks, test utilities |
| `fix` | Changed component/test files |
| `docs` | Markdown files in `docs/` |
| `chore` | Config files (`vite.config.ts`, `vitest.config.ts`, `package.json`) |

Never stage unrelated work-in-progress files. If unsure, use `git status` and 
`git diff --staged` before committing.

## Initial Setup Commits

Before migration work begins, the project setup gets its own commits:

```bash
git init
git add .
git commit -m "chore: initialize Vite + React + TypeScript project"

# After adding shadcn/ui, Tailwind, Vitest
git add .
git commit -m "chore: add shadcn/ui, Tailwind, and Vitest configuration"

# After creating folder structure and shared components
git add .
git commit -m "chore: create project folder structure and shared components"
```

## Example: Full Feature Lifecycle in Git

```bash
# 1. Start screen branch
git checkout -b feature/S001-work-orders

# 2. Document features
# ... Claude analyzes old code and creates docs ...
git add docs/SOURCE_FEATURES/S001-WorkOrders.md
git commit -m "docs(S001): document Work Orders features"

# 3. Create TODO entries
git add docs/MIGRATION_TODO.md
git commit -m "docs: create migration TODO for S001"

# 4. Build feature S001-02-F001
# ... Claude implements the component ...
git add src/features/work-orders/WorkOrderTable.tsx src/constants/widths.ts src/api/workOrders.ts
git commit -m "feat(S001-02-F001): implement Work Order Table"

# 5. Write and run tests
# ... Claude writes tests, tests pass ...
git add src/features/work-orders/WorkOrderTable.test.tsx
git commit -m "test(S001-02-F001): add tests for Work Order Table"

# 6. User approves → update TODO
git add docs/MIGRATION_TODO.md
git commit -m "docs(S001-02-F001): mark as completed"

# ... repeat for all features in S001 ...

# 7. All S001 features complete → merge
git checkout main
git merge feature/S001-work-orders
git branch -d feature/S001-work-orders
```
