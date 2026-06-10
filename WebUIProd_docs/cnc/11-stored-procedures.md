# Stored Procedures Reference — CNC

> **Files:** `server/api.cjs`, `queries/submitCorrection.cfm`
> **Depends on:** [10-database-tables](10-database-tables.md)
> **Used by:** [07-sm-transaction](07-sm-transaction.md), [08-submit-flow](08-submit-flow.md), [09-cancel-correction](09-cancel-correction.md)

## Summary

CNC uses the same core production SPs as other operation types, plus correction-specific SPs and a UDF for accessories. The key difference from VCUT: no AutoFab SOAP calls for EPF creation (CNC uses standard DB-driven EPF posting).

---

## Production

### `Nba_Sp_Update_Production`

**Purpose:** Close a TEMPSPROD row (finalize production entry).
**Used by:** submitQuestionnaire Step 9 (line 2366)

Key parameters: `TJSEQ`, `EMPLOYE`, `OPERATION`, `MACHINE`, `TRSEQ`, `TJPROD_TERMINE` (1 for COMP), `TJQTEPROD`, `TJQTEDEFECT`, start/end dates, `SMNOTRANS`.
**Output:** `ERREUR` (INT)

### `FctCalculTempsDeProduction`

**Purpose:** Table-valued function recalculating costs on TEMPSPROD.
**Used by:** submitQuestionnaire Step 10 (line 2381)
**Returns:** `CALCSYSTEMPSHOMME`, `CALCTEMPSHOMME`, `CALCEMCOUT`, `CALCOPCOUT`, `CALCMACOUT`

### `Nba_SP_Kpi_Insert_Valeur_Operation_Reel`

**Purpose:** Insert KPI values for the operation.
**Used by:** submitQuestionnaire Step 12 (line 2414)

---

## Sortie Materiel (SM)

### `Nba_Sp_Insert_Sortie_Materiel`

**Purpose:** Create a new SM transaction header.
**Used by:** submitQuestionnaire Step 6 (line 1984)

| Parameter | Type | Value |
|-----------|------|-------|
| `SMITEM` | INT | Transaction item |
| `SMNOORIGINE` | CHAR(9) | Order number |
| `DATE` / `HEURE` | CHAR | Current date/time |
| `SMQTEPRODUIT` | FLOAT | Total qty (good + defect) |
| `USER` | VARCHAR(30) | "WebUI New" |
| `SMNOTE` | VARCHAR(7500) | "Ecran de production pour SM" |

**Output:** `NEWSMNOTRANS` (CHAR 9), `SQLERREUR` (INT)

### `Nba_Sp_Sortie_Materiel`

**Purpose:** Create SM detail lines (DET_TRANS) based on BOM.
**Used by:** submitQuestionnaire Step 6 (line 2003)

### `Nba_Insert_Det_Trans_Avec_Contenant`

**Purpose:** Insert/update DET_TRANS with container reference.
**Used by:** SM BOM recalculation (line 2056)

### `Nba_ReporteUnTransac`

**Purpose:** Post a transaction (sets `TRPOSTER = 1`).
**Used by:** SM posting (line 2074), EPF posting (line 2206)

| Parameter | Type |
|-----------|------|
| `pTrSeq` | INT |
| `LaDate` | CHAR(10) |
| `LHeure` | CHAR(8) |
| `DTRORDRE_REPORT` | INT (0) |

**Output:** `DTRORDRE_REPORT_OUT`, `SQLERREUR`, `ERROR`

---

## Forklift Transfer

### `Nba_Insert_Transfer_Entrepot_Contenant`

**Purpose:** Create warehouse transfer task (with container).
**Used by:** submitQuestionnaire InsertTacheCariste (lines 2280-2300)

### `Nba_Insert_Transfer_Entrepot_Sans_Contenant`

**Purpose:** Create warehouse transfer task (without container).
**Used by:** submitQuestionnaire InsertTacheCariste (lines 2305-2325)

---

## Corrections

### `Nba_Corrige_Quantite_Transaction`

**Purpose:** Correct quantity on a DET_TRANS row (finished products or materials).
**Used by:** submitCorrection Steps 3a and 3e

| Parameter | Type |
|-----------|------|
| `DTRSEQ` | INT |
| `DTRQTE_CORRECTION` | FLOAT |
| `USAGER` | VARCHAR(50) |

### `Nba_Recalcul_Un_Produit_EnCours`

**Purpose:** Recalculate product-in-progress costs after correction.
**Used by:** submitCorrection final step (line 338)

---

## Accessories UDF

### `AUTOFAB_FctSelectVarCompo`

**Purpose:** Retrieve component variable values from the EXT database.
**Used by:** `getOperationAccessories.cfm` (line 774)

**Called as:**
```sql
DBO.AUTOFAB_FctSelectVarCompo(VC.TRANSAC, CNOP.CNOMENCLATURE, '@VARIABLE_NAME@')
```

**Variables queried for CNC:**
- `@SA1_ROUTER_BITS@` through `@SA5_PALETTS@` (currently hidden)
- `@TNUT1_CODE@` through `@TNUT4_CODE@` (T-nut inventory codes)
- `@TNUT1_QTY@` through `@TNUT4_QTY@` (T-nut quantities)

T-nut codes are looked up in `INVENTAIRE.INNOINV` for descriptions.

---

## Product In-Progress

### `Nba_Update_ProduitEnCours`

**Purpose:** Update product-in-progress record with costs.
**Used by:** submitQuestionnaire Step 8 (lines 2436-2445)

Receives `CoutOperation` (from TEMPSPROD costs) and `CoutMatiere` (from TRANSAC costs).
