# 08 — Parity Comparison Matrix (old software vs new implementation)

Every behavioral element of the non-VCUT questionnaire, classified:

- ✅ **EQUIVALENT** — proven identical (or identical invocation of an encrypted SP)
- 🔧 **DIVERGENT** — differs; needs a fix (listed in "Required fixes" at the bottom)
- ⚠️ **DELIBERATE DEVIATION** — differs by design; equivalent outcome, rationale documented
- ❓ **UNRESOLVED** — cannot be proven from the repository; explicit follow-up listed

Old refs: `src/old/EcransSeatPly/...` — QS = `QuestionnaireSortie.cfc`, SM = `SortieMateriel.cfc`,
QD = `QteDefect.cfc`, QB = `QteBonne.cfc`, PF = `ProduitFini.cfc`, JS = `prive/multilangue/sp_js.cfm`.
New refs: `server/api.cjs` (API), `queries/*.cfm` (CFM), `src/features/questionnaire/...` (FE).

## A. Session open / state seeding

| # | Behavior | Old | New | Status |
|---|---|---|---|---|
| A1 | Status change (close PROD, insert STOP/COMP) happens BEFORE questionnaire opens | JS:1024-1067 → QS:1295-1635 | useStatusChange → /changeStatus.cfm | ✅ |
| A2 | New STOP/COMP row TJSEQ returned to client and carried through session | QS:1630-1634 → JS LeTJSEQ | changeStatus response `tjseq` → URL param → payloads | ✅ |
| A3 | Session lists start EMPTY every open (`ListeTJSEQ=""`, `ListeSMSEQ=""` hidden inputs) | QS:127-128 (static `value=""`) | React state `vcutListeSmseq=""` etc. on mount | ✅ |
| A4 | `SMNOTRANS` seeded from DB (`TEMPSPROD.SMNOTRANS`) at open via the SM display section | SM:512 hidden input | FE starts `smnotrans=""`; populated only after first ajouteSM | ⚠️ see D-1 |
| A5 | **Display-time zero-qty SM cleanup**: on rendering the SM section, if session total = 0 and a stale SM link exists → `SM/DEL` (only when SM has NO detail lines) + broad `UPDATE TEMPSPROD SET SMNOTRANS='' ... WHERE TRANSAC+CNOMENCOP` | SM:277-396 (verified directly; params `SMSEQ;'';'';'''';...`) | Not implemented at display time; posted-SM guard in ajouteSM covers the reuse hazard | ⚠️ see D-1 |

**D-1 (deviation note):** The old software *seeds* the stale SM link into the page, then *clears* it at
display time when totals are 0 (SM:368-394 broad clear scoped TRANSAC+CNOMENCOP; SM/DEL only when the
SM has zero DET_TRANS rows — SM:336-347 timing guard). The new implementation starts the session with
no SM and refuses to adopt a **posted** SM (API posted-guard). End state for every reachable sequence
is the same: a fresh session never mutates a previous session's posted SM. Difference in residue: old
clears the stale `TEMPSPROD.SMNOTRANS` links at open; new leaves them (harmless — lookup skips posted).
Evidence: test DB rows 303565-303575 all show `SMNOTRANS=''` after old-software sessions — caused by
old's broad clears (Sites 1/3 in `03_execution_paths.md §SMNOTRANS-clears`).

## B. Good-quantity OK

