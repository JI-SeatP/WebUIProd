# 03 — Execution Paths (old software, exact order; per user action)

Verbatim SP/SOAP parameter strings are quoted where they are the porting contract.
All confidence levels are **Direct** unless marked.

## Flow 1 — Open (status button → questionnaire rendered)

1. JS `changeStatut` (JS:1024) → GET `ajouteModifieStatut` (QS:1295).
2. `Nba_Sp_Update_Production` closes previous row — params (QS:1443):
   `TJSEQ,EMPLOYE,Operation_Seq,MACHINE,TRANSAC,'','',CNOMENCLATURE,INVENTAIRE_SEQ,1,0,TJQTEPROD,
   TJQTEDEFECT,'DateDebut','HeureDebut','DateFin','HeureFin','MPCODE(5)','Ecran de production pour
   Temps prod','SMNOTRANS(9)'` — **SMNOTRANS propagated, never cleared here**.
3. `Nba_Sp_Insert_Production` inserts STOP/COMP row — params (QS:1524); no SMNOTRANS param ⇒ new row
   link empty. Output TJSEQ → `LeTJSEQ`.
4. Direct UPDATEs: CNOMENCOP/INVENTAIRE_C on new row (QS:1552-1557); PL_RESULTAT PR_DEBUTE=1 (QS:1558);
   cost zeroing on new row (QS:1565-1579); FctCalculTempsDeProduction on old PROD row (QS:1581-1614,
   + SETUP row when NOPTEMPSETUP≠0).
5. JS receives `{LeTJSEQ}` → `afficheDiv('DivQuestionnaire',...,LeTJSEQ,...)` (JS:1046).
6. `afficheTableauQuestionnaire` (QS:9-174) renders sections; hidden inputs seeded per `01_state_model`.
7. **Display-time SM zero-qty cleanup** inside `afficheListeSortieMaterielQS` (SM:277-396):
   `ListeTJSEQCalc` = args.ListeTJSEQ or LeTJSEQ/args.TJSEQ; Total = Σ(TJQTEPROD+TJQTEDEFECT) over it
   (PROD rows preferred); if Total=0: resolve stale SMNOTRANS (args or TEMPSPROD scan);
   **timing guard** — if the SM has ANY DET_TRANS lines (count via TRANSAC JOIN DET_TRANS, SM:336-347)
   → no delete; else `EXECUTE_TRANSACTION SM/DEL` params `SMSEQ;'';'';'''';'';'';'';'''';'''';'';'';'';''`
   preceded by broad clear `UPDATE TEMPSPROD SET SMNOTRANS='' WHERE SMNOTRANS=(SELECT … SMSEQ=…)
   AND TRANSAC=@t AND CNOMENCOP=@n` (SM:368-394).

## Flow 2 — Good-qty OK (UtiliseInventaire=1)

JS chain (one click): server `ajouteSM` → server `calculeQteSMQS(Mode)` → (+500ms) `verifieStatutSortie`
+ `afficheListeSortieMaterielQS`. Mode = 'Ajoute' iff session ListeSMSEQ empty (JS:1752).

### server ajouteSM non-VCUT (SM:1838-1973)
A. LeTJSEQ = latest PROD row (SM:1574-1613).
B. `qSMProdExisting` fills empty args.SMNOTRANS from any PROD row of TRANSAC+CNOMENCOP (SM:1616-1632).
C. QteDefectueux fallback from row's TJQTEDEFECT (SM:1634-1642).
D. Qty write, both variants (SM:1841-1854) — WITH-SM variant keys on `LEFT(SMNOTRANS,9)`+TRANSAC+
   CNOMENCOP+'PROD'; WITHOUT-SM keys on TJSEQ.
