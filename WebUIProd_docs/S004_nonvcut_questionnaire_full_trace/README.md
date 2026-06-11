# CodeAudit — Non-VCUT Production Questionnaire: Full Client+Server Trace & Parity Proof

**Feature label:** Non-VCUT production questionnaire (S004) — complete client+server execution trace
of the OLD software including the JS orchestration layer, every CFC function's parameters and
query/SP sequence, and an exact comparison against the new implementation flagging every divergence.

**Resolved feature folder:** `S004_nonvcut_questionnaire_full_trace` (under `WebUIProd_docs/`, the
project vault — the former `docs/` root was renamed).

## Summary (evidence-grounded)
The old questionnaire is orchestrated by generated client-side JS (`sp_js.cfm`) holding session state
in DOM hidden inputs (`ListeSMSEQ/ListeTJSEQ` start empty every open; `SMNOTRANS` seeded from DB).
Status mutation happens BEFORE the questionnaire (ajouteModifieStatut); submit (ModifieTEMPSPROD)
only finalizes and posts; cancel (retireQuestionnaireSortie) reverts the status change. The SM chain
(ajouteSM → calculeQteSMQS) is gated by `UtiliseInventaire` and by Mode='Mod' session semantics.
Three SM stored procedures are encrypted — parity is proven at exact-invocation level.

## Audit status — COMPLETE
- [x] 00_scope_and_entrypoints
- [x] 01_state_model
- [x] 02_triggers_and_inputs
- [x] 03_execution_paths
- [x] 04_database_interactions
- [x] 05_outputs_and_side_effects
- [x] 06_edge_cases_and_failure_modes
- [x] 07_porting_invariants
- [x] **08_parity_comparison ← START HERE** (divergence matrix + required fixes FIX-1…FIX-12)
- [x] appendices (file_index, database_object_index, open_questions)

## Verdict
- ~85% of the behavior surface is **proven equivalent** (08 ✅ rows), including everything fixed in
  the earlier parity pass (cancel, stop causes, submit structure, defects, REPORT shapes).
- **12 divergences remain**, each with file:line evidence and a concrete fix (08 §Required fixes).
  Highest impact: recalc session-gating (FIX-3), auto STOP→COMP flip (FIX-9), stop-row
  TJNOTE/CNOMENCOP write (FIX-6), legacy NOPQTERESTE formula (FIX-8 — user decision), finished-products
  EPF flow (FIX-5 — feature gap, now fully specified).
- **3 unresolved items** (U-1..U-3, appendices/open_questions.md) — none assumed; each has a stated
  empirical test or an explicit unknowability boundary (encrypted SPs).

## Method note
Four parallel read-only evidence agents (JS layer / in-questionnaire functions / lifecycle functions /
new implementation) + direct-read arbitration of every inter-agent contradiction (two found, both
resolved by source reads and recorded in open_questions.md).
