# 04 — Database Interactions

## Tables written (non-VCUT questionnaire lifecycle)

| Table | Written by | Columns | Timing |
|---|---|---|---|
| TEMPSPROD | changeStatut SPs; ajouteSM (qtys, SMNOTRANS); defect fns (TJQTEDEFECT); submit (employee, TJNOTE, CNOMENCOP, INVENTAIRE_C, qtys, costs via Fct, TJVALEUR_MATIERE, TJPROD_TERMINE, COMP flip); cancel (DELETE stop row, RESET prod row); zero-qty paths (SMNOTRANS='', qtys=0) | see 03 | per action |
| TEMPSPRODEX | submit upsert (QA_CAUSEP, QA_CAUSES, EXTPRD_NOTE); cancel DELETE | | submit/cancel |
| SORTIEMATERIEL | Insert SP (create); SMQTEPRODUIT by Sortie SP (inference — encrypted) and by defect-remove sync (QD:602-610); cancel DELETE | | per action |
| TRANSAC (SM material lines) | Sortie SP creates; recalc 4-col qty updates (SM:1343); zero-out (SM:1237); TRPOSTER set by SM/REPORT (AutoFab app — inference from data); cancel DELETE by TRNO | | per action |
| DET_TRANS | Sortie SP creates; `Nba_Insert_Det_Trans_Avec_Contenant` (recalc, EPF container); CorrigeDetailSM 7-col update; EPF cost update (FctNbaRound); cancel DELETE by TRANSAC_TRNO; correction children: DTRSEQ_PERE + TRANSAC_TRNO_EQUATE=14 | | per action |
| DET_DEFECT | add INSERT/UPDATE; remove DELETE; cancel DELETE | QD/cancel | immediate |
| ENTRERPRODFINI | EPF/INS (AutoFab); cancel PFPOSTER=0 + DELETE | PF/cancel | per action |
| PL_RESULTAT | PR_DEBUTE (status change); PR_TERMINE (submit COMP / auto-flip) | | |
| cNOMENCOP | submit totals (TERMINE/SCRAP/**RESTE=ΣTJQTEPROD** QS:1171-1184) | | submit |
| TRANSFENTREP | cariste SPs + post-update (TREPOSTER=0, COPMACHINE, CNOMENCOP, DEPARTEMENT, TRENOTE) | | submit, warehouses differ |
| T_KPI_VALEUR_OPERATION_REEL | KPI SP (22 params), guarded by (NOPSEQ, TEMPSPROD_PROD) existence | | submit |

## Stored procedures / AutoFab commands (invocation contracts)

| Object | Via | Params (verbatim source) |
|---|---|---|
| Nba_Sp_Update_Production | SOAP EXECUTE_STORED_PROC | QS:1443 (20 in + ERREUR out) |
| Nba_Sp_Insert_Production | SOAP | QS:1524 / PF:1397 (24 in + TJSEQ, ERREUR out) |
| Nba_Sp_Insert_Sortie_Materiel | SOAP | SM:2284 (10 in + NEWSMNOTRANS, SQLERREUR out — sys.parameters verified) |
| Nba_Sp_Sortie_Materiel | SOAP | SM:2334/:1948 (9 in + SQLERREUR out — verified) |
| Nba_Insert_Det_Trans_Avec_Contenant | SOAP | SM:1311 (8 in + SQLERREUR, ERROR, DTRSEQ out — verified) |
| Nba_Update_ProduitEnCours | SOAP | QS:980 (6 in) |
| Nba_SP_Kpi_Insert_Valeur_Operation_Reel | SOAP | QS:1902 (22 in) |
| Nba_Insert_Transfer_Entrepot_[Sans_]Contenant | direct cfstoredproc-equiv | QS:1932+ |
| EXECUTE_TRANSACTION SM/REPORT, SM/DEL | SOAP only — **no SQL equivalent** | QS:1767 / SM:376 (13-slot) |
| EXECUTE_TRANSACTION EPF/REPORT, EPF/INS, EPFDETAIL/INS | SOAP only | QS:2129 / PF:1882 / PF:2007 |
| dbo.FctCalculTempsDeProduction, dbo.FctNbaRound | inline SQL | QS:1591 etc. |

## Read paths feeding decisions
`VOperationParTransac` (UtiliseInventaire, NISTR_NIVEAU), `vEcransProduction` (op metadata, EXT ds),
`COMMANDE ⋈ TRANSAC` (CONOTRANS/TRITEM/TRNORELACHE — operation.cfc:4466-4473), `MODEPROD`,
`EMPLOYE`, `RAISON`, `QA_CAUSEP/QA_CAUSES`, `SORTIEMATERIEL` (SMSEQ/SMQTEPRODUIT checks),
`VSP_BonTravail_VeneerReserve` (EXT, container options — new impl).

## Transactionality
No BEGIN/COMMIT wrappers anywhere in either stack — every statement auto-commits; partial-failure
states possible (see 06).
