# S003 — Full Questionnaire Audit: Old Software vs New Implementation

> Complete section-by-section audit of the old ColdFusion questionnaire screen.
> Documents the exact flow, interactivity, SQL stored procedures, and parameters.
> Our Express API (`server/api.cjs`) must call the **exact same stored procedures with the same parameters**.

---

## Table of Contents
1. [Questionnaire Assembly (Section Layout)](#1-questionnaire-assembly)
2. [Section-by-Section Flow Audit](#2-section-by-section-flow)
3. [Intermediate DB Operations (Write-As-You-Go)](#3-intermediate-db-operations)
4. [Final Submit Flow (ModifieTEMPSPROD)](#4-final-submit-flow)
5. [Cancel Flow (retireQuestionnaireSortie)](#5-cancel-flow)
6. [Stored Procedure Signatures](#6-stored-procedure-signatures)
7. [Status of Our Implementation](#7-status-of-our-implementation)
8. [Critical Differences & Required Fixes](#8-critical-differences)

---

## 1. Questionnaire Assembly

**Old file:** `QuestionnaireSortie.cfc` → `afficheTableauQuestionnaire()` (lines 9–174)

### How the questionnaire is opened
The user clicks STOP or COMP from the operation details. JS calls `afficheDiv('DivQuestionnaire',...)` which triggers the CFC to build the entire form HTML.

### Section order in the old software (exact)

```
<form id="FormQuestionnaireSortie">
  <input type="hidden" id="ListeTJSEQ">      ← tracks TJSEQ list (accumulated during interaction)
  <input type="hidden" id="ListeSMSEQ">       ← tracks SM sequence list
  <input type="hidden" id="ListeEPFSEQ">      ← tracks finished product PFSEQ list

  1. InfoCommande (Order Info)                  ← afficheInfoCommande()
  2. Employee                                    ← TempsProd.afficheEmploye()
  3. Mold Action dropdown                        ← (PRESS/CNC/Sand + COMP only)
  4. Stop Causes                                 ← afficheTableauCausesArret() [STOP or PROD status only]
  5. Defect Quantities                           ← QteDefect.afficheQteDefectueusesQS() [NOT VCUT]
  6. Good Quantity OR Finished Products           ← QteBonne.afficheTableauQteBonnesQS() [if ENTREPF=0]
     (Good Quantity has OK button)                 OR ProduitFini.afficheListeProduitFiniQS() [if ENTREPF>0]
  7. Material Output (Sortie Matériel)           ← SortieMateriel.afficheListeSortieMaterielQS()
                                                    [if UtiliseInventaire=1 OR VCUT]
  8. Footer: Cancel (X) + Submit (OK) buttons    ← afficheQuitterSoumettre()
</form>
```

### Conditions for each section

| Section | Condition | Old CF variable |
|---------|-----------|-----------------|
| Mold Action | `(PRESS or CNC or Sand) AND Statut = "COMP"` | `trouveOperation.FMCODE` |
| Stop Causes | `Statut = "STOP" OR Statut = "PROD"` | `arguments.Statut` |
| Defect Qty | `PRODUIT_CODE ≠ "VCUT" AND NO_INVENTAIRE ≠ "VCUT"` | `trouveOperation` |
| Good Qty (no EPF) | `ENTREPF = 0` (operation does NOT create finished products) | `trouveOPERATIONPARTRANSAC.ENTREPF` |
| Finished Products | `ENTREPF > 0` | `trouveOPERATIONPARTRANSAC.ENTREPF` |
| Material Output | `UtiliseInventaire = 1 OR VCUT` | `trouveOPERATIONPARTRANSAC.UtiliseInventaire` |

### ❌ Our implementation differences
- **Section order** — We place Employee, GoodQty, Defects in a row, then StopCause + MaterialOutput in a second row. Old software uses a vertical stack.
- **Missing hidden inputs** — We don't track `ListeTJSEQ`, `ListeSMSEQ`, `ListeEPFSEQ` because we use collect-then-submit. These are critical for the old software's intermediate operations.
- **Mold Action condition** — Our code uses `isCnc` which includes SAND, matching the old `FindNoCase("Sand",FMCODE)`.

---

## 2. Section-by-Section Flow

### 2.1 Order Info (`InfoCommande.afficheInfoCommande`)
- **Old**: Displays order number, machine, product, client, panel info, 4-column qty grid (QTÉ À FABRIQUER, QTÉ PRODUITE, QTÉ RESTANTE, QTÉ DÉFECT)
- **Our**: ✅ Matches. `OrderInfoBlock.tsx` displays same data.

### 2.2 Employee (`TempsProd.afficheEmploye`)
- **Old**: Shows current employee from TEMPSPROD. Has an input field `EmployeQS_{TJSEQ}` for the employee EMSEQ.
- **Our**: ✅ `EmployeeEntry.tsx` — uses employee code lookup via NumPad.
- **⚠️ Difference**: Old software stores EMSEQ in the field. Our code stores EMNOIDENT (badge number). The submit endpoint translates this via `WHERE EMNOIDENT = @emnoident`.

### 2.3 Mold Action
- **Old**: `<select Name="ActionMoule">` with options: value=1 (Conserver le moule), value=2 (Désinstaller le moule).
  - Only shown for PRESS/CNC/Sand machines on COMP status.
  - If action=2 on submit, calls `ajouteChariot(TJSEQ)`.
- **Our**: ✅ `MoldActionSection.tsx` — "keep" / "uninstall" values.
- **⚠️ Missing**: We don't call `AjouteChariot` SP when mold action = uninstall.

### 2.4 Stop Causes (`afficheTableauCausesArret`)
- **Old**: Shows when status is STOP or PROD. Three fields:
  - Primary cause: `<select name="QA_CAUSEP_0">` — loaded from `QA_CAUSEP` table, default QACPSEQ=8 (Production)
  - Secondary cause: `<select name="QA_CAUSES_0">` — loaded from `QA_CAUSES WHERE QA_CAUSEP = @primaryId`, default QACSSEQ=40
  - Notes: `<textarea name="EXTPRD_NOTE_0">`
  - Primary cause change triggers AJAX: `trouveCauseSecondaire()` to reload secondary dropdown.
- **Our**: ✅ `StopCauseSection.tsx` — matches with dynamic secondary loading.
- **⚠️ Difference**: Old software shows stop causes for both `STOP` and `PROD` status. Our code shows only for `isStop` (STOP type).

### 2.5 Defect Quantities (`QteDefect.afficheQteDefectueusesQS`)
- **Old software has a CRITICAL different flow**:
  - Shows a single empty row with qty input + defect type dropdown + OK button
  - Each defect row has its own **OK button** that triggers `AjouteModifieDetailDEFECTQS()`
  - **The OK button IMMEDIATELY writes to the database** (INSERT/UPDATE `DET_DEFECT` + UPDATE `TEMPSPROD.TJQTEDEFECT`)
  - After DB write, triggers `calculeQteSMQS()` to recalculate material quantities
  - Existing defects are displayed in a separate read-only table below
  - Each existing row has a Delete button that calls `retireDetailDEFECTQS()`
  - Delete also triggers `calculeQteSMQS()` recalc

- **Our implementation**:
  - ❌ **No immediate DB writes** — defects stay in React state until final submit
  - ❌ **No OK button per defect** — uses a + button to add rows to a table
  - ❌ **No SM recalculation on defect change** — material output only recalculates via `calcMaterialQty()` in React (frontend-only)

#### Old Defect Type Filtering (CRITICAL)
The old software filters defect types by **machine family**:
```
WHERE RRTYPE LIKE '%14%'
AND (
  (RRDESC_S LIKE 'Raw-Material%' OR RRDESC_S LIKE 'Visual%')
  OR IF PRESS: (RRCODE LIKE 'SCRAP-PRS%' OR RRDESC_P LIKE 'Presse%')
  OR IF CNC:   (RRCODE LIKE 'SCRAP-CNC%' OR RRDESC_P LIKE 'Usinage%')
  OR IF Sand:  (RRCODE LIKE 'SCRAP-SND%')
  OR IF PACK:  (RRCODE LIKE 'SCRAP-PKG%' OR RRDESC_P LIKE 'Emballage%')
  OR IF VENPR: (RRTYPE LIKE '%3%' OR RRTYPE LIKE '%20%')
)
```
- **Our `getDefectTypes.cfm`**: ❌ Only filters `WHERE RRTYPE LIKE '%14%'` — **missing machine family filter**. This means all defect types show for all machine types.

### 2.6 Good Quantity (`QteBonne.afficheTableauQteBonnesQS`)
- **Old software — TWO different good qty presentations**:

  **Path A: UtiliseInventaire = 1 (operation has BOM materials)**
  - Shows QTÉ PRODUITE input + **OK button**
  - OK button calls: `calculeQteSMQS(TRANSAC, COPMACHINE, NOPSEQ, Langue, Statut, TJSEQ, SMNOTRANS, '', '', '', '', '', 'Mod')`
  - **This triggers TWO sequential AJAX calls**:
    1. `SortieMateriel.cfc::ajouteSM()` — creates/reuses Sortie Matériel
    2. `SortieMateriel.cfc::calculeQteSMQS()` — recalculates DET_TRANS quantities via BOM
  - After both calls, calls `verifieStatutSortie()` + `afficheListeSortieMaterielQS()` to refresh the SM display

  **Path B: UtiliseInventaire = 0 (no BOM materials)**
  - Shows QTÉ PRODUITE input + **OK button**
  - OK button calls: `verifieStatutSortie()` (no SM operations)

  In both cases, the **OK button writes to the database immediately**.

- **Our implementation**:
  - ❌ **No OK button** — just a NumPad input that updates React state
  - ❌ **No `ajouteSM()` call** — SM is not created when user enters good qty
  - ❌ **No `calculeQteSMQS()` call** — DET_TRANS is not updated with recalculated quantities
  - ❌ **No `verifieStatutSortie()` call** — submit button state not validated

### 2.7 Finished Products (`ProduitFini.afficheListeProduitFiniQS`)
- **Old software**:
  - Shows product list with qty input + container input + OK button per product
  - OK button calls `AjouteModifieEPFQS()` which:
    1. Calls `ProduitFini.cfc::AjouteEPF()` — creates ENTRERPRODFINI + TEMPSPROD + DET_TRANS
    2. Updates `ListeEPFSEQ` and `ListeTJSEQ` hidden fields
    3. If `AvecSM = 1`, calls `calculeQteSMQS()` to recalculate material output
  - Each finished product creates its own TEMPSPROD row and EPF entry
  - VCUT has special handling: creates per-veneer entries

- **Our implementation**:
  - ❌ **No per-product OK button** — products stored in React state
  - ❌ **No `AjouteEPF()` call** — finished products not created during interaction
  - ❌ **No TEMPSPROD/EPF/DET_TRANS creation** — all deferred to final submit
  - ❌ **VCUT not implemented at all** in our finished products section

### 2.8 Material Output (Sortie Matériel) (`SortieMateriel.afficheListeSortieMaterielQS`)
- **Old software**:
  - **Display-only in the questionnaire** — shows materials from DET_TRANS
  - **Gets refreshed** after every OK button click (good qty, defect, EPF)
  - Shows columns: QTÉ UTILISÉE, SKID, ENTREPÔT, CODE, PRODUIT
  - For VCUT: shows dropdown selectors for CONTENANT and ENTREPOT per material row
  - Shows SM transaction number (e.g. "SM-079104")
  - Shows good qty and defect qty in a summary row per SM group
  - Uses complex query with OUTER APPLY to find materials by SMNOTRANS across multiple TEMPSPROD rows

- **Our implementation**:
  - ✅ **Display-only** — matches (no editing of materials)
  - ❌ **Static** — fetched once on page load, never refreshed
  - ❌ **Frontend-only calculation** — uses `calcMaterialQty()` in React. Old software stores actual calculated values in DET_TRANS via `Nba_Insert_Det_Trans_Avec_Contenant` SP.
  - ❌ **Missing columns**: no SKID dropdown, no ENTREPOT dropdown (VCUT only)
  - ❌ **Missing SM number display**
  - ❌ **Missing "insufficient stock" warning** (red rows with "INSUFFISANT" label)
  - ❌ **Missing BOM ratio display** for VCUT operations

---

## 3. Intermediate DB Operations (Write-As-You-Go)

### THIS IS THE FUNDAMENTAL ARCHITECTURE DIFFERENCE

The old software performs database writes at **every user interaction**, not just on final submit:

| User Action | Old Software DB Operation | Our Implementation |
|---|---|---|
| Enter good qty → click OK | `ajouteSM()` + `calculeQteSMQS()` → creates SM, DET_TRANS, updates TEMPSPROD | ❌ React state only |
| Enter defect qty → click OK | `AjouteModifieDetailDEFECTQS()` → INSERT/UPDATE DET_DEFECT, UPDATE TEMPSPROD.TJQTEDEFECT, then `calculeQteSMQS()` | ❌ React state only |
| Delete defect row | `retireDetailDEFECTQS()` → DELETE DET_DEFECT, UPDATE TEMPSPROD.TJQTEDEFECT, then `calculeQteSMQS()` | ❌ React state only |
| Add finished product → click OK | `AjouteEPF()` → INSERT TEMPSPROD, ENTRERPRODFINI, DET_TRANS, then `calculeQteSMQS()` | ❌ React state only |
| Click Cancel (X) | `retireQuestionnaireSortie()` → DELETE all intermediate TEMPSPROD/TEMPSPRODEX/DET_DEFECT rows, DELETE SORTIEMATERIEL/TRANSAC/DET_TRANS for SM, RESET original TEMPSPROD | ❌ Just navigate back |

### 3.1 `ajouteSM()` — Create/Reuse Sortie Matériel
**Old file:** `SortieMateriel.cfc` lines 1514–1900+

**Flow:**
1. Find latest PROD TEMPSPROD for this operation
2. Check if SM already exists (via TEMPSPROD.SMNOTRANS)
3. If no SM exists: call **`Nba_Sp_Insert_Sortie_Materiel`** → creates SM, returns NEWSMNOTRANS
4. Call **`Nba_Sp_Sortie_Materiel`** → creates DET_TRANS lines from BOM
5. Link SM to TEMPSPROD: `UPDATE TEMPSPROD SET SMNOTRANS = @sm, TJQTEPROD = @good, TJQTEDEFECT = @defect WHERE TJSEQ = @tjseq`
6. Return `{ListeSMSEQ, SMNOTRANS}` to frontend
7. Frontend stores SMSEQ in hidden field `ListeSMSEQ`

### 3.2 `calculeQteSMQS()` — Recalculate Material Quantities
**Old file:** `SortieMateriel.cfc` lines 824–1363

**Flow:**
1. Calculate `TotalQte = QteBonne + QteDefectueux`
2. Find all DET_TRANS lines for the SM(s)
3. For each material line:
   - **Non-VCUT**: Look up BOM ratio via `cNOMENCOP → cNOMENCLATURE.NIQTE`
     - If EPF has PFNOTRANS: `NouvelleQte = TotalQte × NIQTE`
     - Else: ratio-based calc
   - **VCUT**: Sum across all TJSEQ in batch with individual NIQTE
4. Call **`Nba_Insert_Det_Trans_Avec_Contenant`** for each DET_TRANS line with new quantity
5. Return `{ListeDTRSEQ, ListeQteSM}` to frontend
6. Frontend updates displayed quantities in the SM table

### 3.3 `AjouteModifieDetailDEFECTQS()` — Defect DB Write
**Old file:** `QteDefect.cfc` lines 743–847

**Flow:**
1. Find latest PROD TEMPSPROD for the operation (MODEPROD = 1)
2. Calculate cost estimates (LaValeurEstimeeUnitaire, LaValeurEstimeeTotale)
3. If DDSEQ not found (new): `INSERT INTO DET_DEFECT` with: TRANSAC, INVENTAIRE, MACHINE, EMPLOYE, DDQTEUNINV, DDDATE, RAISON, DDNOTE, DDVALEUR_ESTIME_UNITAIRE, DDVALEUR_ESTIME_TOTALE, TEMPSPROD, TRANSAC_PERE
4. If DDSEQ found (existing): `UPDATE DET_DEFECT SET` qty, reason, note, date, costs
5. Sum all defects: `SELECT SUM(DDQTEUNINV) FROM DET_DEFECT WHERE TEMPSPROD = @tjseq`
6. Update TEMPSPROD: `UPDATE TEMPSPROD SET TJQTEDEFECT = @total WHERE TJSEQ = @tjseq`
7. Return LeTJSEQ

**After this, the JS callback triggers `calculeQteSMQS()` if `AvecSM = 1`.**

---

## 4. Final Submit Flow (`ModifieTEMPSPROD`)

**Old file:** `QuestionnaireSortie.cfc` lines 599–1000+

### What final submit does in the OLD software
By the time the user clicks the final OK button, most DB work has ALREADY been done. The final submit:

1. **Reads form data** from `FormQuestionnaireSortie` (including hidden fields ListeTJSEQ, ListeSMSEQ, ListeEPFSEQ, SMNOTRANS)
2. **Finds last PROD TEMPSPROD** row
3. **Resets TJPROD_TERMINE=0** on all rows for this operation
4. **Updates employee** on the TJSEQ row
5. **Checks if production complete** → set TJPROD_TERMINE=1 if qty remaining ≤ 0
6. **Calls `ChangeTEMPSPROD`** — updates qty on PROD row, recalculates costs via `FctCalculTempsDeProduction`
7. **Saves stop causes** to TEMPSPRODEX (INSERT or UPDATE) — on the STOP row (MODEPROD=8), NOT the PROD row
8. **Reports material outputs** — for each SM found via ListeTJSEQ/SMNOTRANS:
   - Find SMSEQ from SORTIEMATERIEL
   - Call `ReportSortieMateriel` (uses `EXECUTE_TRANSACTION` with Clarion dates)
9. **Reports finished products** — for each EPF in ListeEPFSEQ:
   - Update DET_TRANS costs via `FctNbaRound(NOPValeurEstime_Unitaire)`
   - Call `ReportEntreeProduitFini` (uses `EXECUTE_TRANSACTION`)
10. **For each TJSEQ** — call `InsertEnCours` and `InsertTacheCariste`
11. **Call `Nba_Update_ProduitEnCours`** with:
    - CoutMatiere from `SELECT SUM(0-TRCOUTTRANS) FROM TRANSAC WHERE TRSEQ = @transac`
    - CoutOperation from `TJEMCOUT + TJOPCOUT + TJMACOUT`
12. **Auto-complete check** — if STOP but total qty ≥ target, auto-change to COMP
13. **Update cNOMENCOP quantities** (NOPQTETERMINE, NOPQTESCRAP, NOPQTERESTE)

### What OUR final submit does
Our `submitQuestionnaire.cfm` endpoint tries to do **everything in one shot** (both intermediate + final):

1. ✅ Find last PROD TEMPSPROD
2. ✅ Reset TJPROD_TERMINE=0
3. ✅ Update employee
4. ✅ Save stop causes to TEMPSPRODEX
5. ✅ Update quantities on TEMPSPROD (TJQTEPROD, TJQTEDEFECT)
6. ✅ Insert DET_DEFECT records
7. ⚠️ Create SM + DET_TRANS (attempts to replicate ajouteSM + calculeQteSMQS in one pass)
8. ✅ Call `Nba_Sp_Update_Production` to close the PROD row
9. ✅ Recalculate costs via `FctCalculTempsDeProduction`
10. ✅ Call `Nba_Update_ProduitEnCours`
11. ❌ **Missing**: `ReportSortieMateriel` (EXECUTE_TRANSACTION for SM posting)
12. ❌ **Missing**: `ReportEntreeProduitFini` (EXECUTE_TRANSACTION for EPF posting)
13. ❌ **Missing**: `InsertEnCours` flow
14. ❌ **Missing**: `InsertTacheCariste` flow
15. ❌ **Missing**: `AjouteChariot` when mold action = uninstall
16. ❌ **Missing**: Auto-complete check (STOP → COMP when qty met)
17. ❌ **Missing**: cNOMENCOP quantity updates (NOPQTETERMINE, NOPQTESCRAP, NOPQTERESTE)

### ⚠️ Stop Cause — WRONG TJSEQ target
**Old software**: Saves stop causes to TEMPSPRODEX on the **STOP row** (MODEPROD=8):
```sql
SELECT TOP 1 TJSEQ FROM TEMPSPROD
WHERE TRANSAC = @TRANSAC AND MODEPROD = 8
ORDER BY TJSEQ DESC
```
**Our software**: Saves stop causes on the **PROD row** (the TJSEQ found in step 1). This is WRONG — causes should be on the STOP status row.

---

## 5. Cancel Flow (`retireQuestionnaireSortie`)

**Old file:** `QuestionnaireSortie.cfc` lines 314–597

### What cancel does in the OLD software
Because the old software writes to DB during interaction, cancel must **undo all intermediate changes**:

1. For each TJSEQ in ListeTJSEQ (except the original PROD row for VCUT):
   - DELETE FROM TEMPSPRODEX WHERE TEMPSPROD = @tjseq
   - DELETE FROM TEMPSPROD WHERE TJSEQ = @tjseq
   - DELETE FROM DET_DEFECT WHERE TEMPSPROD = @tjseq
2. Delete the questionnaire's own TEMPSPROD row (if not the VCUT keeper)
3. For each SMSEQ in ListeSMSEQ:
   - DELETE FROM SORTIEMATERIEL WHERE SMNOTRANS = @sm
   - DELETE FROM TRANSAC WHERE TRNO = @sm
   - DELETE FROM DET_TRANS WHERE TRANSAC_TRNO = @sm
   - UPDATE TEMPSPROD SET SMNOTRANS = '' WHERE SMNOTRANS = @sm
4. For each EPFSEQ in ListeEPFSEQ:
   - DELETE FROM ENTRERPRODFINI WHERE PFSEQ = @epfseq
   - DELETE FROM TRANSAC WHERE TRNO = @pfnotrans
   - DELETE FROM DET_TRANS WHERE TRANSAC_TRNO = @pfnotrans
   - UPDATE TEMPSPROD SET ENTRERPRODFINI_PFNOTRANS = '' WHERE ...
5. Reset original PROD TEMPSPROD:
   - SET TJFINDATE = NULL, TJQTEPROD = 0, TJQTEDEFECT = 0, SMNOTRANS = '', ENTRERPRODFINI_PFNOTRANS = ''
6. DELETE FROM DET_DEFECT WHERE TEMPSPROD = @originalTjseq

### What OUR cancel does
Just navigates back: `navigate('/orders/${transac}/operation/${copmachine}')`. No DB cleanup needed because we don't write to DB during interaction.

**This is correct for our collect-then-submit pattern** — no cleanup needed if we haven't written anything.

---

## 6. Stored Procedure Signatures

### `Nba_Sp_Insert_Sortie_Materiel`
| # | Parameter | Type | Value |
|---|-----------|------|-------|
| 1 | @SMITEM | int | TRITEM (from ConstruitDonneesLocales) |
| 2 | @SMNOORIGINE | char(9) | CONOTRANS (from ConstruitDonneesLocales) |
| 3 | @DATE | char(10) | 'YYYY-MM-DD' (NOW) |
| 4 | @HEURE | char(5) | 'HH:mm' (NOW) |
| 5 | @SMQTEPRODUIT | float | Total qty (good + defect) |
| 6 | @USER | varchar(30) | Employee name |
| 7 | @SMNOSERIE | varchar(20) | '' |
| 8 | @SMNOTE | varchar(7500) | 'Ecran de production pour SM' |
| 9 | @LOT_FAB | int | 0 |
| 10 | @SMNORELACHE | int | 0 |
| **OUT** | @NEWSMNOTRANS | char(9) | New SM transaction number |
| **OUT** | @SQLERREUR | int | SQL error |

### `Nba_Sp_Sortie_Materiel`
| # | Parameter | Type | Value |
|---|-----------|------|-------|
| 1 | @SMNOTRANS | char(9) | SM transaction number |
| 2 | @SMITEM | int | TRITEM |
| 3 | @SMNOORIGINE | char(9) | CONOTRANS |
| 4 | @SMQTEPRODUIT | float | Total qty (good + defect) |
| 5 | @OPERATION | int | Operation_Seq |
| 6 | @USER | varchar(30) | Employee name |
| 7 | @NISTR_NIVEAU | varchar(500) | NISTR_NIVEAU (from VOperationParTransac) |
| 8 | @NOSERIE | varchar(20) | '' |
| 9 | @SMNORELACHE | int | TRNORELACHE (from TRANSAC) |
| **OUT** | @SQLERREUR | int | SQL error |

### `Nba_Insert_Det_Trans_Avec_Contenant`
| # | Parameter | Type | Value |
|---|-----------|------|-------|
| 1 | @TRSEQ | int | TRANSAC (the SM TRSEQ from DET_TRANS.TRANSAC) |
| 2 | @INSEQ | int | INVENTAIRE (material INSEQ) |
| 3 | @NSNO_SERIE | varchar(20) | '' |
| 4 | @ENSEQ | int | ENTREPOT (warehouse ENSEQ from DET_TRANS.ENTREPOT) |
| 5 | @DTRQTEUNINV | float | NouvelleQte (recalculated quantity) |
| 6 | @TRFACTEURCONV | float | 1 |
| 7 | @CONTENANT | int | CONTENANT SEQ (from DET_TRANS.CONTENANT) |
| 8 | @UTILISATEUR | varchar(50) | Employee name |
| **OUT** | @SQLERREUR | int | SQL error |
| **OUT** | @ERROR | int | Error code |
| **OUT** | @DTRSEQ | int | New/updated DET_TRANS sequence |

### `Nba_Sp_Update_Production`
| # | Parameter | Type | Value |
|---|-----------|------|-------|
| 1 | @TJSEQ | int | Row to close |
| 2 | @EMPLOYE | int | Employee EMSEQ |
| 3 | @OPERATION | int | Operation_Seq |
| 4 | @MACHINE | int | Machine_Seq |
| 5 | @TRSEQ | int | TRANSAC |
| 6 | @NO_SERIE | int | 0 |
| 7 | @NO_SERIE_NSNO_SERIE | varchar(20) | '' |
| 8 | @cNOMENCLATURE | int | CNOMENCLATURE or 0 |
| 9 | @INVENTAIRE_C | int | INVENTAIRE_SEQ |
| 10 | @TJVALIDE | bit | 1 |
| 11 | @TJPROD_TERMINE | bit | 0 or 1 (COMP) |
| 12 | @TJQTEPROD | float | Good qty |
| 13 | @TJQTEDEFECT | float | Defect qty |
| 14 | @StrDateD | char(10) | Original start date |
| 15 | @StrHeureD | char(8) | Original start time |
| 16 | @StrDateF | char(10) | End date (NOW) |
| 17 | @StrHeureF | char(8) | End time (NOW) |
| 18 | @sModeProd | varchar(5) | MODEPROD_MPCODE (left 5) |
| 19 | @TjNote | varchar(7500) | Note text |
| 20 | @SMNOTRANS | char(9) | SM transaction number |
| **OUT** | @ERREUR | int | Error code |

### `Nba_Update_ProduitEnCours`
| # | Parameter | Type | Value |
|---|-----------|------|-------|
| 1 | @TRANSAC | int | Transaction ID |
| 2 | @NOPSEQ | int | Operation NOPSEQ |
| 3 | @QteBon | float | Good quantity |
| 4 | @QteScrap | float | Defect quantity |
| 5 | @CoutMatiere | float | `SUM(0-TRCOUTTRANS) FROM TRANSAC WHERE TRSEQ = @transac` |
| 6 | @CoutOperation | float | `TJEMCOUT + TJOPCOUT + TJMACOUT` |
| **OUT** | @SQLERREUR | int | SQL error |
| **OUT** | @ERREUR | int | Error code |

### `ReportSortieMateriel` (via `EXECUTE_TRANSACTION`)
| Parameter | Value |
|-----------|-------|
| SMSEQ | From SORTIEMATERIEL.SMSEQ |
| DATE | Clarion date format |
| HEURE | Clarion time format |
| UTILISATEUR | Employee name |
| Traitement | "SM" |
| Operation | "REPORT" |
| Command | "EXECUTE_TRANSACTION" |

### `ReportEntreeProduitFini` (via `EXECUTE_TRANSACTION`)
| Parameter | Value |
|-----------|-------|
| PFSEQ | From ENTRERPRODFINI.PFSEQ |
| DATE | Clarion date format |
| HEURE | Clarion time format |
| UTILISATEUR | Employee name |
| Traitement | "EPF" |
| Operation | "REPORT" |
| Command | "EXECUTE_TRANSACTION" |

### `Nba_Sp_Insert_Production`
| # | Parameter | Type | Value |
|---|-----------|------|-------|
| 1 | @EMPLOYE | int | Employee EMSEQ |
| 2 | @EMPLOYE_TAUXH | float | 0 |
| 3 | @OPERATION | int | Operation_Seq |
| 4 | @OPERATION_TAUXH | float | 0 |
| 5 | @MACHINE | int | Machine_Seq |
| 6 | @MACHINE_TAUXH | float | 0 |
| 7 | @TRSEQ | int | TRANSAC |
| 8 | @NO_SERIE | int | 0 |
| 9 | @NO_SERIE_NSNO_SERIE | varchar(20) | '' |
| 10 | @cNOMENCLATURE | int | CNOMENCLATURE or 0 |
| 11 | @INVENTAIRE_C | int | INVENTAIRE_SEQ |
| 12 | @TJQTEPROD | float | 0 |
| 13 | @TJQTEDEFECT | float | 0 |
| 14 | @TJVALIDE | bit | 1 |
| 15 | @TJPROD_TERMINE | bit | 0 |
| 16 | @StrDateD | char(10) | 'YYYY-MM-DD' (start) |
| 17 | @StrHeureD | char(8) | 'HH:mm:ss' (start) |
| 18 | @StrDateF | char(10) | '' or 'YYYY-MM-DD' |
| 19 | @StrHeureF | char(8) | '' or 'HH:mm:ss' |
| 20 | @MODEPROD | int | MPSEQ |
| 21 | @TjNote | varchar(7500) | 'Ecran de production pour Temps prod New' |
| 22 | @LOT_FAB | int | 0 |
| 23 | @SMNOTRANS | char(9) | '' |
| 24 | @CNOMENCOP_MACHINE | int | COPMACHINE |
| **OUT** | @TJSEQ | int | New TJSEQ |
| **OUT** | @ERREUR | int | Error code |

---

## 7. Status of Our Implementation

### ✅ Working Correctly
- Order info display
- Employee lookup (via EMNOIDENT)
- Stop cause section (primary + secondary + notes)
- Mold action section (PRESS/CNC on COMP)
- Zero-qty confirmation dialog
- Basic form validation (employee required, cause required for STOP)

### ⚠️ Partially Working
- **submitQuestionnaire.cfm**: Creates SM + DET_TRANS in a single pass, but missing several steps
- **getMaterialOutput.cfm**: Complex query works but frontend doesn't refresh after intermediate operations
- **Defect types API**: Returns data but missing machine-family filter

### ❌ Not Working / Missing

| Feature | Status | Priority |
|---------|--------|----------|
| Defect types filtered by machine family | ❌ Missing | HIGH |
| DET_DEFECT.TRANSAC, INVENTAIRE, MACHINE, EMPLOYE, cost fields | ❌ Missing in INSERT | HIGH |
| `ReportSortieMateriel` (EXECUTE_TRANSACTION SM REPORT) | ❌ Missing | CRITICAL |
| `ReportEntreeProduitFini` (EXECUTE_TRANSACTION EPF REPORT) | ❌ Missing | CRITICAL |
| `InsertEnCours` flow | ❌ Missing | HIGH |
| `InsertTacheCariste` flow | ❌ Missing | MEDIUM |
| `AjouteChariot` on mold uninstall | ❌ Missing | MEDIUM |
| Auto-complete STOP→COMP check | ❌ Missing | HIGH |
| cNOMENCOP quantity updates | ❌ Missing | HIGH |
| Stop cause saved on WRONG TJSEQ (PROD instead of STOP row) | ❌ BUG | CRITICAL |
| Finished product flow (AjouteEPF + DET_TRANS costs + report) | ❌ Missing | HIGH |
| VCUT special handling | ❌ Not implemented | LOW (not needed yet) |
| Material output SM number display | ❌ Missing | LOW |
| Material output "insufficient stock" warning | ❌ Missing | LOW |

---

## 8. Critical Differences & Required Fixes

### Architecture Decision: Collect-Then-Submit vs Write-As-You-Go

Our React app uses **collect-then-submit** pattern. This is acceptable IF our final submit performs ALL the same DB operations that the old software does across its intermediate + final steps. Currently it does NOT.

### FIX 1: Stop Cause TJSEQ Target (CRITICAL BUG)
**Old**: Saves causes on the STOP row (`MODEPROD = 8`)
**Our**: Saves causes on the PROD row
**Fix**: In `submitQuestionnaire.cfm`, find the STOP TEMPSPROD row:
```sql
SELECT TOP 1 TJSEQ FROM TEMPSPROD
WHERE TRANSAC = @transac AND MODEPROD = 8
AND cNOMENCOP = @nopseq
ORDER BY TJSEQ DESC
```

### FIX 2: DET_DEFECT Missing Fields
**Old**: Inserts with TRANSAC, INVENTAIRE, MACHINE, EMPLOYE, DDVALEUR_ESTIME_UNITAIRE, DDVALEUR_ESTIME_TOTALE, TRANSAC_PERE
**Our**: Only inserts TEMPSPROD, RAISON, DDQTEUNINV, DDDATE
**Fix**: Add all missing fields to the INSERT statement.

### FIX 3: Defect Types Machine Filter
**Old**: Filters RAISON by machine family (PRESS/CNC/Sand/PACK/VENPR)
**Our**: Only filters by `RRTYPE LIKE '%14%'`
**Fix**: Pass machine family code (`fmcode`) to `getDefectTypes.cfm` and add the same WHERE clause conditions.

### FIX 4: Missing ReportSortieMateriel
After SM creation + DET_TRANS calculation, the old software calls `EXECUTE_TRANSACTION` with SM/REPORT to **post** the SM. We skip this entirely.
**Fix**: Implement the `Nba_ReporteUnTransac` call or equivalent EXECUTE_TRANSACTION call.

### FIX 5: Missing InsertEnCours + InsertTacheCariste + AjouteChariot
These create work-in-progress records and forklift tasks. They need to be called after the main update.

### FIX 6: Missing cNOMENCOP Updates
The old software updates NOPQTETERMINE, NOPQTESCRAP, NOPQTERESTE on the cNOMENCOP record after submit.

### FIX 7: Missing Auto-Complete Check
If STOP and total qty (accumulated across all production) meets the target, the old software auto-changes status to COMP.

### FIX 8: `ChangeTEMPSPROD` — Cost Recalculation on PROD Row
The old software's `ChangeTEMPSPROD` updates quantities on the **previous non-same-status PROD row** and recalculates costs via `FctCalculTempsDeProduction` on both that row AND the current TJSEQ. Our implementation only recalculates on the current row.
