# 05 — Outputs and Side Effects

## Return contracts (old)
| Function | Returns |
|---|---|
| ajouteModifieStatut | JSON `{LeTJSEQ, MODEPROD_MPCODE}` (QS:1630-1634) |
| ajouteSM | JSON `{ListeSMSEQ, SMNOTRANS, Erreur[]}` |
| calculeQteSMQS | JSON `{ListeDTRSEQ[], ListeQteSM[], Erreur}` |
| AjouteModifieDetailDEFECTQS / retireDetailDEFECTQS | PLAIN TJSEQ string |
| CorrigeDetailSM | PLAIN Type string |
| verifieStatutSortie | JSON `{BoutonOK(html), LaClasse, Etat, Message}` |
| AjouteEPF | JSON `{ListeEPFSEQ, ListeTJSEQ, TJSEQEPF}` |
| ModifieTEMPSPROD | PLAIN string (ignored by JS) |
| retireQuestionnaireSortie | PLAIN args.TJSEQ |
| afficheListeSortieMaterielQS / afficheTableau* | rendered HTML |

## External side effects beyond the DB
- **AutoFab application posting**: SM/REPORT and EPF/REPORT hand the transactions to the AutoFab app
  (inventory consumption/cost posting). Observable DB markers: `TRPOSTER=1` on SM TRANSAC lines,
  `PFPOSTER` on EPF (Strong inference from data + flag usage; app internals out of repo).
- **SM/DEL**: AutoFab-side removal of an SM (zero-qty paths); accompanied by local TEMPSPROD clears.
- **Forklift tasks**: TRANSFENTREP rows consumed by the cariste screens (TREPOSTER=0 queue marker).
- No events/queues/caches otherwise; UI refresh is by HTML re-render (old) / state set (new).

## Side-effect ordering invariants (submit)
qtys/causes/costs (steps 1-5) → SM REPORT (6) → EPF cost+REPORT (7) → EnCours/KPI/cariste (8) →
cNOMENCOP totals (9) → auto-COMP flip (10). Posting (REPORT) precedes the totals/flip bookkeeping.

## New implementation response shapes
Documented per endpoint in agent-4 trace; key equivalences: ajouteSM returns
`{smnotrans, smseq, tjseq, materials[], containerOptions[], materialWarning}` — superset of old
(materials replace the old HTML re-render); defects endpoints return the full defect list (replaces
`afficheTableauDEFECTQS` re-render).
