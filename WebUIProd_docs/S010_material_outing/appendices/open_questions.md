# Appendix: Open Questions

## OQ1: `Nba_Sp_Insert_Sortie_Materiel` definition not in repo

**Status:** Unresolved

**Description:** This SP creates the SORTIEMATERIEL header and initial TRANSAC row. It is called from `InsertSortieMateriel:2289` but its definition is not in any .sql file in the repo.

**Impact:** Low — we call it as a black box with the same parameters as the old software.

---

## OQ2: `Nba_Execute_Ceiling` logic

**Status:** Unresolved

**Description:** Called inside `Nba_Sp_Sortie_Materiel:510-511`. Determines whether to apply ceiling rounding per inventory item. The decision logic (per-item flag? always? VCUT-specific?) is unknown.

**Impact:** Low — the SP handles it internally. We must NOT implement ceiling in application code.

---

## OQ3: `EXECUTE_TRANSACTION SM REPORT` internals

**Status:** Unresolved

**Description:** Posts an SM as a committed inventory movement. Called via AutofabAPI SOAP (`QuestionnaireSortie.cfc:1743`). Internal logic is a black box.

**Impact:** Low — we call it with the same SMSEQ parameter.

---

## OQ4: SORTIEMATERIEL table schema

**Status:** Partially resolved

**Description:** Columns observed from code usage: `SMSEQ` (PK), `SMNOTRANS` (char 9), `SMQTEPRODUIT` (float), `SMITEM`, `SMNOORIGINE`, `SMDATE`, `SMHEURE`, `SMNOSERIE`, `SMNORELACHE`. Full DDL not in repo.

---

## OQ5: `calculeQteSM` vs `calculeQteSMQS` — which to use in new corrections screen?

**Status:** Resolved

**Description:** The corrections screen uses `calculeQteSM` (non-QS variant, `SortieMateriel.cfc:719`). This variant is read-only — it computes new quantities and returns them as JSON arrays, letting the JS update hidden fields. The QS variant (`calculeQteSMQS:824`) writes to the database directly.

**Resolution:** For the corrections screen, use the non-QS logic: compute SM quantities on the server, return them to the client, update hidden fields, and let `CorrigeProduction` handle the actual DB writes via `Nba_Corrige_Quantite_Transaction`.

---

## OQ6: `support.ConstruitDonneesLocales` struct contents

**Status:** Unresolved

**Description:** Called at `SortieMateriel.cfc:1722-1731` to build a `Donnees` struct with fields like `TRITEM`, `CONOTRANS`, `Operation_Seq`, `NISTR_NIVEAU`, `TRNORELACHE`. These are passed to `Nba_Sp_Insert_Sortie_Materiel` and `Nba_Sp_Sortie_Materiel`.

**Impact:** Medium — need to understand what values this struct carries for SM creation. The existing `server/api.cjs` implementation may already handle this.