| # | Behavior | Old | New | Status |
|---|---|---|---|---|
| B1 | `UtiliseInventaire=0` (non-VCUT): OK button never triggers the SM chain — only the OK-button re-gating | QB:107-165 (renders verifie-only button) | FE gate returns early (QuestionnairePage:147-148) | ✅ |
| B2 | `UtiliseInventaire=1`: OK triggers ajouteSM (create or update) | QB:126 → JS:1751+ chain | handleGoodQtyOk → /ajouteSM.cfm | ✅ |
| B3 | TJSEQ resolution: latest PROD row by TRANSAC+CNOMENCOP | SM:1574-1613 | API ajouteSM step 1 | ✅ |
| B4 | Qty write: TJQTEPROD **and** TJQTEDEFECT together, two WHERE variants (SMNOTRANS-match / TJSEQ) | SM:1841-1854 | API+CFM both variants | ✅ |
| B5 | SM lookup: payload SMNOTRANS → all-PROD-rows scan (`qSMProdExisting` SM:1616-1632, `trouveSM` SM:1857-1868) | both queries | API pass-1 scan equivalent (single combined scan) | ✅ |
| B6 | Orphan check: SM link without TRANSAC header → clear links + force creation | SM:1881-1905 | API+CFM identical | ✅ |
| B7 | **Posted-SM check before reuse** | **NONE in old code** (agent 2, Direct) — protected instead by A5 display-time clears | TRPOSTER guard | ⚠️ deviation, equivalent outcome (see D-1) |
| B8 | Create path: `Nba_Sp_Insert_Sortie_Materiel` params `TRITEM,'CONOTRANS(9)','yyyy-mm-dd','HH:nn',TotalQte,'NOMEMPLOYE(50)','','Ecran de production pour SM',0,'0'` | SM:2284 | API identical (HH:mm 5-char) | ✅ API / 🔧 CFM passes HH:MM:SS → **FIX-1** |
| B9 | Create path NIQTE=0 gate: only when `arguments.Inventaire ≠ 0`; ajouteSM passes `Inventaire` default `"0"` → **gate never fires on non-VCUT** | SM:2318-2328 + signature default | API/CFM implement gate keyed on INVENTAIRE_C (could fire) | 🔧 **FIX-2** (remove/neutralize gate to match never-fires) |
| B10 | Create path post-SP TEMPSPROD update (qtys + SMNOTRANS CASE-WHEN-empty) | SM:2387-2399 | API+CFM identical | ✅ |
| B11 | Update path: `Nba_Sp_Sortie_Materiel` only, TotalQte = good+defect | SM:1948-1971 | API+CFM identical params | ✅ |
| B12 | Direct `SORTIEMATERIEL.SMQTEPRODUIT` + `TRANSAC` header sync after SP ("[FIX-SMQTE]" block) | **Inside masked comment block SM:1974→2250** ("Debut de Masquer"/"FIN de MASQUER"; CFML comments nest) → DEAD CODE (Strong inference) | Not executed (non-VCUT) | ✅ (see Unresolved U-1) |
| B13 | DET_TRANS recalc (`calculeQteSMQS` Mode='Mod'): per-row NIQTE → `Nba_Insert_Det_Trans_Avec_Contenant` (`TRSEQ,INV,'' ,ENTREPOT,'Qte',1,CONTENANT,'NOMEMPLOYE'`) + TRANSAC 4-col update + zero-out when no DET_TRANS line | SM:1210-1351 | API+CFM identical statements | ✅ statements |
| B14 | **Recalc gating**: client sets `Mode='Ajoute'` iff session `ListeSMSEQ` is empty (JS:1752), and server calculeQteSMQS is a NO-OP unless Mode='Mod' (SM:846-848) ⇒ recalc runs only from the SECOND SM-touch **of the session** onward | JS:1752 + SM:846 | API gates on `smCreatedNow` (skips only when SM created in same request) ⇒ recalc DOES run on first touch of a new session when an unposted SM is adopted | 🔧 **FIX-3** (gate recalc on session-scoped list, not smCreatedNow) |
| B15 | Material display query (originalQty + correctedQty via DTRSEQ_PERE/EQUATE-14 children) | SM:428-481 | API/CFM Step-7 query — same OUTER APPLY | ✅ |
| B16 | OK-button re-gating after every change (`verifieStatutSortie`): ENTREPF branch, SM-exists branch incl. `SMQTEPRODUIT == good+defect` equality check, zero-qty SM/DEL + clear, total>0 fallback | QS:2290-2519 | Simplified `smRequired` toast at submit only | 🔧 **FIX-4** (partial; decide scope) |

## C. Defects

| # | Behavior | Old | New | Status |
|---|---|---|---|---|
| C1 | Row targeting `MODEPROD = 1` + TJNOTE LIKE, fallback w/o TJNOTE; writes target found row not args.TJSEQ | QD:761-780 | API+CFM identical | ✅ |
| C2 | Upsert by DDSEQ; INSERT only when qty≠0 (RAISON may be 0); columns incl. DDVALEUR_ESTIME_* formula | QD:781-833 | API+CFM identical | ✅ |
| C3 | TJQTEDEFECT = SUM after add/remove | QD:835-845, :586-595 | identical | ✅ |
| C4 | Add path: NO SORTIEMATERIEL write (sync via follow-up SM chain) | QD add has none | identical | ✅ |
| C5 | Remove path: SMQTEPRODUIT = TJQTEPROD+TJQTEDEFECT when SMNOTRANS≠'' | QD:597-610 | identical (`WHERE SMNOTRANS=@smno9`) | ✅ |
| C6 | Add → SM chain re-fires only when `AvecSM==1` | JS:1409-1415 | FE always calls handleGoodQtyOk; internal gate no-ops when UtiliseInventaire≠1 | ✅ equivalent |
| C7 | Remove → SM chain fires **unconditionally** (legacy quirk — no AvecSM guard, JS:1374) | JS:1374 | FE gated | ⚠️ deviation (old quirk would fire ajouteSM for non-inventory ops; impact nil because ajouteSM on such ops only re-writes qtys — but see U-2) |

