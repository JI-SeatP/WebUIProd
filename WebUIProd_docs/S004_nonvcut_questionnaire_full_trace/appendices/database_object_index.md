# Database Object Index

| Object | Type | Appears in docs |
|---|---|---|
| TEMPSPROD | table | 01, 03 (all flows), 04 |
| TEMPSPRODEX | table | 03 F5, 04 |
| SORTIEMATERIEL | table | 03 F2/F6, 04, 08 B |
| TRANSAC | table (orders + SM/EPF transaction lines) | 03, 04 |
| DET_TRANS | table (+ correction children EQUATE=14; parents EQUATE=15) | 03, 04, 08 B13/B15/E1 |
| DET_DEFECT | table | 03 F3, 04, 08 C |
| ENTRERPRODFINI | table | 03 F4, 04, 08 D |
| PL_RESULTAT | table | 03 F1/F5, 04 |
| cNOMENCOP / cNOMENCLATURE | tables (BOM) | 03 F2, 04, 08 B13 |
| MODEPROD | table (MPSEQ/MPCODE) | 01, 03 |
| EMPLOYE, RAISON, QA_CAUSEP, QA_CAUSES | lookup tables | 02, 03 |
| TRANSFENTREP | table | 03 F5 step 8, 04 |
| T_KPI_VALEUR_OPERATION_REEL | table | 03 F5 step 8, 04 |
| vEcransProduction (EXT) | view | 00, 03 |
| VOperationParTransac | view | 00, 02 |
| VSP_BonTravail_VeneerReserve (EXT) | view | 04 (new impl containers) |
| vPARAMETRE (PAWS_IP/PAWS_PORT) | view | 00 |
| Nba_Sp_Update_Production / Nba_Sp_Insert_Production | SP (encrypted) | 03 F1, 04 |
| Nba_Sp_Insert_Sortie_Materiel / Nba_Sp_Sortie_Materiel | SP (encrypted, sigs verified) | 03 F2, 04 |
| Nba_Insert_Det_Trans_Avec_Contenant | SP (encrypted, sig verified) | 03 F2 recalc, 04 |
| Nba_Update_ProduitEnCours | SP (encrypted) | 03 F5, 04 |
| Nba_SP_Kpi_Insert_Valeur_Operation_Reel | SP (encrypted; 22-param contract QS:1902) | 03 F5, 04 |
| Nba_Insert_Transfer_Entrepot_[Sans_]Contenant | SP | 03 F5, 04 |
| Nba_Insert_Contenant / HIST_CONTENANT | SP/table (EPF container branch) | 03 F4 |
| dbo.FctCalculTempsDeProduction / dbo.FctNbaRound | functions | 03, 04 |
| AutoFab EXECUTE_TRANSACTION (SM/REPORT, SM/DEL, EPF/REPORT, EPF/INS, EPFDETAIL/INS) | external app commands | 03, 04, 05 |
