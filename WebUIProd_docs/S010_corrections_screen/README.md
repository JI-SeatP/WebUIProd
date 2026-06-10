# S010 - Corrections Screen (DivCorrection) — Audit

**Feature label:** S010 - Corrections Screen (DivCorrection)
**Resolved folder:** `S010_corrections_screen`
**Primary source:** `src/old/EcransSeatPly/cfc/CorrectionInventaire.cfc`
**Audit date:** 2026-03-27

## Feature summary

The Corrections Screen allows a production-floor operator to edit a previously-recorded TEMPSPROD (time-production) entry. From the DivTempsHomme (time-tracking) table, a per-row pencil button opens DivCorrection, which renders editable fields for start/end datetime, employee, operation, machine, good quantity, defect quantities (with reasons), finished-product quantities, and material-exit quantities. On submit, the ColdFusion backend calls up to four stored procedures via the AutofabAPI SOAP service to update DET_TRANS rows, recalculate costs, update the TEMPSPROD record, and cascade timing changes to the next TEMPSPROD row.

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

## Resolved questions (key decisions)

1. **Use SPs as-is** — Call `Nba_Corrige_Quantite_Transaction`, `Nba_Sp_Update_Production`, `Nba_Recalcul_Un_Produit_EnCours`, and `FctCalculTempsDeProduction` with exact same parameters as old software. No need to see internals.
2. **Use legacy multi-SP approach** — Do NOT use `Nba_Corrige_Production`. The React backend already uses the correct approach.
3. **Defects save independently** — Each defect row must be saved via its own API call immediately (not batched in CorrigeProduction). Current `submitCorrection.cfm` diverges here.
4. **EstVCUT is dead code in corrections** — Pass for logging but do NOT implement CF-level ceiling. The SP handles ceiling internally via `Nba_Execute_Ceiling`.
5. **Note uses " New" suffix** — Already applied in `server/api.cjs`.
6. **No Excel dictionary** — Use existing React i18n approach.

## Remaining open items

1. **Material outing codeaudit** — Separate `/codeaudit` in progress at `docs/S010_material_outing/`. Critical for understanding SM quantity computation logic.

## Migration status (React)

A partial React implementation already exists:
- **Types:** `src/types/corrections.ts` — matches the data model documented in this audit
- **Components:** `src/features/corrections/` — page + sub-components for each form section
- **API:** `src/api/corrections.ts` — fetch wrappers
- **Mocks:** `src/mocks/handlers/corrections.ts` — MSW mock handlers
- **Backend:** `server/api.cjs` — **both endpoints already implemented:**
  - `GET /getCorrection.cfm` (lines ~4261-4510) — returns TEMPSPROD + defects + EPF + SM + operations + machines
  - `POST /submitCorrection.cfm` (lines ~4512-4778) — replicates the legacy multi-SP approach (same 7-step flow as this audit documents), calling SPs directly via mssql instead of SOAP
