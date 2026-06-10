# 03 — Execution Paths

Five VCUT-specific execution paths are traced below, in the order a worker would encounter them.

## Flow A — Questionnaire render

**Entrypoint:** `QuestionnaireSortie.afficheTableauQuestionnaire()`
**Source:** `QuestionnaireSortie.cfc:9-174`

### Step-by-step

1. **Load operation data** — calls `support.trouveUneOperation(TRANSAC, COPMACHINE, NOPSEQ, Langue)` → returns `trouveOperation` recordset including `PRODUIT_CODE`, `NO_INVENTAIRE`, `QTE_FORCEE`
2. **Load operation metadata** — queries `VOperationParTransac` → returns `trouveOPERATIONPARTRANSAC` with `ENTREPF`, `UtiliseInventaire`
3. **Render Info block** — `InfoCommande.afficheInfoCommandeQS()` (always)
4. **Render Employee section** — `TempsProd.afficheEmploye()` (always)
5. **Render Stop cause** — `QuestionnaireSortie.afficheTableauCausesArret()` (if Statut = STOP or had prior STOP/PROD)
6. **VCUT guard at line 54** — `PRODUIT_CODE NEQ "VCUT" AND NO_INVENTAIRE NEQ "VCUT"`:
   - **Non-VCUT**: render `QteDefect.afficheQteDefectueusesQS()` (defect quantities)
   - **VCUT**: **skip** defect section entirely
7. **ENTREPF branch at line 64**:
   - `ENTREPF = 0`: render `QteBonne.afficheTableauQteBonnesQS()` (regular good qty)
   - `ENTREPF = 1`: render `ProduitFini.afficheListeProduitFiniQS()` (finished products)
   - This branch is NOT VCUT-specific — VCUT follows whichever ENTREPF dictates
8. **Material exit guard at line 83** — `UtiliseInventaire EQ 1 OR NO_INVENTAIRE EQ "VCUT" OR PRODUIT_CODE EQ "VCUT"`:
   - **VCUT**: **always** render `SortieMateriel.afficheListeSortieMaterielQS()`
   - Non-VCUT: only if `UtiliseInventaire = 1`
9. **Mold action at line 134** — only for PRESS/CNC/Sand machines in COMP status (not VCUT-specific, but VCUT table-saws have FMCODE "TableSaw" which does not match)
10. **Render quit/submit buttons** — `afficheQuitterSoumettre()` (always)

### VCUT layout result

For a VCUT operation, the rendered form contains:
- Order info block
- Employee entry
- Stop cause (if STOP)
- **NO** defect quantities
- Finished products OR good quantities (per ENTREPF)
- **ALWAYS** material exit
- **NO** mold action (TableSaw FMCODE does not match PRESS/CNC/Sand)
- Quit/Submit buttons

---

## Flow B — EPF add per component

**Entrypoint:** `ProduitFini.AjouteEPF()`
**Source:** `ProduitFini.cfc:1311+`

### Step-by-step

1. **Load operation** — calls `trouveUneOperation` for VCUT detection
2. **Query product list** (`ProduitFini.cfc:385-391`) — VCUT uses CNOMENCLATURE:
   ```sql
   SELECT NISEQ, INVENTAIRE_M AS INVENTAIRE, INVENTAIRE_M_INNOINV AS INVENTAIRE_INNOINV,
          INVENTAIRE_M_INDESC1, INVENTAIRE_M_INDESC2, NIQTE AS QUANTITE
   FROM CNOMENCLATURE
   WHERE TRANSAC = ? AND INVENTAIRE_P_INNOINV = 'VCUT'
   ```
3. **Query NOPSEQ** (`ProduitFini.cfc:1350-1371`) — VCUT filters `v.OPERATION = 1` (any first operation) instead of exact `OPERATION_SEQ`:
   ```sql
   SELECT ... FROM VOperationParTransac v
   INNER JOIN cNOMENCOP c ON ...
   WHERE v.TRANSAC = ? AND v.OPERATION = 1  -- VCUT
   ```
