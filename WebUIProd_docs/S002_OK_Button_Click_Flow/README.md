# CodeAudit: OK Button Click Flow (Go to DivOperation)

- **Feature label:** OK Button Click Flow (Go to DivOperation)
- **Feature folder:** `S002_OK_Button_Click_Flow`
- **Screen:** S002 - Work Order List (DivPrincipal) → S003 - Operation Details (DivOperation)
- **Audit date:** 2026-03-31

## Summary

When the user taps the OK button on a work order row, the old ColdFusion software calls `afficheDiv('DivOperation', TRANSAC, 'Go', COPMACHINE, NOPSEQ, ...)` which loads the operation detail screen with active status-change buttons. The critical design: when `COPMACHINE=0` (operation not yet assigned to a machine schedule), all queries conditionally **skip the COPMACHINE filter** and resolve the operation by TRANSAC + NOPSEQ alone. This allows orders that haven't started production to be opened normally.

The new React migration has **3 bugs** that break this flow for unstarted orders:

1. **Wrong datasource** — `getOperation.cfm` Step 1 queries `vEcransProduction` on `datasourcePrimary` instead of `datasourceExt`
2. **TJSEQ=0 rejection** — Step 1 rejects orders with no TEMPSPROD record (TJSEQ is NULL for unstarted orders, `Val(NULL)=0`)
3. **INNER JOIN TEMPSPROD** — Step 2 uses `INNER JOIN` instead of `LEFT JOIN` / `OUTER APPLY`, excluding unstarted orders entirely

## Audit Status

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

## Quick Links

- [00 - Scope & Entrypoints](00_scope_and_entrypoints.md)
- [01 - State Model](01_state_model.md)
- [02 - Triggers & Inputs](02_triggers_and_inputs.md)
- [03 - Execution Paths](03_execution_paths.md)
- [04 - Database Interactions](04_database_interactions.md)
- [05 - Outputs & Side Effects](05_outputs_and_side_effects.md)
- [06 - Edge Cases & Failure Modes](06_edge_cases_and_failure_modes.md)
- [07 - Porting Invariants](07_porting_invariants.md)
- [Appendix: File Index](appendices/file_index.md)
- [Appendix: Database Object Index](appendices/database_object_index.md)
- [Appendix: Open Questions](appendices/open_questions.md)

## Root Cause of Current Bug

The user reports: clicking Go on order CO-016923-002 shows `Operation not found for transac=1068109 copmachine=0`.

**The order has not started production yet** — there is no `TEMPSPROD` record (TJSEQ is NULL). The old software handles this gracefully; the new code does not.

See [06_edge_cases_and_failure_modes.md](06_edge_cases_and_failure_modes.md) for the full bug analysis.