E. `trouveSM` confirm scan (SM:1857-1868); SmNoCible precedence: args.SMNOTRANS → trouveSM.
F. Orphan check (SM:1881-1905): header `TRANSAC WHERE TRNO=` missing ⇒ broad clear + create path.
G. CREATE → `InsertSortieMateriel` (SM:2259-2405):
   - `Nba_Sp_Insert_Sortie_Materiel` params (SM:2284):
     `TRITEM,'CONOTRANS(9)','yyyy-mm-dd','HH:nn',TotalQte,'NOMEMPLOYE(50)','','Ecran de production pour SM',0,'0'`
     (TotalQte = QteBonne+QteDefectueux; HEURE is **HH:nn — 5 chars**, SM:2281) → NEWSMNOTRANS.
   - SMSEQ lookup (SM:2312-2317).
   - NIQTE gate (SM:2318-2328) — dead on this path (Inventaire="0").
   - `Nba_Sp_Sortie_Materiel` params (SM:2334):
     `'SM(9)',TRITEM,'CONOTRANS(9)',TotalQte,Operation_Seq,'NOMEMPLOYE(50)','NISTR_NIVEAU(500)','',TRNORELACHE`.
   - TRANSAC line lookup (SM:2360-2369); TJSEQ fallback (SM:2372-2385).
   - Robust post-create TEMPSPROD update: qtys + SMNOTRANS CASE-WHEN-empty (SM:2387-2399).
   UPDATE → `Nba_Sp_Sortie_Materiel` only, same params with existing SM (SM:1948-1971).
H. Block SM:1974-2250 (incl. "[FIX-SMQTE]" direct header sync) is inside the
   `Debut de Masquer…FIN de MASQUER` nested CFML comment ⇒ **dead code** (Strong inference; U-1).

### server calculeQteSMQS Mode='Mod' (SM:824-1363) — non-VCUT loop SM:1210-1351
Per DISTINCT DET_TRANS row of the targeted SM(s) (source query SM:972-1052, WHERE = SMNOTRANS ∪
ListeSMSEQ→TRNOs ∪ EXISTS TEMPSPROD links by ListeTJSEQ/TJSEQ):
1. DTRSEQ≤0 + SM has other lines ⇒ zero TRANSAC 4 cols, continue; DTRSEQ≤0 + SM has none ⇒ skip.
2. InvC from row or TEMPSPROD; `trouveInfo` cNOMENCOP(INVENTAIRE_P=InvC) ⇒ cNOMENCLATURE node.
3. `trouveRatio` MAX(NIQTE) by (NISEQ_PERE, INVENTAIRE_M); ≤0 ⇒ continue.
4. NouvelleQte = Abs(TotalProduit × NIQTE).
5. `Nba_Insert_Det_Trans_Avec_Contenant` params (SM:1311):
   `TRSEQ,INVENTAIRE,'',ENTREPOT,'NouvelleQte',1,CONTENANT,'NOMEMPLOYE(50)'` (outputs SQLERREUR,ERROR,DTRSEQ).
6. `UPDATE TRANSAC SET TRQTETRANSAC/TRQTEUNINV/TRQTECMD/TRQTEINV_ESTIME = NouvelleQte` (SM:1343-1350).

## Flow 3 — Defect add/remove
Server sequences fully quoted in agent-2 report §5/§5b and replicated 1:1 in the new endpoints
(08 §C). Chaining: add → AvecSM-gated SM chain + immediate verifieStatutSortie; remove → SM chain
unconditional (JS:1374) + verifieStatutSortie via chain.

## Flow 4 — EPF add (ENTREPF=1) — for FIX-5 implementation
`AjouteEPF` (PF:1311+): qty>0 only; same-NOPSEQ path uses latest PROD TJSEQ; different-NOPSEQ path
inserts a TEMPSPROD row via `Nba_Sp_Insert_Production` (params PF:1397) then sets qty/CNOMENCOP/
INVENTAIRE_C. Then:
1. `EXECUTE_TRANSACTION EPF/INS` params (PF:1882): `'';DateClarion;HeureClarion;'NOMEMPLOYE';'0';'Ecran de production pour EPF';`
   → PFSEQ → PFNOTRANS lookup.
2. `EXECUTE_TRANSACTION EPFDETAIL/INS` twice — DtrSeq=0 (unknown TRSEQ) then DtrSeq=-1 (known) —
   params (PF:2007): `'TRSEQ';DtrSeq;EPFSEQ;UtiliseInventaire;Entrepot;NiSeq;CONOTRANS;TRITEM;Qte;;'No_serie';;'TRNORELACHE';`
3. `UPDATE TEMPSPROD SET ENTRERPRODFINI_PFNOTRANS=left(PFNOTRANS,9), TJQTEPROD=…[,cNOMENCLATURE]`
   (PF:1505-1513). Container module branch: Nba_Insert_Contenant + HIST_CONTENANT +
   Nba_Insert_Det_Trans_Avec_Contenant.