4. **Create TEMPSPROD if cross-NOPSEQ** (`ProduitFini.cfc:1399-1423`) — when the component's `NOPSEQ` differs from the main operation's `NOPSEQ`, calls `Nba_Sp_Insert_Production` via AutoFab SOAP:
   ```
   EXECUTE_STORED_PROC Nba_Sp_Insert_Production
   Parameters: EMSEQ, 0, Operation, 0, Machine_Seq, 0, TRANSAC, 0, '',
               NISEQ, Inventaire_P, 0, 0, 1, 0,
               DateDebut, HeureDebut, DateFin, HeureFin,
               MPSEQ, 'Ecran de production pour Temps prod: Insertion', 0, '', COPMACHINE
   ```
   Output: `TJSEQ` (new TEMPSPROD row's sequence)
5. **Update TEMPSPROD** (`ProduitFini.cfc:1424-1433`):
   ```sql
   UPDATE TEMPSPROD SET TJQTEPROD = ?, CNOMENCOP = ?, INVENTAIRE_C = ? WHERE TJSEQ = ?
   ```
   **CRITICAL:** `CNOMENCOP` is set to `arguments.NOPSEQ` (the **main** operation NOPSEQ, e.g. 213759), **NOT** the component's `trouveNOPSEQ.NOPSEQ` (e.g. 213762). This ensures that the `qTJSEQPROD` query in Flow C (`WHERE CNOMENCOP = @nopseq ORDER BY TJSEQ DESC`) finds the freshly created row (which has no SMNOTRANS) instead of an older row with an existing SM link.
5a. **Append to ListeTJSEQ** (`ProduitFini.cfc:1451`):
   ```cfm
   <cfset arguments.ListeTJSEQ = ListAppend(arguments.ListeTJSEQ, LeTJSEQEPF)>
   ```
   The new TJSEQ is appended to the session-accumulated `ListeTJSEQ` and returned to the caller. On the first "+" click, `ListeTJSEQ` initially contains only `arguments.TJSEQ` (the current status TJSEQ, typically a STOP row — set at line 1534 if the list was empty). So the returned list is `"STOP_TJSEQ,NEW_PROD_TJSEQ"`.
6. **Resolve EPF NiSeq** (`ProduitFini.cfc:1947-1959`) — VCUT queries `VOperationParTransac` via `cNOMENCOP.INVENTAIRE_P`:
   ```sql
   SELECT NISEQ FROM VOperationParTransac
   WHERE TRANSAC = ? AND NOPSEQ IN (
     SELECT NOPSEQ FROM CNOMENCOP WHERE TRANSAC = ? AND INVENTAIRE_P = ?
   )
   ```
7. **Create EPF header** — AutoFab SOAP `EXECUTE_TRANSACTION EPF/INS`:
   - Returns `PFSEQ`
   - Then queries `ENTRERPRODFINI` for `PFNOTRANS`
8. **Create EPF detail rows** — AutoFab SOAP `EXECUTE_TRANSACTION EPFDETAIL/INS` (called twice: DtrSeq=0 and DtrSeq=-1)
9. **Update TEMPSPROD** (`ProduitFini.cfc:1505-1512`) — link `ENTRERPRODFINI_PFNOTRANS`, update `TJQTEPROD`:
   - **Cross-NOPSEQ**: Updates the newly created row (from step 4). `TJQTEPROD = arguments.Qte` (current entry qty).
   - **Same-NOPSEQ**: Updates the existing row (found in step 4 else-branch). `TJQTEPROD = arguments.Qte` (**overwrite**, not accumulate — see I10b). `ENTRERPRODFINI_PFNOTRANS` is overwritten with the new EPF. The old `SMNOTRANS` from a previous session persists on the row but becomes stale — the fresh Prod row from changeStatus (which ajouteSM finds) has no SMNOTRANS, ensuring a new SM is created (see I10a).
10. **Container handling** (if container specified):
    - `Nba_Insert_Contenant` via AutoFab SOAP (if new container)
    - `Nba_Insert_Det_Trans_Avec_Contenant` via AutoFab SOAP
    - `UPDATE TRANSAC SET CONTENANT_CON_NUMERO = ?`
11. **Return** — new PFSEQ, TJSEQ, and DtrSeq values to caller

### Downstream handoff
After `AjouteEPF` returns, the caller triggers Flow C (SM create/update).

---

## Flow C — SM create/recalc

**Entrypoint:** `SortieMateriel.ajouteSM()` — VCUT branch
**Source:** `SortieMateriel.cfc:1648-1836`

### Step-by-step

1. **VCUT branch entry** (`SortieMateriel.cfc:1648`):
   ```
   PRODUIT_CODE EQ "VCUT" OR NO_INVENTAIRE EQ "VCUT"
   AND len(arguments.ListeTJSEQ) GT 0
   ```

2. **Find PROD TJSEQ** (`SortieMateriel.cfc:1651-1662`):
   ```sql
   SELECT TOP 1 TJSEQ FROM TEMPSPROD
   WHERE CNOMENCOP = ? AND MODEPROD_MPCODE = 'PROD'
   ORDER BY TJSEQ DESC
   ```

3. **Three-pass SM lookup** (`SortieMateriel.cfc:1666-1704`):
   - Pass 1: Query TEMPSPROD by `TJSEQ = LeTJSEQProd AND MODEPROD_MPCODE = 'PROD'` for existing `SMNOTRANS`
   - Pass 2: If empty, query `SORTIEMATERIEL WHERE SMSEQ IN (ListeSMSEQ)`
   - Pass 3: If still empty, query `TEMPSPROD WHERE TJSEQ IN (ListeTJSEQ) AND MODEPROD_MPCODE = 'PROD'`

4. **Compute batch quantity** (`SortieMateriel.cfc:1706-1718`):
   ```sql
   SELECT MAX(ISNULL(TJQTEPROD,0)) AS TOTALQTEPROD, MAX(ISNULL(TJQTEDEFECT,0)) AS TOTALQTEDEFECT
   FROM TEMPSPROD WHERE TJSEQ IN (<ListeTJSEQ>) AND MODEPROD_MPCODE = 'PROD'
   ```
   **Note:** Uses MAX (not SUM) to avoid double-counting across batch components.

   **CRITICAL:** This `TotalQteVCUT` overrides the pre-VCUT `TotalQte = arguments.QteBonne + arguments.QteDefectueux` (line 1645). The frontend's `QteBonne` parameter is **NOT used** for SM creation in the VCUT path — only `TotalQteVCUT` from this query is used. Both `InsertSortieMateriel` (step 5) and `Nba_Sp_Sortie_Materiel` (step 6) receive `TotalQteVCUT` as the quantity, via `ConstruitDonneesLocales` (line 1722-1731) which passes `QteBonne=#TotalQteVCUT_Bonne#`.

5. **Branch: no existing SM** (`SortieMateriel.cfc:1733-1748`):
   - Calls `InsertSortieMateriel()` which:
     a. `Nba_Sp_Insert_Sortie_Materiel` → outputs `NEWSMNOTRANS`
     b. `Nba_Sp_Sortie_Materiel` → creates DET_TRANS detail rows
     c. Updates TEMPSPROD with SMNOTRANS, TJQTEPROD, TJQTEDEFECT

6. **Branch: existing SM** (`SortieMateriel.cfc:1750-1793`):
   - Calls `Nba_Sp_Sortie_Materiel` via AutoFab SOAP to update DET_TRANS rows
   - Parameters include `TotalQteVCUT` (the MAX-based batch total)

7. **Batch TEMPSPROD link** (`SortieMateriel.cfc:1797-1813`):
   ```sql
   UPDATE TEMPSPROD SET SMNOTRANS = ?
   WHERE TJSEQ IN (<ListeTJSEQ>)
   AND MODEPROD_MPCODE = 'PROD'
   AND ISNULL(NULLIF(LTRIM(RTRIM(SMNOTRANS)),''),'') = ''
   ```
   Then also updates the single PROD TJSEQ unconditionally.

### SM recalculation (`calculeQteSMQS` — VCUT path)

**Source:** `SortieMateriel.cfc:1070-1205`

Triggered when quantities change. Uses a weighted-ratio query:

```sql
-- qQteMatiereVCUT (lines 1081-1115)
SELECT SUM(
  (CASE WHEN TP.TJSEQ = @currentTJ THEN @TotalCourant ELSE TJQTEPROD+TJQTEDEFECT END)
  * ISNULL(RATIO.NIQTE, 0)
) AS QTE_CIBLE
FROM TEMPSPROD TP
INNER JOIN cNOMENCOP COP ON COP.TRANSAC = TP.TRANSAC AND COP.INVENTAIRE_P = TP.INVENTAIRE_C
OUTER APPLY (
  SELECT MAX(CN.NIQTE) AS NIQTE
  FROM cNOMENCLATURE CN
  WHERE CN.NISEQ_PERE = COP.CNOMENCLATURE AND CN.INVENTAIRE_M = @smMaterial
) RATIO
WHERE TP.TRANSAC = ? AND TP.SMNOTRANS = ? AND TP.TJSEQ IN (<ListeTJSEQ>)
AND TP.MODEPROD_MPCODE = 'PROD'
```

The ratio (`NIQTE`) comes from `cNOMENCLATURE` child rows — the BOM relationship between each component and the SM material. If `QTE_CIBLE = 0`, the update is skipped (protection against zeroing out SM).

When `QTE_CIBLE > 0`:
```sql
UPDATE SORTIEMATERIEL SET SMQTEPRODUIT = ? WHERE SMNOTRANS = ?
UPDATE TRANSAC SET TRQTETRANSAC = ?, TRQTEUNINV = ?, TRQTEINV_ESTIME = ? WHERE TRSEQ = ?
```

---

## Flow D — Submit

**Entrypoint:** `QuestionnaireSortie.ModifieTEMPSPROD()` then `ajouteModifieStatut()`
**Source:** `QuestionnaireSortie.cfc:599-1635`

### `ModifieTEMPSPROD` step-by-step

1. **Load operation data** — `trouveUneOperation`, `trouveOPERATIONPARTRANSAC`
2. **Update employee** (`QuestionnaireSortie.cfc:700-706`):
   ```sql
   UPDATE TEMPSPROD SET EMPLOYE = ?, EMPLOYE_EMNO = ?, EMPLOYE_EMNOM = ? WHERE TJSEQ = ?
   ```
3. **VCUT skip: changeTEMPSPROD** (`QuestionnaireSortie.cfc:708-730`) — the block that updates `TJQTEPROD`, `TJQTEDEFECT`, `TJNOTE`, `CNOMENCOP`, `INVENTAIRE_C` on the PROD row is **entirely skipped** for VCUT (each component already has its own values set during Flow B)
4. **Save stop causes** (`QuestionnaireSortie.cfc:752-769`) — if `form.QA_CAUSEP_0` exists:
   ```sql
   INSERT/UPDATE TEMPSPRODEX (TEMPSPROD, QA_CAUSEP, QA_CAUSES, EXTPRD_NOTE)
   ```
5. **EPF posting** — for each EPF in `ListeEPFSEQ`:
   - **VCUT path** (`QuestionnaireSortie.cfc:918-932`): does NOT set `TJPROD_TERMINE = 1` or `PL_RESULTAT.PR_TERMINE = 1`
   - Posts via AutoFab SOAP `EXECUTE_TRANSACTION EPF/REPORT`
6. **SM posting** — AutoFab SOAP `EXECUTE_TRANSACTION SM/REPORT`
7. **Compute completion threshold** (`QuestionnaireSortie.cfc:1124-1128`):
   ```
   LaQteTotale = trouveOperation.QTE_FORCEE  (VCUT)
   ```
8. **Auto-COMP guard** (`QuestionnaireSortie.cfc:1130`): VCUT is excluded from auto-STOP→COMP promotion
9. **Branch: VCUT complete** (`QuestionnaireSortie.cfc:1186-1290`) — when `QTE_FORCEE - LeTJQTEPROD <= 0` AND `NO_INVENTAIRE EQ "VCUT"`:
   - Loop `ListeEPFSEQ`: query TEMPSPROD quantities by `INVENTAIRE_C`, update `cNOMENCOP` (`NOPQTETERMINE`, `NOPQTESCRAP`)
   - Update `PL_RESULTAT SET PR_TERMINE = 1` per cNOMENCOP
   - Loop `ListeTJSEQ`: `UPDATE TEMPSPROD SET MODEPROD_MPCODE = 'COMP', TJFINDATE = NOW(), TJPROD_TERMINE = 1`
   - **Hardcode** at line 1270: `UPDATE TEMPSPROD SET TJQTEPROD = 1 WHERE INVENTAIRE_C = 10525`
   - Close transaction: `UPDATE TRANSAC SET TRSTATUTITEM = 1`
10. **Branch: VCUT incomplete** (`QuestionnaireSortie.cfc:1282`): reset `cNOMENCOP` quantities to 0

### `ajouteModifieStatut` step-by-step

**Source:** `QuestionnaireSortie.cfc:1295-1635`

1. **Close previous TEMPSPROD** — `Nba_Sp_Update_Production` (line 1445)
2. **Create new TEMPSPROD row** — `Nba_Sp_Insert_Production` (line 1526) with new status
3. **Update new row** (lines 1552-1563):
   ```sql
   UPDATE TEMPSPROD SET CNOMENCOP = ?, INVENTAIRE_C = ? WHERE TJSEQ = ?
   UPDATE PL_RESULTAT SET PR_DEBUTE = 1, MODEPROD = ? WHERE CNOMENCOP = ?
   ```
4. **Zero cost fields** (lines 1567-1578) for STOP/COMP/PAUSE:
   ```sql
   UPDATE TEMPSPROD SET TJEMTAUXHOR=0, TJOPTAUXHOR=0, TJMATAUXHOR=0,
     TJSYSTEMPSHOMME=0, TJTEMPSHOMME=0, TJEMCOUT=0, TJOPCOUT=0, TJMACOUT=0
   WHERE TJSEQ = ?
   ```
5. **VCUT skip: cost recalculation** (`QuestionnaireSortie.cfc:1581`) — the `FctCalculTempsDeProduction` block is guarded by `NO_INVENTAIRE NEQ "VCUT" AND PRODUIT_CODE NEQ "VCUT"`. VCUT skips all cost recalculation.
6. **Return** — JSON struct `{ LeTJSEQ, MODEPROD_MPCODE }`

---

## Flow E — Cancel

**Entrypoint:** `QuestionnaireSortie.retireQuestionnaireSortie()`
**Source:** `QuestionnaireSortie.cfc:314-597`

### Step-by-step

1. **Load operation** — `trouveUneOperation` → set `IsVCUT` flag (line 340)
2. **Find KeepTJSEQ** (lines 348-374) — VCUT only:
   - Query all TEMPSPROD rows for candidate TJSEQs from `ListeTJSEQ ∪ TJSEQ`
   - Select highest TJSEQ where `MODEPROD_MPCODE = 'PROD'`
   - Fallback: highest TJSEQ of any mode
3. **Delete ListeTJSEQ rows** (lines 394-423) — for each TJSEQ:
   - VCUT: skip if `CeTJSEQ = KeepTJSEQ`
   - Execute:
     ```sql
     DELETE FROM TEMPSPRODEX WHERE TEMPSPROD = ?
     DELETE FROM TEMPSPROD WHERE TJSEQ = ?
     DELETE FROM DET_DEFECT WHERE TEMPSPROD = ?
     ```
4. **Delete primary TJSEQ** (lines 430-446):
   - VCUT guard: skip if `TJSEQ = KeepTJSEQ`
   - Same three DELETE statements
5. **Verify KeepTJSEQ still exists** (lines 459-467) — query TEMPSPROD to confirm; set `LeTJSEQ = KeepTJSEQ`
6. **Delete SM records** (lines 478-523) — for each SMSEQ in `ListeSMSEQ`:
   ```sql
   -- lookup SMNOTRANS from SORTIEMATERIEL
   DELETE FROM SORTIEMATERIEL WHERE SMNOTRANS = ?
   DELETE FROM TRANSAC WHERE TRNO = ?
   DELETE FROM DET_TRANS WHERE TRANSAC_TRNO = ?
   UPDATE TEMPSPROD SET SMNOTRANS = '' WHERE SMNOTRANS = ?
   ```
   Note: `SMNOTRANS` is truncated to 9 characters via `Left(..., 9)`.
7. **Delete EPF records** (lines 526-577) — for each PFSEQ in `ListeEPFSEQ`:
   ```sql
   -- lookup PFNOTRANS from ENTRERPRODFINI
   UPDATE ENTRERPRODFINI SET PFPOSTER = 0 WHERE PFSEQ = ?
   DELETE FROM ENTRERPRODFINI WHERE PFSEQ = ?
   UPDATE TRANSAC SET TRANSAC_PERE = NULL WHERE TRANSAC_PERE = <TRSEQ>
   DELETE FROM TRANSAC WHERE TRNO = <PFNOTRANS>
   DELETE FROM DET_TRANS WHERE TRANSAC_TRNO = <PFNOTRANS>
   UPDATE TEMPSPROD SET ENTRERPRODFINI_PFNOTRANS = '' WHERE ENTRERPRODFINI_PFNOTRANS = <PFNOTRANS>
   ```
8. **Reset surviving PROD row** (lines 580-595):
   ```sql
   UPDATE TEMPSPROD SET TJFINDATE=NULL, TJQTEPROD=0, TJQTEDEFECT=0,
     SMNOTRANS='', ENTRERPRODFINI_PFNOTRANS=''
   WHERE TJSEQ = ?
   DELETE FROM DET_DEFECT WHERE TEMPSPROD = ?
   ```

### Post-cancel state
After cancel, the operation is back to its pre-questionnaire state: one PROD TEMPSPROD row with zero quantities, no SM, no EPF, no defects. The worker can re-enter the questionnaire or continue production.
