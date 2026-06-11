# 01 — State Model

## Old software: state lives in the DOM, not in JS variables (Direct)

Rendered fresh on EVERY questionnaire open by `afficheTableauQuestionnaire`:

| Field | Seed | Evidence |
|---|---|---|
| `ListeTJSEQ` hidden input | `""` (static) | QS:127 |
| `ListeSMSEQ` hidden input | `""` (static) | QS:128 |
| `ListeEPFSEQ` hidden input | `""` (rendered by ProduitFini section when ENTREPF=1) | PF/afficheListeProduitFiniQS |
| `SMNOTRANS` hidden input | **`TEMPSPROD.SMNOTRANS` from DB** (may be stale from prior session) | SM:512 |
| `TJSEQ` (per-handler literal) | `LeTJSEQ` returned by `ajouteModifieStatut` (the new STOP/COMP row) | JS:1038-1046, QS:1630-1634 |
| `AvecSM` / `UtiliseInventaire` | server-computed, baked into inline onclick args | QD:525, PF:546 |

### Mutations (all in Ajax success callbacks — Direct)
- `ListeSMSEQ` ← ajouteSM response (JS:1770)
- `ListeEPFSEQ`/`ListeTJSEQ` ← AjouteEPF response (JS:1600-1601)
- `SMNOTRANS` DOM input ← only when `afficheListeSortieMaterielQS` re-renders the SM section
  (the fresh value lives in local var `NouvSMNOTRANS` until then — JS:1772; gap documented in 06)
- OK button state ← `verifieStatutSortie` response (JS:1864-1872)

### Mode derivation (critical)
`Mode` is recomputed on every JS `calculeQteSMQS` call: `ListeSMSEQ == '' ? 'Ajoute' : 'Mod'`
(JS:1752, Direct), and the server function is a NO-OP unless `Mode='Mod'` (SM:846-848, Direct).
⇒ DET_TRANS recalc executes only from the **second SM-touch of the session** onward.

## Database state machine (rows of TEMPSPROD per operation)

```
READY ──changeStatut──▶ PROD row (open; SMNOTRANS='')
PROD ──good-qty OK──▶ same row: TJQTEPROD/TJQTEDEFECT written; SM created/updated; SMNOTRANS linked
PROD ──STOP/COMP button──▶ PROD row closed (Nba_Sp_Update_Production, SMNOTRANS propagated)
                            + new STOP/COMP row inserted (no SMNOTRANS) ── questionnaire opens on it
questionnaire SUBMIT ──▶ qtys/causes/costs finalized; SM/EPF posted (REPORT → TRPOSTER=1)
questionnaire CANCEL ──▶ STOP/COMP row DELETED; SM chain DELETED; PROD row RESET (reopened)
```

Controlling flags: `MODEPROD`/`MODEPROD_MPCODE` (1='Prod', 8=STOP), `TJPROD_TERMINE`, `TJFINDATE`,
`SMNOTRANS`, `ENTRERPRODFINI_PFNOTRANS`, `TRPOSTER` (on SM TRANSAC lines, set by REPORT posting),
`PFPOSTER` (EPF), `PL_RESULTAT.PR_DEBUTE/PR_TERMINE`, `cNOMENCOP.NOPQTE*`.

### SMNOTRANS clearing sites (resolves the observed link decay — Direct)
1. `retireQuestionnaireSortie` SM-cleanup: `UPDATE TEMPSPROD SET SMNOTRANS='' WHERE SMNOTRANS=<v>`
   — **no TJSEQ filter** (QS:515-517) → clears historical rows too.
2. Reset of surviving PROD row (QS:580-588).
3. Display-time zero-qty cleanup: broad clear scoped TRANSAC+CNOMENCOP (SM:368-394; verified directly)
   + `SM/DEL` only when SM has zero DET_TRANS lines (timing guard SM:336-347).
4. ajouteSM orphan check (SM:1881-1905).
5. verifieStatutSortie zero-qty branch (QS:2430-2471): SM/DEL + `SET SMNOTRANS='', qtys=0` on TJSEQ.

## New implementation state
React state on `QuestionnairePage` (fresh per mount): `smnotrans`, `smseq`, `smMaterials`,
`containerOptions`, `savedDefects`, `vcutListeSmseq` (session SM list — also used non-VCUT for cancel),
plus URL params `tjseq` (stop row), `nopseq`, `copmachine`. PQTT handoff seeds employee/goodQty once.
Equivalences and gaps: see `08_parity_comparison.md` rows A3-A5, B14.