4. JS writes ListeEPFSEQ/ListeTJSEQ; AvecSM==1 ⇒ SM chain, else verifieStatutSortie (JS:1622-1629).

## Flow 5 — Submit (`ModifieTEMPSPROD` QS:599-1293) — ordered
1. TJPROD_TERMINE=0 blanket (QS:686).
2. Employee on args.TJSEQ (QS:700-706); EmployeQS form field fallback session EMSEQ (QS:620-626).
3. TJPROD_TERMINE=1 pre-check on PROD row (QS:709-716).
4. `changeTEMPSPROD` (QS:1637-1741): (a) employee+**TJNOTE(500)**+CNOMENCOP+INVENTAIRE_C on args.TJSEQ;
   (b) qtys on diff-status PROD row; (c)(d) Fct recalc both rows.
5. TEMPSPRODEX upsert on latest MODEPROD=8 row (QS:733-769).
6. SM REPORT loop (QS:774-828): TEMPSPROD rows in (ListeTJSEQ ∪ LeTJSEQ) with SMNOTRANS≠'' [∪ args.SMNOTRANS
   — dead via JS typo]; per row `ReportSortieMateriel` params (QS:1767):
   `SmSeq;DateClarion;HeureClarion;'NOMEMPLOYE';'';'';'';'''';'''';'';'';'';''`
   (Clarion: support.cfc:872-873 — days since 1800-12-28; seconds-since-midnight×100).
7. EPF loop (QS:829-933): DET_TRANS cost UPDATE with `dbo.FctNbaRound(...,'PANB_DECIMAL_PRIX')`
   (QS:870-876) + `ReportEntreeProduitFini` params (QS:2129) same 13-slot shape with EPFSEQ;
   COMP ⇒ TJPROD_TERMINE=1 + PL_RESULTAT PR_TERMINE=1 (QS:919-931).
8. Per TJSEQ: `InsertEnCours` (QS:1788-1930) — TJVALEUR_MATIERE via Fct; KPI guard
   `T_KPI_VALEUR_OPERATION_REEL WHERE NOPSEQ AND TEMPSPROD_PROD` (QS:1884-1889); KPI SP **22 params**
   (QS:1902, fully quoted in agent-3 report — porting contract for FIX-7);
   `InsertTacheCariste` (QS:1932-2113); `Nba_Update_ProduitEnCours` 6 params (QS:980/1061).
9. cNOMENCOP totals (QS:1171-1184): TERMINE=ΣTJQTEPROD, SCRAP=ΣTJQTEDEFECT, **RESTE=ΣTJQTEPROD**.
10. Auto STOP→COMP flip (QS:1130-1169): when (LaQteTotale−ΣTJQTEPROD)≤0 ∧ Statut='STOP' ∧ ¬VCUT:
    PR_TERMINE=1 + per-TJSEQ `UPDATE TEMPSPROD SET MODEPROD=<COMP MPSEQ>, MODEPROD_MPCODE='COMP',
    MPDESC_P/S(50), TJFINDATE=now, TJPROD_TERMINE=1`.

## Flow 6 — Cancel (`retireQuestionnaireSortie` QS:314-597) — ordered
1. VCUT KeepTJSEQ pool = args.TJSEQ + ListeTJSEQ (QS:336-374); ListeTJSEQ defaults to args.TJSEQ.
2. ListeTJSEQ loop body **VCUT-gated** (`local.IsVCUT AND CeTJSEQ≠KeepTJSEQ`, QS:401) — verified by
   direct read; non-VCUT no-op. (Agent-3 misread this; contradiction recorded in open_questions.)
3. DELETE TEMPSPRODEX + TEMPSPROD for args.TJSEQ (QS:430-446).
4. Re-find latest PROD row — no copmachine filter (QS:448-456).
5. Append its SM's SMSEQ to ListeSMSEQ (QS:470-477).
6. Per SMSEQ: SORTIEMATERIEL-by-SMSEQ lookup, TRSEQ fallback; DELETE SORTIEMATERIEL/TRANSAC/DET_TRANS
   + broad `SET SMNOTRANS=''` (QS:478-524).
7. EPF cleanup (QS:526-577).
8. RESET PROD row + DELETE its DET_DEFECT (QS:580-595).
