# Stored Procedures Reference

> **Files:** `server/api.cjs`
> **Depends on:** [09-database-tables](09-database-tables.md)
> **Used by:** [04-pf-transaction](04-pf-transaction.md), [06-sm-transaction](06-sm-transaction.md), [07-submit-flow](07-submit-flow.md)

## Summary

Eight stored procedures and two AutoFab SOAP API calls are used in the VCUT flow. This document lists each with its parameters and outputs.

---

## `Nba_Sp_Insert_Production`

**Purpose:** Create a new TEMPSPROD row for a component.
**Used by:** `addVcutQty.cfm` (Step B) — when component NOPSEQ differs from main.
**Parameters:** employee, operation, machine, CNOMENCOP, INVENTAIRE_C, dates
**Output:** `TJSEQ` (INT)

## `Nba_Sp_Insert_Sortie_Materiel`

**Purpose:** Create a new SM transaction header.
**Used by:** `submitQuestionnaire.cfm` (Step 6, line 1984)

| Parameter | Type | Value |
|-----------|------|-------|
| `SMITEM` | INT | Transaction item number |
| `SMNOORIGINE` | CHAR(9) | Order transaction number |
| `DATE` | CHAR(10) | Current date |
| `HEURE` | CHAR(5) | Current time |
| `SMQTEPRODUIT` | FLOAT | Total quantity (good + defect) |
| `USER` | VARCHAR(30) | "WebUI New" |
| `SMNOSERIE` | VARCHAR(20) | "" |
| `SMNOTE` | VARCHAR(7500) | "Ecran de production pour SM" |
| `LOT_FAB` | INT | 0 |
| `SMNORELACHE` | INT | 0 |

**Output:** `NEWSMNOTRANS` (CHAR 9), `SQLERREUR` (INT)

## `Nba_Sp_Sortie_Materiel`

**Purpose:** Create SM detail lines (`DET_TRANS`) based on BOM.
**Used by:** `submitQuestionnaire.cfm` (Step 6, line 2003)

| Parameter | Type | Value |
|-----------|------|-------|
| `SMNOTRANS` | CHAR(9) | SM transaction number |
| `SMITEM` | INT | Item number |
| `SMNOORIGINE` | CHAR(9) | Order number |
| `SMQTEPRODUIT` | FLOAT | Total quantity |
| `OPERATION` | INT | Operation ID |
| `USER` | VARCHAR(30) | "WebUI New" |
| `NISTR_NIVEAU` | VARCHAR(500) | BOM level |
| `NOSERIE` | VARCHAR(20) | "" |
| `SMNORELACHE` | INT | Release number |

**Output:** `SQLERREUR` (INT)

## `Nba_Insert_Det_Trans_Avec_Contenant`

**Purpose:** Insert or update a `DET_TRANS` row with container reference.
**Used by:** SM BOM recalculation (line 2056), `addVcutQty.cfm` (Step F)

| Parameter | Type |
|-----------|------|
| `TRSEQ` | INT |
| `INSEQ` | INT |
| `NSNO_SERIE` | VARCHAR(20) |
| `ENSEQ` | INT |
| `DTRQTEUNINV` | FLOAT |
| `TRFACTEURCONV` | FLOAT |
| `CONTENANT` | INT |
| `UTILISATEUR` | VARCHAR(50) |

**Output:** `DTRSEQ` (INT), `SQLERREUR` (INT), `ERROR` (INT)

## SM and EPF Posting (EXECUTE_TRANSACTION REPORT)

**Purpose:** Post (report) SM and EPF transactions — sets `TRPOSTER = 1`.
**Used by:** SM posting in submitQuestionnaire, EPF posting in submitQuestionnaire.
**Mechanism:** AutoFab SOAP API `EXECUTE_TRANSACTION` with operation `REPORT`.

