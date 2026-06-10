# S007 - Time Tracking Screen (DivTempsHomme) — CodeAudit

## Feature Label
S007 - Time Tracking Screen (DivTempsHomme)

## Resolved Feature Folder
`docs/S007_DivTempsHomme/`

## Feature Summary
The Time Tracking screen (`DivTempsHomme`) is a three-tab interface rendered by `operation.cfc::afficheTableauTempsHomme()`. It provides:
1. **Production Time (TempsProd)** — filterable table of production time records from `TEMPSPROD`, with inline status editing (COMP/STOP/PAUSE)
2. **Add Hours (AjoutEmploi)** — form to manually add/edit employee man-hours into `EMPLOYE_HEURES`, with shift-based date defaults
3. **Search (Recherche)** — filterable search of employee man-hours from `EMPLOYE_HEURES`

The screen is accessed via the stopwatch button in the header menu, which calls `afficheDiv('DivTempsHomme', ...)` on `operation.cfc`. All data rendering is server-side HTML generation returned as strings via AJAX.

## Audit Status
- **Phase 1 (Scope & Entrypoints):** Complete
- **Phase 2 (Section Decomposition):** Complete
- **Phase 3 (Evidence Research):** Complete
- **Phase 4 (Documentation):** Complete
- **Phase 5 (Cross-section Reconciliation):** Complete
- **Phase 6 (Final Audit Pass):** Complete

## Section Index
| # | Document | Purpose |
|---|----------|---------|
| 0 | [00_scope_and_entrypoints.md](00_scope_and_entrypoints.md) | Audit boundary, entrypoints, evidence map |
| 1 | [01_state_model.md](01_state_model.md) | State assembly, transitions, controlling entities |
| 2 | [02_triggers_and_inputs.md](02_triggers_and_inputs.md) | Input contracts, payloads, validation |
| 3 | [03_execution_paths.md](03_execution_paths.md) | Step-by-step execution traces per flow |
| 4 | [04_database_interactions.md](04_database_interactions.md) | All SQL reads and writes |
| 5 | [05_outputs_and_side_effects.md](05_outputs_and_side_effects.md) | Response shapes, side effects |
| 6 | [06_edge_cases_and_failure_modes.md](06_edge_cases_and_failure_modes.md) | Non-happy-path behavior |
| 7 | [07_porting_invariants.md](07_porting_invariants.md) | What must not change in a rewrite |
| A | [appendices/file_index.md](appendices/file_index.md) | All files and symbols inspected |
| B | [appendices/database_object_index.md](appendices/database_object_index.md) | All database objects |
| C | [appendices/open_questions.md](appendices/open_questions.md) | Unresolved questions |

## Major Unresolved Questions
1. SQL Server database triggers on `TEMPSPROD` — cannot be checked from application code alone. See [appendices/open_questions.md](appendices/open_questions.md) Q1.

## Resolved Since Initial Audit
All 9 original open questions have been resolved. Key findings:
- **Operation 11** = Material Outing (`OPCODEMAT_OUTING`) — intentionally excluded from display
- **`trouveEffort()`** = auto-fills effort rate from `MACHINE.MAEFFORTHOMME` when machine changes
- **COMP status change** from Prod Time tab does NOT trigger questionnaire — only the 4-column denormalized UPDATE
- **`ListeQteProduite`/`ListeQteDefect`** = partially implemented, never-finished VKI feature — safely omit
- **`modifieDonneesSession()`** = single-line CF session write (`session.InfoClient.{Item} = Valeur`), no DB
- **`AutoFAB_*`** = cross-database prefix for EXT→primary lookups, transparent across test/prod
- **Effort precision** = use consistent decimal format in rewrite
