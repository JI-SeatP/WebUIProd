# S010 - Material Outing (Sortie de Matériel) — Audit

**Feature label:** Material Outing (Sortie de Matériel / SortieMateriel)
**Resolved folder:** `S010_material_outing`
**Primary source:** `src/old/EcransSeatPly/cfc/SortieMateriel.cfc`
**Audit date:** 2026-03-27
**Related audit:** [S010 Corrections Screen](../S010_corrections_screen/)

## Feature summary

Material Outing manages the creation, display, recalculation, and correction of raw material withdrawals (SM — Sortie de Matériel) linked to production time entries. When a worker records production quantities, the system automatically computes how much raw material should be consumed based on BOM ratios (`cNOMENCLATURE.NIQTE`). SM quantities are not user-editable — they are computed server-side from good + defect quantities × BOM ratio, and the stored procedure `Nba_Sp_Sortie_Materiel` handles the actual inventory movement (creating TRANSAC + DET_TRANS rows per BOM line and stock lot). VCUT operations use a special MAX-based batch quantity computation instead of per-TJSEQ SUM.

## Audit status

| Section | Status |
|---------|--------|
| 00 Scope & Entrypoints | Complete |
| 01 State Model | Complete |
| 02 Triggers & Inputs | Complete |
| 03 Execution Paths | Complete |
| 04 Database Interactions | Complete |
| 05 Outputs & Side Effects | Complete |
| 06 Edge Cases & Failure Modes | Complete |
| 07 Porting Invariants | Complete |
| Appendix: File Index | Complete |
| Appendix: DB Object Index | Complete |
| Appendix: Open Questions | Complete |

## Quick links

- [00 Scope & Entrypoints](00_scope_and_entrypoints.md)
- [01 State Model](01_state_model.md)
- [02 Triggers & Inputs](02_triggers_and_inputs.md)
- [03 Execution Paths](03_execution_paths.md)
- [04 Database Interactions](04_database_interactions.md)
- [05 Outputs & Side Effects](05_outputs_and_side_effects.md)
- [06 Edge Cases & Failure Modes](06_edge_cases_and_failure_modes.md)
- [07 Porting Invariants](07_porting_invariants.md)
- [Appendix: File Index](appendices/file_index.md)
- [Appendix: DB Object Index](appendices/database_object_index.md)
- [Appendix: Open Questions](appendices/open_questions.md)

## Key decisions

1. **Replicate exact old software logic** — SM quantities are computed server-side, not user-editable
2. **VCUT uses MAX-based batch computation**, not per-TJSEQ SUM
3. **Ceiling rounding is handled inside the SP** via `Nba_Execute_Ceiling`, not in application code
4. **SM corrections go through `Nba_Corrige_Quantite_Transaction`** (same SP as EPF corrections)