**SM REPORT** (old software: `ReportSortieMateriel`, QuestionnaireSortie.cfc:1767-1779):
```
callAutofab("EXECUTE_TRANSACTION", params, "SM", "REPORT")
Params: {SMSEQ};{LaDateClarion};{LaHeureClarion};'NomEmploye';'';'';'';'''';'''';'';'';'';''
```
- `SMSEQ`: From `SORTIEMATERIEL.SMSEQ` (NOT TRANSAC.TRSEQ)

**EPF REPORT** (old software: `ReportEntreeProduitFini`, QuestionnaireSortie.cfc:2129-2139):
```
callAutofab("EXECUTE_TRANSACTION", params, "EPF", "REPORT")
Params: {PFSEQ};{LaDateClarion};{LaHeureClarion};'NomEmploye';'';'';'';'''';'''';'';'';'';''
```
- `PFSEQ`: From `ENTRERPRODFINI.PFSEQ` (NOT TRANSAC.TRSEQ)

**Note:** `Nba_ReporteUnTransac` SP exists but is NOT used by the old software for SM/EPF posting. The AutoFab SOAP API handles posting internally.

## `Nba_Insert_Contenant`

**Purpose:** Create a new container record.
**Used by:** `addVcutQty.cfm` (Step F) — when container doesn't exist.
**Called via:** AutoFab SOAP API with parameters: `22, stmSeq, entrepot, conNumero, 1`

## `Nba_Sp_Update_Production`

**Purpose:** Close a TEMPSPROD row (finalize production entry).
**Used by:** `submitQuestionnaire.cfm` (Step 8, line 2366)

| Parameter | Type | Value |
|-----------|------|-------|
| `TJSEQ` | INT | TEMPSPROD sequence |
| `EMPLOYE` | INT | Employee sequence |
| `OPERATION` | INT | Operation ID |
| `MACHINE` | INT | Machine ID |
| `TRSEQ` | INT | TRANSAC (work order) |
| `NO_SERIE` | INT | 0 |
| `NO_SERIE_NSNO_SERIE` | VARCHAR(20) | "" |
| `cNOMENCLATURE` | INT | BOM reference |
| `INVENTAIRE_C` | INT | Product inventory |
| `TJVALIDE` | BIT | 1 |
| `TJPROD_TERMINE` | BIT | 1 for COMP, 0 for STOP |
| `TJQTEPROD` | FLOAT | Good quantity |
| `TJQTEDEFECT` | FLOAT | Defect quantity |
| `StrDateD` / `StrHeureD` | CHAR | Start date/time |
| `StrDateF` / `StrHeureF` | CHAR | End date/time |
| `sModeProd` | VARCHAR(5) | PROD/STOP/COMP |
| `TjNote` | VARCHAR(7500) | "Ecran de production pour Temps prod New" |
| `SMNOTRANS` | CHAR(9) | SM transaction number |

**Output:** `ERREUR` (INT)

## `FctCalculTempsDeProduction`

**Purpose:** Table-valued function that recalculates costs on a TEMPSPROD row.
**Used by:** `submitQuestionnaire.cfm` (Step 9, line 2381)
**Returns:** `CALCSYSTEMPSHOMME`, `CALCTEMPSHOMME`, `CALCEMCOUT`, `CALCOPCOUT`, `CALCMACOUT`

## `Nba_SP_Kpi_Insert_Valeur_Operation_Reel`

**Purpose:** Insert KPI values for the operation.
**Used by:** `submitQuestionnaire.cfm` (Step 11, line 2414)
**Parameters:** `NOPSEQ` (INT)
**Output:** `SQLERREUR` (INT)

---

## AutoFab SOAP API Calls

Used by `addVcutQty.cfm` for EPF creation:

| Command | Traitement | Operation | Purpose |
|---------|-----------|-----------|---------|
| `EXECUTE_TRANSACTION` | `EPF` | `INS` | Create EPF header → returns `PFSEQ` |
| `EXECUTE_TRANSACTION` | `EPFDETAIL` | `INS` (DtrSeq=0) | Create EPF transaction header |
| `EXECUTE_TRANSACTION` | `EPFDETAIL` | `INS` (DtrSeq=-1) | Create EPF transaction detail with container |
