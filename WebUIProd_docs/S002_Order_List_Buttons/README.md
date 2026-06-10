# CodeAudit: Order List Buttons

- **Feature label:** Order List Buttons
- **Feature folder:** `S002_Order_List_Buttons`
- **Screen:** S002 - Work Order List (DivPrincipal)
- **Audit date:** 2026-03-31

## Summary

The S002 Work Order List table renders 4 interactive buttons per row in `Tableau_principal.cfm`. Two are always visible (Consult and Details), one is conditionally visible based on order status (Go/OK), and one is restricted to cell chief roles with additional state conditions (Transfer). Each button triggers a distinct JavaScript function that makes an AJAX call to a ColdFusion CFC method. The Consult and Go buttons share the same JS function (`afficheDiv`) and backend endpoint but differ in the `Type` parameter, which controls whether the destination screen's footer status buttons are read-only or active.

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

## Major Unresolved Questions

1. What does department 10 (`DESEQ = 10`) represent, and why is it excluded from transfer button visibility?
2. The `LePret` query (`trouvePret` from `VDET_COMM`) is commented out — was it disabled intentionally or temporarily? If re-enabled, it would gate both the Go button and Transfer button.
3. `Filtre12` and `Filtre13` are sent in the `afficheDiv` AJAX call but have no corresponding `cfargument` in `operation.cfc:afficheDiv` — are they silently ignored or handled elsewhere?
