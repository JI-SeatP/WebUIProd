# Open Questions / Contradictions

## U-1 — Liveness of the "[FIX-SMQTE]" header-sync block (SortieMateriel.cfc:1999-2012)
- Agent-2 reported it as live ("always executed").
- Direct read: the block sits between `<!--- Debut de Masquer ce code qui met a jour det-trans`
  (SM:1974) and `FIN de MASQUER pour mise a jour de DET_TRANS--->` (SM:2250). CFML comments nest,
  and the Masquer/FIN pairing is explicit ⇒ the whole range, including [FIX-SMQTE], is DEAD.
- Confidence: Strong inference (language behavior + explicit pairing). Empirical disproof test:
  SQL-profile the old software during an update-path Good-qty OK — a direct
  `UPDATE SORTIEMATERIEL SET SMQTEPRODUIT` outside the SP would mean the block is live.
- Current new implementation matches the DEAD interpretation.

## U-2 — Old defect-REMOVE fires the SM chain even when AvecSM=0 (sp_js.cfm:1374)
Would old `ajouteSM` create an SM for a non-inventory operation in that path? `ajouteSM` has no
UtiliseInventaire gate server-side. Untested empirically. New implementation gates the chain; if the
old behavior must be mirrored exactly, test on the old software first.

## U-3 — Encrypted stored procedures
`Nba_Sp_Insert_Sortie_Materiel`, `Nba_Sp_Sortie_Materiel`, `Nba_Insert_Det_Trans_Avec_Contenant`,
`Nba_Sp_Update_Production`, `Nba_Sp_Insert_Production`, `Nba_Update_ProduitEnCours`,
`Nba_SP_Kpi_Insert_Valeur_Operation_Reel`: `OBJECT_DEFINITION()` returns NULL (encrypted).
Parity is asserted at exact-invocation level (verbatim params verified; signatures verified via
`sys.parameters` for the three SM-related SPs). Internal behavior (e.g., whether Sortie-SP wipes or
upserts DET_TRANS lines, what SM/REPORT does inside AutoFab) is unknowable from this repository.

## Contradiction record — cancel ListeTJSEQ loop gating
Agent-3 reported the deletion loop "always executes for non-VCUT". Direct read of QS:398-425 shows
the body is gated `<cfif local.IsVCUT AND Val(CeTJSEQ) NEQ Val(local.KeepTJSEQ)>`. Direct read wins:
the loop is VCUT-only. New implementation matches.

## Contradiction record — `verifieStatutSortie` TJNOTE filter
Agent-2 quoted `AND TJNOTE = 'Ecran de production pour Temps prod'` (exact equality) in
`trouveDernierStatut` (QS:2306), while other lookups use `LIKE '...%'`. Rows created by the NEW stack
carry `'...Temps prod New'` — under exact equality the old gating query would MISS new-stack rows.
Affects only mixed old/new usage on the same DB; flag when implementing FIX-4.

## Minor unresolved
- `AjouteEPF` two-step EPFDETAIL INS (DtrSeq=0 then -1): server-side AutoFab semantics opaque; replicate
  invocation order verbatim when implementing FIX-5.
- Old `ouvrirModaleZero` confirm fires for every submit (F1) — product decision whether to mirror.
- `MODEPROD=1 ≡ MPCODE='Prod'` assumed from usage; verify constant in MODEPROD table before relying
  further (both stacks currently consistent with each other).
