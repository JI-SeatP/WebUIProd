# 04 — Database Interactions

## Tables read

| Table/View | Fields read | Read by | Purpose |
|-----------|-------------|---------|---------|
| `vEcransProduction` (view, EXT ds) | `PRODUIT_CODE`, `NO_INVENTAIRE`, `QTE_FORCEE`, `TYPEPRODUIT`, `FMCODE`, `OPERATION_SEQ`, `*` | `support.cfc::trouveUneOperation:3602` | VCUT detection, completion threshold, operation metadata |
| `VOperationParTransac` (view) | `ENTREPF`, `UtiliseInventaire`, `NISEQ`, `OPERATION_SEQ`, `NOPSEQ` | `QuestionnaireSortie.cfc`, `ProduitFini.cfc:1947` | Form branching (EPF vs QteBonne, SM visibility), EPF NiSeq resolution |
| `VSP_BonTravail_Entete` (view) | Joined with `vEcransProduction` | `support.cfc::trouveUneOperation` | Work order header data |
| `CNOMENCLATURE` | `NISEQ`, `NIQTE`, `INVENTAIRE_M`, `INVENTAIRE_M_INNOINV`, `INVENTAIRE_M_INDESC1/2`, `NISEQ_PERE`, `NIVALEUR_CHAR1`, `NILONGUEUR`, `NILARGEUR` | `ProduitFini.cfc:385`, `operation.cfc:4487`, `SortieMateriel.cfc:1081` | VCUT BOM components, SM ratio calculation |
| `cNOMENCOP` | `NOPSEQ`, `CNOMENCLATURE`, `INVENTAIRE_P`, `NOPValeurEstime_Unitaire` | `ProduitFini.cfc:1350`, `QuestionnaireSortie.cfc:1186` | Operation-to-component mapping |
| `cNOMENCOP_Machine` | `cNOM_SEQ AS COPMACHINE`, `cNOMENCOP` | `operation.cfc:4497` | Machine assignment for component operations |
| `TEMPSPROD` | `TJSEQ`, `TJQTEPROD`, `TJQTEDEFECT`, `MODEPROD_MPCODE`, `CNOMENCOP`, `INVENTAIRE_C`, `SMNOTRANS`, `ENTRERPRODFINI_PFNOTRANS`, `EMPLOYE`, `EMPLOYE_EMNO`, `EMPLOYE_EMNOM` | Multiple CFC methods | Production time tracking — core entity |
| `TEMPSPRODEX` | `TEMPSPROD`, `QA_CAUSEP`, `QA_CAUSES`, `EXTPRD_NOTE` | `QuestionnaireSortie.cfc:752` | Stop cause extension record |
| `ENTRERPRODFINI` | `PFSEQ`, `PFNOTRANS`, `PFPOSTER` | `ProduitFini.cfc`, `QuestionnaireSortie.cfc:526` | EPF header lookup |
| `SORTIEMATERIEL` | `SMSEQ`, `SMNOTRANS`, `SMQTEPRODUIT` | `SortieMateriel.cfc:1666`, `QuestionnaireSortie.cfc:2407` | SM header lookup, quantity validation |
| `TRANSAC` | `TRSEQ`, `TRNO`, `TRSTATUTITEM`, `TRQTETRANSAC`, `TRCOUTTRANS`, `CONTENANT_CON_NUMERO` | Multiple | Transaction records for EPF/SM |
| `DET_TRANS` | `DTRSEQ`, `DTRQTE`, `TRANSAC_TRNO`, `TRNO_EQUATE` | SM recalc, cancel cleanup | Transaction detail rows |
| `INVENTAIRE` | `INSEQ`, `INDESC1`, `INDESC2` | `operation.cfc:4494` | Product descriptions |
| `PL_RESULTAT` | `PR_TERMINE`, `PR_DEBUTE`, `MODEPROD`, `CNOMENCOP` | `QuestionnaireSortie.cfc:918,1558` | Operation result tracking |
| `DET_DEFECT` | `TEMPSPROD` | `QuestionnaireSortie.cfc:394` | Defect records (deleted on cancel) |

## Tables written

### TEMPSPROD writes

