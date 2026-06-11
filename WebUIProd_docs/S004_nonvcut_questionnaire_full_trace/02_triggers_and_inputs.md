# 02 — Triggers and Input Contracts

All old calls go to `<CheminCFC><Component>.cfc?method=<fn>&...` (GET unless noted). Args below are
verbatim from the JS construction sites.

## changeStatut → ajouteModifieStatut (GET) — JS:1027
`Statut, TRANSAC, COPMACHINE, NOPSEQ, Langue` → returns JSON `{LeTJSEQ, MODEPROD_MPCODE}`.

## Good-qty OK (UtiliseInventaire=1) → JS calculeQteSMQS — QB:126
`(TRANSAC, COPMACHINE, NOPSEQ, Langue, Statut, TJSEQ, SMNOTRANS_seed, '', '', '', '', '', 'Mod')`
— qty args empty; **JS re-reads DOM** (`DTRQTEBONNEQS` etc., JS:1707-1711); Mode overridden JS:1752.
Chain: server `ajouteSM` → server `calculeQteSMQS` → `verifieStatutSortie` + `afficheListeSortieMaterielQS`.

### server ajouteSM signature (SM:1514-1527)
`TRANSAC, COPMACHINE, NOPSEQ, TJSEQ, Statut, Langue, QteBonne, QteDefectueux, SMNOTRANS, ListeTJSEQ,
Inventaire="0", ListeSMSEQ` → returns `{ListeSMSEQ, SMNOTRANS, Erreur}`.
Note: `Inventaire` is **always "0"** from this chain ⇒ create-path NIQTE gate never fires (B9).

### server calculeQteSMQS signature (SM:824-838)
`..., QteBonne, QteDefectueux, QteBonneOrigine, QteDefectueuxOrigine, SMNOTRANS, ListeTJSEQ, ListeSMSEQ,
Mode` → `{ListeDTRSEQ[], ListeQteSM[], Erreur}`; NO-OP unless Mode='Mod'.

## Defect add/edit → AjouteModifieDetailDEFECTQS (GET) — QD:525-544, JS:1382
`Statut, TJSEQ, DDSEQ(0=new), TRANSAC, COPMACHINE, NOPSEQ, Position, SMNOTRANS, AvecSM`; server args:
`TRANSAC, COPMACHINE, NOPSEQ, TJSEQ, Langue, DDSEQ, Qte="0", Raison="0", Note=""` → returns LeTJSEQ.
Chaining: re-render defect table; if `AvecSM==1` → +500ms calculeQteSMQS('Mod'); verifieStatutSortie
immediately (JS:1409-1416).

## Defect remove → retireDetailDEFECTQS (GET) — JS:1364-1380
server args `DDSEQ, Langue`; chain: re-render; +500ms calculeQteSMQS **unconditional** (JS:1374).

## EPF add → AjouteEPF (GET) — JS:1562, PF:1311-1324
`TRANSAC, COPMACHINE, NOPSEQ, TJSEQ, Statut, Langue, Qte, Contenant="0", Inventaire_P, ListeEPFSEQ,
ListeTJSEQ, NISEQ, ListeSMSEQ` → returns `{ListeEPFSEQ, ListeTJSEQ, TJSEQEPF}`; proceeds only Qte>0.

## SKID change → CorrigeDetailSM (GET) — SM:1467-1477
`TRANSAC, COPMACHINE, NOPSEQ, TJSEQ, Statut, Langue, DTRSEQ, ContenantSM, EntrepotSM, Type("Contenant"|"Entrepot")`.

## OK-button regating → verifieStatutSortie (POST) — JS:1811-1842
12 args; **all qty/list args overridden from DOM** (JS:1813-1839). Returns
`{BoutonOK, LaClasse, Etat, Message}` → DOM writes JS:1864-1872.

## Submit → ModifieTEMPSPROD (POST + FormData of FormQuestionnaireSortie) — JS:1969-1983
Query: `TJSEQ, QteBonne, QteDefectueux, Statut, Note, TRANSAC, COPMACHINE, NOPSEQ, ListeEPFSEQ,
ListeTJSEQ, [SMNOTRANS — BROKEN: '&SMNOTRANS+' typo JS:1970 ⇒ server default ""], ListeSMSEQ`.
FormData carries `EmployeQS_<TJSEQ>`, `QA_CAUSEP_0`, `QA_CAUSES_0`, `EXTPRD_NOTE_0` (QS:620-642).
Always preceded by `ouvrirModaleZero` confirm modal (JS:2980; zero and non-zero alike).

## Cancel → RetireQuestionnaireSortie (GET) — JS:1326-1336
`TJSEQ, ListeEPFSEQ, ListeTJSEQ, TRANSAC, COPMACHINE, NOPSEQ, Langue, Statut, SMNOTRANS, ListeSMSEQ`
(all list values read from DOM at click time).

## New implementation payloads
Documented per-endpoint in `08_parity_comparison.md` and agent-4 trace (appendices/file_index links);
key fields: `stopTjseq` (replaces old TJSEQ arg), `employeeName` (replaces session.NOMEMPLOYE),
`smnotrans`, `listeSmseq` (session SM accumulation).
