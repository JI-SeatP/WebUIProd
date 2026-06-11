# 07 — Porting Invariants (must hold in the new stack)

**State/session**
- I1 Session lists (SM/TJ/EPF) start empty at every questionnaire open; never seeded from history.
- I2 A fresh session must never mutate a previous session's posted SM (old achieves this via
  display-time clears + DEL guard; new via TRPOSTER guard — equivalent outcomes, both documented).
- I3 The STOP/COMP row TJSEQ created by the status change is the explicit handle for submit
  (employee/causes/TJNOTE target) and cancel (row to delete).

**SM lifecycle**
- I4 TotalQte = QteBonne + QteDefectueux everywhere an SM quantity is passed.
- I5 Create = Insert-SP → Sortie-SP → robust TEMPSPROD update (CASE-WHEN-empty); Update = Sortie-SP only.
- I6 Insert-SP HEURE is 5-char `HH:nn`; CONOTRANS/SMNOTRANS always `LEFT(...,9)`; user strings
  `NOMEMPLOYE` LEFT 50; NISTR_NIVEAU LEFT 500.
- I7 DET_TRANS recalc runs only from the second SM-touch of the session (Mode='Mod' semantics);
  per-line: NIQTE via cNOMENCOP(INVENTAIRE_P=InvC)→cNOMENCLATURE; NouvelleQte=Abs(Total×NIQTE);
  Det_Trans-SP with the ROW's ENTREPOT/CONTENANT; TRANSAC 4-col update; zero-out when line missing.
- I8 No direct SORTIEMATERIEL/TRANSAC header writes on the non-VCUT path (masked block is dead);
  the SPs are authoritative for header totals.

**Defects**
- I9 Target row = latest MODEPROD=1 (+TJNOTE LIKE, fallback without); insert iff qty≠0; upsert by
  DDSEQ; TJQTEDEFECT=SUM after every change; SMQTEPRODUIT sync on REMOVE only.

**Submit**
- I10 Submit never closes/creates TEMPSPROD rows and never creates SMs; it only finalizes and posts.
- I11 REPORT params are the 13-slot Clarion shape (`SEQ;Date;Heure;'NOMEMPLOYE';...`); Clarion date =
  days since 1800-12-28, time = seconds-since-midnight×100.
- I12 SM REPORT loop sources rows from the DB (links on TEMPSPROD), not from client state.
- I13 Order: finalize → SM REPORT → EPF cost+REPORT → EnCours/KPI/cariste → cNOMENCOP totals → auto-flip.
- I14 Auto STOP→COMP flip sets MODEPROD FK + MPCODE + MPDESC_P/S + TJFINDATE + TJPROD_TERMINE (FIX-9).
- I15 cNOMENCOP totals use the LEGACY formula incl. RESTE=ΣTJQTEPROD (FIX-8 — user-mandated exactness).

**Cancel**
- I16 Delete the STOP/COMP row; re-find latest PROD row (no copmachine filter); unconditional SM-chain
  deletes incl. the broad SMNOTRANS='' clear; EPF cleanup; RESET (not delete) the PROD row.

**Incidental details that are NOT invariants** (do not replicate):
- the JS `'&SMNOTRANS+'` typo; the double-verifie race; the ×3 copy-pasted normalization block;
  HTML-rendering specifics; GET-vs-POST transport choices.