| Operation | Fields written | Source | When |
|-----------|---------------|--------|------|
| Create new row | Via `Nba_Sp_Insert_Production` | `ProduitFini.cfc:1399`, `QuestionnaireSortie.cfc:1526` | EPF add (cross-NOPSEQ), status change |
| Update employee | `EMPLOYE`, `EMPLOYE_EMNO`, `EMPLOYE_EMNOM` | `QuestionnaireSortie.cfc:700` | Submit |
| Update quantities (cross-NOPSEQ) | `TJQTEPROD`, `CNOMENCOP` (= **main** nopseq, not component's), `INVENTAIRE_C` | `ProduitFini.cfc:1424` | EPF add (see I10c) |
| Update quantities (same-NOPSEQ) | `TJQTEPROD` (overwrite, not accumulate), `INVENTAIRE_C`, `ENTRERPRODFINI_PFNOTRANS`, clear `SMNOTRANS` | `ProduitFini.cfc:1505` | EPF add (see I10a, I10b) |
| Link SM | `SMNOTRANS` | `SortieMateriel.cfc:1797` | SM create (batch update) |
| Link EPF | `ENTRERPRODFINI_PFNOTRANS` | `ProduitFini.cfc` | EPF add |
| VCUT complete | `MODEPROD_MPCODE='COMP'`, `TJFINDATE=NOW()`, `TJPROD_TERMINE=1` | `QuestionnaireSortie.cfc:1255` | Submit (complete block) |
| VCUT hardcode | `TJQTEPROD=1 WHERE INVENTAIRE_C=10525` | `QuestionnaireSortie.cfc:1270` | Submit (complete block) |
| Close previous | Via `Nba_Sp_Update_Production` | `QuestionnaireSortie.cfc:1445` | Status change |
| Zero costs | `TJEMTAUXHOR=0, TJOPTAUXHOR=0, TJMATAUXHOR=0, TJSYSTEMPSHOMME=0, TJTEMPSHOMME=0, TJEMCOUT=0, TJOPCOUT=0, TJMACOUT=0` | `QuestionnaireSortie.cfc:1567` | Status change (STOP/COMP/PAUSE) |
| Cancel reset | `TJFINDATE=NULL, TJQTEPROD=0, TJQTEDEFECT=0, SMNOTRANS='', ENTRERPRODFINI_PFNOTRANS=''` | `QuestionnaireSortie.cfc:580` | Cancel |
| Cancel delete | `DELETE FROM TEMPSPROD WHERE TJSEQ = ?` | `QuestionnaireSortie.cfc:394-446` | Cancel (non-KeepTJSEQ rows) |

### cNOMENCOP writes

| Operation | Fields written | Source | When |
|-----------|---------------|--------|------|
| VCUT complete | `NOPQTETERMINE`, `NOPQTESCRAP` | `QuestionnaireSortie.cfc:1186-1290` | Submit (complete block) |
| VCUT incomplete | `NOPQTETERMINE=0, NOPQTESCRAP=0, NOPQTERESTE=0` | `QuestionnaireSortie.cfc:1282` | Submit (incomplete) |

### TEMPSPRODEX writes

| Operation | Fields written | Source | When |
|-----------|---------------|--------|------|
| Save stop cause | `TEMPSPROD`, `QA_CAUSEP`, `QA_CAUSES`, `EXTPRD_NOTE` | `QuestionnaireSortie.cfc:752` | Submit |
| Cancel delete | `DELETE FROM TEMPSPRODEX WHERE TEMPSPROD = ?` | `QuestionnaireSortie.cfc:394` | Cancel |

### TRANSAC writes

| Operation | Fields written | Source | When |
|-----------|---------------|--------|------|
| Close VCUT | `TRSTATUTITEM = 1` | `QuestionnaireSortie.cfc:1277` | Submit (complete block) |
| SM recalc | `TRQTETRANSAC`, `TRQTEUNINV`, `TRQTEINV_ESTIME` | `SortieMateriel.cfc:1197` | SM recalc |
| Container link | `CONTENANT_CON_NUMERO` | `ProduitFini.cfc` | EPF add (container) |
| Cancel nullify | `TRANSAC_PERE = NULL` | `QuestionnaireSortie.cfc:526` | Cancel (EPF cleanup) |
| Cancel delete | `DELETE FROM TRANSAC WHERE TRNO = ?` | `QuestionnaireSortie.cfc:478,526` | Cancel |

### PL_RESULTAT writes

| Operation | Fields written | Source | When |
|-----------|---------------|--------|------|
| VCUT complete | `PR_TERMINE = 1` | `QuestionnaireSortie.cfc:1186` | Submit (complete block) |
| Status change | `PR_DEBUTE = 1, MODEPROD = ?` | `QuestionnaireSortie.cfc:1558` | Status change |

### SORTIEMATERIEL writes

| Operation | Fields written | Source | When |
|-----------|---------------|--------|------|
| Create | Via `Nba_Sp_Insert_Sortie_Materiel` | `SortieMateriel.cfc:2286` | SM create |
| Update qty | `SMQTEPRODUIT` | `SortieMateriel.cfc:1197` | SM recalc |
| Cancel delete | `DELETE FROM SORTIEMATERIEL WHERE SMNOTRANS = ?` | `QuestionnaireSortie.cfc:478` | Cancel |

### DET_TRANS writes

| Operation | Fields written | Source | When |
|-----------|---------------|--------|------|
| SM detail | Via `Nba_Sp_Sortie_Materiel` | `SortieMateriel.cfc:1756` | SM create/update |
| EPF detail | Via AutoFab SOAP `EPFDETAIL/INS` | `ProduitFini.cfc:2010` | EPF add |
| Container detail | Via `Nba_Insert_Det_Trans_Avec_Contenant` | `ProduitFini.cfc` | EPF add (container) |
| Cancel delete | `DELETE FROM DET_TRANS WHERE TRANSAC_TRNO = ?` | `QuestionnaireSortie.cfc:478,526` | Cancel |

### ENTRERPRODFINI writes

| Operation | Fields written | Source | When |
|-----------|---------------|--------|------|
| Create | Via AutoFab SOAP `EPF/INS` | `ProduitFini.cfc` | EPF add |
| Cancel reset | `PFPOSTER = 0` | `QuestionnaireSortie.cfc:526` | Cancel |
| Cancel delete | `DELETE FROM ENTRERPRODFINI WHERE PFSEQ = ?` | `QuestionnaireSortie.cfc:526` | Cancel |

### CONTENANT writes

| Operation | Fields written | Source | When |
|-----------|---------------|--------|------|
| Create | Via `Nba_Insert_Contenant` (AutoFab SOAP) | `ProduitFini.cfc` | EPF add (new container) |

### DET_DEFECT writes

| Operation | Fields written | Source | When |
|-----------|---------------|--------|------|
| Cancel delete | `DELETE FROM DET_DEFECT WHERE TEMPSPROD = ?` | `QuestionnaireSortie.cfc:394,580` | Cancel |

## Stored procedure calls

### `Nba_Sp_Insert_Production`
- **Called via:** `EXECUTE_STORED_PROC` (AutoFab SOAP)
- **Parameters:** `EMSEQ, 0, Operation, 0, Machine_Seq, 0, TRANSAC, 0, '', NISEQ, Inventaire_P, 0, 0, 1, 0, DateDebut, HeureDebut, DateFin, HeureFin, MPSEQ, 'Ecran de production pour Temps prod: Insertion', 0, '', COPMACHINE`
- **Output:** `TJSEQ` (via `retval`)
- **Call sites:** `ProduitFini.cfc:1399` (EPF add), `QuestionnaireSortie.cfc:1526` (status change)

### `Nba_Sp_Update_Production`
- **Called via:** `EXECUTE_STORED_PROC` (AutoFab SOAP)
- **Parameters:** `TJSEQ, DateFin, HeureFin, 'Ecran de production pour Temps prod: fermeture'`
- **Call site:** `QuestionnaireSortie.cfc:1445` (status change)

### `Nba_Sp_Insert_Sortie_Materiel`
- **Called via:** `EXECUTE_STORED_PROC` (AutoFab SOAP)
- **Parameters:** `TRITEM, 'CONOTRANS', DateDebut, HeureDebut, TotalQte, 'NOMEMPLOYE', '', 'Ecran de production pour SM', 0, '0'`
- **Output:** `NEWSMNOTRANS` (via `retval`)
- **Call site:** `SortieMateriel.cfc:2286`

### `Nba_Sp_Sortie_Materiel`
- **Called via:** `EXECUTE_STORED_PROC` (AutoFab SOAP)
- **Parameters:** `'SMNOTRANS', TRITEM, 'CONOTRANS', TotalQte, Operation_Seq, 'NOMEMPLOYE', 'NISTR_NIVEAU', '', TRNORELACHE`
- **Call sites:** `SortieMateriel.cfc:1756` (existing SM update), `SortieMateriel.cfc:2336` (new SM detail)
- **VCUT override:** `OPERATION=1` and `NISTR_NIVEAU="00101"`

### `Nba_Insert_Contenant`
- **Called via:** AutoFab SOAP
- **Parameters:** `22, stmSeq, entrepot, conNumero, 1`
- **Call site:** `ProduitFini.cfc` (EPF add, new container)

### `Nba_Insert_Det_Trans_Avec_Contenant`
- **Called via:** AutoFab SOAP
- **Parameters:** Transaction-specific parameter string
- **Call site:** `ProduitFini.cfc` (EPF add, container detail)

## AutoFab SOAP transaction calls

All executed via `support.cfc::envoiXMLGet()` (lines 3329-3513). The function builds a SOAP POST to `#application.AutoFabServeur#:#application.AutoFabPort#/#Commande#`. A 2-second sleep follows every call.

### `EXECUTE_TRANSACTION EPF/INS`
- Creates EPF header in ENTRERPRODFINI
- Parameters: semicolon-delimited positional string
- Returns: `PFSEQ`

### `EXECUTE_TRANSACTION EPFDETAIL/INS`
- Creates DET_TRANS rows for EPF
- Called twice per EPF: once with DtrSeq=0, once with DtrSeq=-1
- Parameters include: `TRSEQ, DtrSeq, EpfSeq, Inventaire, Entrepot, NiSeq, CONOTRANS, TRITEM, Qte, NSSEQ, 'NoSerie', LotSeq, TRNORELACHE`

### `EXECUTE_TRANSACTION EPF/REPORT`
- Posts/reports an EPF transaction
- Called for each EPF in `ListeEPFSEQ` during submit
- **VCUT uses this; non-VCUT uses `Nba_ReporteUnTransac` SP instead**

### `EXECUTE_TRANSACTION SM/REPORT`
- Posts/reports an SM transaction
- Called during submit for the batch SM

## Transaction boundaries and ordering

There are no explicit SQL transaction wrappers (`BEGIN TRANSACTION` / `COMMIT`) in the CFC code. Each database operation (direct SQL or AutoFab SOAP call) executes independently. This means:

1. A failure partway through submit leaves partial state
2. The cancel flow must clean up write-as-you-go artifacts
3. The 2-second sleep between AutoFab SOAP calls creates a sequential, non-atomic execution pattern

## Write timing

| Phase | Writes |
|-------|--------|
| Questionnaire open | None |
| Per-component "+" click | TEMPSPROD (new/update), ENTRERPRODFINI (new), DET_TRANS (new), CONTENANT (new), TRANSAC (update) |
| SM create/update | SORTIEMATERIEL (new/update), DET_TRANS (new), TEMPSPROD (SMNOTRANS link), TRANSAC (qty update) |
| Submit | TEMPSPROD (employee, status), TEMPSPRODEX (stop cause), EPF/SM REPORT, cNOMENCOP (VCUT complete), PL_RESULTAT, TRANSAC (TRSTATUTITEM) |
| Cancel | DELETE: TEMPSPRODEX, TEMPSPROD (non-KeepTJSEQ), DET_DEFECT, SORTIEMATERIEL, TRANSAC, DET_TRANS, ENTRERPRODFINI. UPDATE: TEMPSPROD (reset), TRANSAC (nullify TRANSAC_PERE) |
