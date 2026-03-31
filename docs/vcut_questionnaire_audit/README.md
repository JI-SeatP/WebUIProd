# VCUT Operation Questionnaire — CodeAudit

**Feature label:** VCUT operation questionnaire from the old software
**Resolved folder:** `vcut_questionnaire_audit`
**Audit date:** 2026-03-26
**Source of truth:** Legacy ColdFusion CFC files in `src/old/EcransSeatPly/cfc/`

## Feature summary

The VCUT questionnaire is a specialized exit form shown when a worker stops or completes a table-saw (veneer cutting) operation. Unlike standard operations which produce a single finished product, a VCUT operation cuts one parent "big sheet" into multiple child components. Each component gets its own TEMPSPROD row and EPF (finished product) transaction, created write-as-you-go via a per-component "+" button. Material output (SM) is shared across all components as a batch. The questionnaire suppresses the defect section, always shows material exit, skips cost recalculation, and uses a forced-quantity threshold (`QTE_FORCEE`) instead of the standard `DCQTE_A_FAB` for completion detection.

## Audit status

| Section | Status |
|---------|--------|
| Scope & entrypoints | Complete |
| State model | Complete |
| Triggers & inputs | Complete |
| Execution paths | Complete |
| Database interactions | Complete |
| Outputs & side effects | Complete |
| Edge cases & failure modes | Complete |
| Porting invariants | Complete |
| File index | Complete |
| Database object index | Complete |
| Open questions | Complete |

## Section links

- [00 — Scope and entrypoints](00_scope_and_entrypoints.md)
- [01 — State model](01_state_model.md)
- [02 — Triggers and inputs](02_triggers_and_inputs.md)
- [03 — Execution paths](03_execution_paths.md)
- [04 — Database interactions](04_database_interactions.md)
- [05 — Outputs and side effects](05_outputs_and_side_effects.md)
- [06 — Edge cases and failure modes](06_edge_cases_and_failure_modes.md)
- [07 — Porting invariants](07_porting_invariants.md)
- [Appendix: File index](appendices/file_index.md)
- [Appendix: Database object index](appendices/database_object_index.md)
- [Appendix: Open questions](appendices/open_questions.md)

## Major unresolved questions

1. **`FctSelectVar` internals** — The scalar function `DBO.AUTOFAB_FctSelectVar(TRSEQ, NOPSEQ, '@QTE_FORCE@')` resolves the forced quantity. Its internal table and keying logic are not source-controlled in this repo.
2. **INVENTAIRE_C = 10525 hardcode** — The VCUT completion path hardcodes this inventory sequence. Its origin and whether it varies by environment is unknown.
3. **`NO_INVENTAIRE` vs `PRODUIT_CODE` inconsistency** — The VCUT-complete block at `QuestionnaireSortie.cfc:1186` checks only `NO_INVENTAIRE`, not `PRODUIT_CODE`. Operations detected solely by `PRODUIT_CODE` would miss the VCUT-complete logic.

## Relationship to existing docs

This audit documents the **legacy ColdFusion execution logic** from the old software source files. The existing `docs/vcut/` folder documents the **new React migration** and partially-implemented `.cfm` endpoints. Where contradictions exist between the two, this audit's findings (traced line-by-line from CFC source) take precedence for understanding the old software's behavior. Specific contradictions are noted in [appendices/open_questions.md](appendices/open_questions.md).