## D. Finished products (ENTREPF=1)

| # | Behavior | Old | New | Status |
|---|---|---|---|---|
| D1 | EPF entry: `AjouteEPF` → `EXECUTE_TRANSACTION EPF/INS` (envelope) → `EPFDETAIL/INS` ×2 (DtrSeq=0 then -1) → TEMPSPROD `ENTRERPRODFINI_PFNOTRANS` link + qty write; ListeEPFSEQ/ListeTJSEQ accumulate | PF:1311-1907, JS:1562-1634 | **NOT IMPLEMENTED** — FinishedProductsSection is local state only; submit ignores `finishedProducts`; Good-qty OK hidden when ENTREPF ⇒ smRequired gate can block submit | 🔧 **FIX-5** (feature gap — full flow now documented for implementation) |

## E. Container / SKID change

| # | Behavior | Old | New | Status |
|---|---|---|---|---|
| E1 | `CorrigeDetailSM`: parent lookup (`DTRSEQ_PERE IS NULL AND TRANSAC_TRNO_EQUATE = 15`) + 7-column DET_TRANS update | SM:1467-1512 | API+CFM identical | ✅ |

## F. Submit (`ModifieTEMPSPROD`)

| # | Behavior | Old | New | Status |
|---|---|---|---|---|
| F1 | Confirmation modal before EVERY submit (`ouvrirModaleZero`, zero or not) | JS:2980-3027 | Only zero-qty confirm dialog | ⚠️ minor UX deviation (decide) |
| F2 | No row close/insert at submit (status already mutated) | QS:599-1293 has none | identical (removed) | ✅ |
| F3 | TJPROD_TERMINE=0 blanket reset | QS:686-692 | identical | ✅ |
| F4 | Employee on STOP/COMP row (args.TJSEQ) | QS:700-706 | identical via stopTjseq | ✅ |
| F5 | changeTEMPSPROD (a): employee + **TJNOTE=left(Note,500)** + CNOMENCOP + INVENTAIRE_C on STOP/COMP row | QS:1670-1679 | employee only; TJNOTE/CNOMENCOP/INVENTAIRE_C not written on stop row | 🔧 **FIX-6** |
| F6 | changeTEMPSPROD (b-e): qty on diff-status PROD row + cost recalc on both rows | QS:1682-1730 | identical | ✅ |
| F7 | Stop causes upsert on latest MODEPROD=8 row | QS:733-769 | identical (+stopTjseq preference covers ON_HOLD) | ✅ |
| F8 | SM REPORT loop source: TEMPSPROD rows in (ListeTJSEQ ∪ LeTJSEQ) with SMNOTRANS≠'' ; `SMSEQ;DateClarion;HeureClarion;'NOMEMPLOYE';...` | QS:774-828, :1767 | identical (PROD row + payload smnotrans) | ✅ |
| F9 | Old JS bug: SMNOTRANS never reaches ModifieTEMPSPROD (`'&SMNOTRANS+'` typo) — server compensates by DB query | JS:1970 | N/A (new passes it properly; server also queries DB) | ✅ superset, same outcome |
| F10 | EPF section: DET_TRANS cost upd (FctNbaRound) + `EPF/REPORT` + COMP → TJPROD_TERMINE=1 + PR_TERMINE=1 | QS:829-933 | identical | ✅ |
| F11 | InsertEnCours: TJVALEUR_MATIERE + KPI guard (`NOPSEQ + TEMPSPROD_PROD`) + **22-param** `Nba_SP_Kpi_Insert_Valeur_Operation_Reel` | QS:1788-1930, :1902 | TJVALEUR_MATIERE ✅; KPI = guarded 1-param attempt (silently fails) | 🔧 **FIX-7** (now fully specified — implementable) |
| F12 | InsertTacheCariste (warehouse transfer) | QS:1932-2113 | identical SPs + TRANSFENTREP update | ✅ |
| F13 | `Nba_Update_ProduitEnCours` 6 params | QS:980/1061 | identical | ✅ |
| F14 | cNOMENCOP totals: `NOPQTETERMINE=ΣTJQTEPROD, NOPQTESCRAP=ΣTJQTEDEFECT,` **`NOPQTERESTE=ΣTJQTEPROD`** (legacy formula — RESTE set to produced, not remaining) | QS:1171-1184 | `NOPQTERESTE = NOPQTEAFAIRE − (Σgood+Σdef)` ("corrected") | 🔧 **FIX-8** (replicate legacy formula exactly per user mandate) |
| F15 | Auto STOP→COMP flip when target reached: rows' **MODEPROD/MPCODE/MPDESC set to COMP** + TJFINDATE + TJPROD_TERMINE + PR_TERMINE | QS:1130-1169 | only TJPROD_TERMINE + PR_TERMINE (no COMP flip) | 🔧 **FIX-9** |
| F16 | Zero-qty SM/DEL: old runs it inside `verifieStatutSortie` (gating time, QS:2430-2471) and display-time (A5); new runs at submit | both produce SM/DEL + TEMPSPROD clear | ⚠️ timing deviation (same writes; consolidate under FIX-4 decision) |

