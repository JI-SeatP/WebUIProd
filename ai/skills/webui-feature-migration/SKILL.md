---
name: webui-feature-migration
description: >
  Orchestrates the full migration of ColdFusion (.cfm) screens from the legacy WebUI to the new 
  WebUIProd (Vite + React + shadcn/ui + TypeScript) frontend. Covers four phases: (1) Analyze old 
  code and document features, (2) Plan migration order with trackable TODOs, (3) Execute migration 
  using sibling skills, (4) Test with Vitest and approve. Use this skill whenever the user mentions 
  migrating features, documenting screens, planning migration work, tracking migration progress, 
  analyzing old .cfm files, creating feature docs, updating TODO status, approving completed features, 
  or anything related to the WebUI → WebUIProd migration workflow. Even if the user just says 
  "let's work on the migration" or "what's next", trigger this skill.
---

# WebUI → WebUIProd Feature Migration

This skill manages the migration of legacy ColdFusion server-rendered pages into a modern 
React+TypeScript frontend. The old code lives in `src/old/` and consists of `.cfm` files with 
embedded HTML/CSS/JS. The new code is built with Vite + React + shadcn/ui + Tailwind + TypeScript.

## The Four Phases

### Git Workflow

Every phase produces commits. Claude commits automatically at defined milestones — 
after documenting features, after implementing a feature, after tests pass, after bug fixes.

**Read** `references/git-workflow.md` for the full branching strategy, commit message convention, 
and automatic commit points.

Key rules:
- One branch per screen: `feature/S{NNN}-{screen-name}`
- One commit per feature with code in the message: `feat(S001-02-F001): implement Work Order Table`
- Bug fixes use: `fix(BUG-003): description`
- Merge to `main` only when all features in a screen are `Completed`

### Phase 1: Analyze & Document

Scan the old `.cfm` codebase and produce an Obsidian-compatible feature inventory.

**Read** `references/code-analysis-guide.md` for how to scan and extract features from `.cfm` files.

**Read** `references/feature-documentation-format.md` for the exact file structure, coding scheme 
(screen codes, section codes, feature codes), Obsidian wikilink conventions, and inline comment syntax.

**Use** `assets/templates/screen-template.md` as the starting point for each screen document.

Output goes to `docs/SOURCE_FEATURES/` inside the project repo as an Obsidian vault.

### Phase 2: Plan

Create a migration TODO list that orders features logically (dependencies first, shared components 
first, high-impact screens first).

**Read** `references/todo-tracking-system.md` for the status flow, bug issue creation rules, 
and approval protocol.

**Use** `assets/templates/todo-template.md` as the starting point.

Output goes to `docs/MIGRATION_TODO.md`.

### Phase 3: Execute

For each feature in the plan, build the new React component/page. Create the screen branch 
before starting: `git checkout -b feature/S{NNN}-{screen-name}`

After each feature is implemented, commit: `feat(S001-XX-FXXX): implement {feature name}`

During execution, Claude should load the appropriate sibling skills:
- **`vite-react-shadcn`** — for component patterns, project structure, touch UI, Tailwind conventions
- **`coldfusion-api`** — when creating new `.cfm` endpoints for the React frontend to consume

The width constants convention is critical for this project — **read** `references/width-constants-convention.md` 
before building any table or layout component.

### Phase 4: Test & Approve

Every migrated feature must pass Vitest tests before it can be approved.

**Load the `vitest-testing` sibling skill** for testing patterns and the migration test checklist.

The approval flow:
1. Write tests for the migrated feature
2. Run tests — if they pass, commit tests: `test(S001-XX-FXXX): add tests for ...`
3. Mark the TODO item as `Testing Passed - Awaiting Approval`
4. Present results to user for manual confirmation
5. If user approves → mark as `Completed` in the TODO, commit: `docs(S001-XX-FXXX): mark as completed`
6. If tests fail → mark as `Test Not Passed`, create a bug issue TODO that references the source item
7. When bug is fixed → commit: `fix(BUG-XXX): description`, then re-run tests
8. The source TODO **cannot** be set to `Completed` until all linked bug issues are resolved

## Quick Reference: Status Flow

```
Not Started → In Progress → Testing → Testing Passed - Awaiting Approval → Completed
                                    ↘ Test Not Passed → [Bug Issue Created] → retested → Testing
```

## Key Conventions

- Screen codes: `S001`, `S002`, etc.
- Section codes: `-01`, `-02`, etc. (appended to screen code)
- Feature codes: `F001`, `F002`, etc.
- Full reference: `S001-01-F001` uniquely identifies any feature
- Obsidian `[[wikilinks]]` connect related features, screens, and TODOs
- Inline comments use `<!-- NOTE: observation here -->` for user-added details
- Width constants use the TS block pattern — see `references/width-constants-convention.md`