## G. Cancel (`retireQuestionnaireSortie`)

| # | Behavior | Old | New | Status |
|---|---|---|---|---|
| G1 | ListeTJSEQ deletion loop is **VCUT-gated** (`local.IsVCUT AND ...` QS:401) — non-VCUT loop does nothing | QS:398-425 (verified directly; agent-3 report said otherwise — **contradiction resolved by direct read**, see open_questions) | identical (VCUT-gated) | ✅ |
| G2 | Delete STOP/COMP row (TEMPSPRODEX+TEMPSPROD, no DET_DEFECT) | QS:430-446 | identical | ✅ |
| G3 | Re-find latest PROD (no copmachine filter) → append its SM to delete list → unconditional SM chain deletes (SMSEQ lookup w/ TRSEQ fallback) → broad `SMNOTRANS=''` clear | QS:448-524 | identical | ✅ |
| G4 | EPF cleanup | QS:526-577 | identical | ✅ |
| G5 | Reset PROD row + delete its DET_DEFECT | QS:580-595 | identical | ✅ |

## H. Lockstep gaps (api.cjs vs queries/*.cfm) — from agent-4 diff

| # | Gap | Status |
|---|---|---|
| H1 | `queries/ajouteSM.cfm` Insert-SP time param `HH:MM:SS` vs API `HH:mm` (old = `HH:nn` 5-char, SM:2281) | 🔧 **FIX-1** |
| H2 | `queries/changeStatus.cfm` missing `AND v.NOPSEQ=@nopseq` filter (API has it) | 🔧 **FIX-10** |
| H3 | API ajouteSM missing SMSEQ fallback via `TRANSAC.TRSEQ` (CFM + old have it) | 🔧 **FIX-11** |
| H4 | Defect list response casing `DDSEQ` (CFM) vs recordset casing (API) — verify FE binding | 🔧 **FIX-12** (verify + align) |
| H5 | `queries/submitQuestionnaire.cfm` — KPI/cariste sections to re-verify after FIX-7 | follow-up |

## Required fixes (priority order)

1. **FIX-3** recalc gating by session list (B14) — the last source of DET_TRANS drift
2. **FIX-9** auto STOP→COMP flip (F15) — affects order status lifecycle
3. **FIX-6** TJNOTE/CNOMENCOP/INVENTAIRE_C on stop row (F5)
4. **FIX-8** legacy NOPQTERESTE formula (F14) — *flag to user: replicates a probable legacy bug; exactness mandate says yes*
5. **FIX-1/10/11/12** lockstep + small parity gaps
6. **FIX-2** neutralize NIQTE gate (B9)
7. **FIX-4** verifieStatutSortie-equivalent OK gating (B16/F16) — scope decision with user
8. **FIX-7** KPI 22-param InsertEnCours port (F11)
9. **FIX-5** finished-products (EPF) flow (D1) — feature implementation, fully specified in 03

## Unresolved (see appendices/open_questions.md)

- **U-1** Masked-block liveness (B12): Strong inference DEAD (CFML nested comments + Masquer/FIN pairing). Empirical confirmation: trace old SW SQL (Profiler) on an update-path OK click — presence of direct `UPDATE SORTIEMATERIEL SET SMQTEPRODUIT` outside SP would disprove.
- **U-2** Old defect-remove on UtiliseInventaire=0 ops fires ajouteSM (C7) — would old create an SM there? `ajouteSM` server has no UtiliseInventaire gate; needs old-SW empirical test before mirroring the quirk.
- **U-3** Encrypted SPs (`Nba_Sp_Insert_Sortie_Materiel`, `Nba_Sp_Sortie_Materiel`, `Nba_Insert_Det_Trans_Avec_Contenant`, KPI SP): internals unknowable; parity asserted at exact-invocation level only (params verified verbatim ✅).
