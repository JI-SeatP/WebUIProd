# Status Action Buttons — Stored Procedures

## 1. `Nba_Sp_Insert_Production`

Creates a new TEMPSPROD row for a given production status.

### Parameter Signature

The parameters are positional in the old ColdFusion (comma-separated string passed to XML API). In the new Express code, they are named parameters passed to `mssql`.

| #  | Name                    | SQL Type           | Old CF Type         | Value Source                          | Notes |
|----|-------------------------|--------------------|---------------------|---------------------------------------|-------|
| 1  | `EMPLOYE`               | INT                | CF_SQL_INTEGER      | Session employee EMSEQ                |       |
| 2  | `EMPLOYE_TAUXH`         | FLOAT              | CF_SQL_FLOAT        | Always `0`                            | Rate not used at insert time |
| 3  | `OPERATION`             | INT                | CF_SQL_INTEGER      | `vEcransProduction.OPERATION_SEQ`     |       |
| 4  | `OPERATION_TAUXH`       | FLOAT              | CF_SQL_FLOAT        | Always `0`                            | Rate not used at insert time |
| 5  | `MACHINE`               | INT                | CF_SQL_INTEGER      | `vEcransProduction.MACHINE`           |       |
| 6  | `MACHINE_TAUXH`         | FLOAT              | CF_SQL_FLOAT        | Always `0`                            | Rate not used at insert time |
| 7  | `TRSEQ`                 | INT                | CF_SQL_INTEGER      | `TRANSAC` (work order ID)             |       |
| 8  | `NO_SERIE`              | INT                | CF_SQL_INTEGER      | Always `0`                            | Serial number not used |
| 9  | `NO_SERIE_NSNO_SERIE`   | VARCHAR(20)        | CF_SQL_VARCHAR(20)  | Always `''` (empty string)            |       |
| 10 | `cNOMENCLATURE`         | INT                | CF_SQL_INTEGER      | Nomenclature ID (see resolution below)|       |
| 11 | `INVENTAIRE_C`          | INT                | CF_SQL_INTEGER      | Inventory SEQ (see resolution below)  |       |
| 12 | `TJQTEPROD`             | FLOAT              | CF_SQL_FLOAT        | Always `0` for new row                |       |
| 13 | `TJQTEDEFECT`           | FLOAT              | CF_SQL_FLOAT        | Always `0` for new row                |       |
| 14 | `TJVALIDE`              | BIT                | CF_SQL_BIT          | Always `1`                            |       |
| 15 | `TJPROD_TERMINE`        | BIT                | CF_SQL_BIT          | Always `0`                            |       |
| 16 | `StrDateD`              | CHAR(10)           | CF_SQL_CHAR(10)     | Start date `yyyy-MM-dd` from GETDATE()|       |
| 17 | `StrHeureD`             | CHAR(8)            | CF_SQL_CHAR(8)      | Start time `HH:mm:ss` from GETDATE() |       |
| 18 | `StrDateF`              | CHAR(10)           | CF_SQL_CHAR(10)     | End date — empty `''` for new row     | Old sets to NOW for COMP status |
| 19 | `StrHeureF`             | CHAR(8)            | CF_SQL_CHAR(8)      | End time — empty `''` for new row     | Old sets to NOW for COMP status |
| 20 | `MODEPROD`              | INT                | CF_SQL_INT          | `MODEPROD.MPSEQ` for the new status   |       |
| 21 | `TjNote`                | VARCHAR(7500)      | CF_SQL_VARCHAR(7500)| `'Ecran de production pour Temps prod'` (old) or `'Ecran de production pour Temps prod New'` (new) | |
| 22 | `LOT_FAB`               | INT                | CF_SQL_INTEGER      | Always `0`                            |       |
| 23 | `SMNOTRANS`             | CHAR(9)            | CF_SQL_CHAR(9)      | Always `''` (empty string)            |       |
| 24 | `CNOMENCOP_MACHINE`     | INT                | CF_SQL_INT          | `COPMACHINE` or `0`                   |       |

### Output Parameters

| Name     | SQL Type | Description                         |
|----------|----------|-------------------------------------|
| `TJSEQ`  | INT      | The newly created TEMPSPROD row ID  |
| `ERREUR` | INT      | Error code (0 = success)            |

### cNOMENCLATURE Resolution (Parameter #10)

**Old software** resolves via `ConstruitDonneesLocales()`:
1. If `Matiere_NiSeq > 0` → use `Matiere_NiSeq`
2. Else if `Fabrique_NiSeq > 0` → use `Fabrique_NiSeq`
3. Else → empty

**New software** uses `vEcransProduction.CNOMENCLATURE` directly.

### INVENTAIRE_C Resolution (Parameter #11)

**Old software** resolves via `ConstruitDonneesLocales()`:
1. If `Matiere_InSeq > 0` OR `Matiere_InSeq == -1` → use `Matiere_InSeq`
2. Else if `Inventaire_P != Transac_InSeq` → use `Inventaire_P`
3. Else → empty

**New software** uses `vEcransProduction.INVENTAIRE_SEQ` directly.

### Old CF Parameter String (Example)

From `QuestionnaireSortie.cfc:1524`:
```
"100,0,5678,0,42,0,1068112,0,'',9876,5432,0,0,1,0,'2024-03-15','14:30:00','','',3,'Ecran de production pour Temps prod',0,'',213768"
```

Positional mapping:
```
EMSEQ=100, EMPLOYE_TAUXH=0, OPERATION=5678, OPERATION_TAUXH=0,
MACHINE=42, MACHINE_TAUXH=0, TRSEQ=1068112, NO_SERIE=0,
NO_SERIE_NSNO_SERIE='', cNOMENCLATURE=9876, INVENTAIRE_C=5432,
TJQTEPROD=0, TJQTEDEFECT=0, TJVALIDE=1, TJPROD_TERMINE=0,
StrDateD='2024-03-15', StrHeureD='14:30:00', StrDateF='', StrHeureF='',
MODEPROD=3, TjNote='Ecran de production pour Temps prod',
LOT_FAB=0, SMNOTRANS='', CNOMENCOP_MACHINE=213768
```

---

## 2. `Nba_Sp_Update_Production`

Closes an existing TEMPSPROD row by setting its end date/time and updating its fields.

### Parameter Signature

| #  | Name                    | SQL Type           | Value Source                                      |
|----|-------------------------|--------------------|---------------------------------------------------|
| 1  | `TJSEQ`                 | INT                | Previous row's TJSEQ (the row being closed)       |
| 2  | `EMPLOYE`               | INT                | Previous row's EMPLOYE                             |
| 3  | `OPERATION`             | INT                | Previous row's OPERATION or `vEcransProduction.OPERATION_SEQ` |
| 4  | `MACHINE`               | INT                | Previous row's MACHINE or `vEcransProduction.MACHINE` |
| 5  | `TRSEQ`                 | INT                | TRANSAC (work order ID)                            |
| 6  | `NO_SERIE`*             | INT                | Always `0`                                         |
| 7  | `NO_SERIE_NSNO_SERIE`*  | VARCHAR(20)        | Always `''`                                        |
| 8  | `cNOMENCLATURE`         | INT                | Previous row's CNOMENCLATURE or `vEcransProduction.CNOMENCLATURE` |
| 9  | `INVENTAIRE_C`          | INT                | Previous row's INVENTAIRE_C or `vEcransProduction.INVENTAIRE_SEQ` |
| 10 | `TJVALIDE`              | BIT                | Always `1`                                         |
| 11 | `TJPROD_TERMINE`        | BIT                | Always `0`                                         |
| 12 | `TJQTEPROD`             | FLOAT              | Previous row's TJQTEPROD                           |
| 13 | `TJQTEDEFECT`           | FLOAT              | Previous row's TJQTEDEFECT                         |
| 14 | `StrDateD`              | CHAR(10)           | Previous row's start date (from TJDEBUTDATE)       |
| 15 | `StrHeureD`             | CHAR(8)            | Previous row's start time (from TJDEBUTDATE)       |
| 16 | `StrDateF`              | CHAR(10)           | End date = NOW (server time from GETDATE())        |
| 17 | `StrHeureF`             | CHAR(8)            | End time = NOW (server time from GETDATE())        |
| 18 | `sModeProd`             | VARCHAR(5)         | Previous row's MODEPROD_MPCODE                     |
| 19 | `TjNote`                | VARCHAR(7500)      | `'Ecran de production pour Temps prod'` (old) or `'Ecran de production pour Temps prod New'` (new) |
| 20 | `SMNOTRANS`             | CHAR(9)            | Previous row's SMNOTRANS or `''`                   |

*Parameters #6 and #7: In the old code, the **Insert** SP passes `NO_SERIE=0` (numeric, `QuestionnaireSortie.cfc:1392`) while the **Update** SP passes `'',''` (empty strings, `QuestionnaireSortie.cfc:1443`). This is an inconsistency in the old code — the same SP parameter gets different types depending on which operation is calling it. The new Express code consistently sends `NO_SERIE=0` (sql.Int) and `NO_SERIE_NSNO_SERIE=''` (sql.VarChar) for both Insert and Update.

### Output Parameters

| Name     | SQL Type | Description              |
|----------|----------|--------------------------|
| `ERREUR` | INT      | Error code (0 = success) |

### Old CF Parameter String (Example)

From `QuestionnaireSortie.cfc:1443`:
```
"99999,100,5678,42,1068112,'','',9876,5432,1,0,25,3,'2024-03-15','14:30:00','2024-03-15','15:45:00','Prod','Ecran de production pour Temps prod',''"
```

Positional mapping:
```
TJSEQ=99999, EMPLOYE=100, OPERATION=5678, MACHINE=42,
TRSEQ=1068112, NO_SERIE='', NO_SERIE_NSNO_SERIE='',
cNOMENCLATURE=9876, INVENTAIRE_C=5432,
TJVALIDE=1, TJPROD_TERMINE=0,
TJQTEPROD=25, TJQTEDEFECT=3,
StrDateD='2024-03-15', StrHeureD='14:30:00',
StrDateF='2024-03-15', StrHeureF='15:45:00',
sModeProd='Prod',
TjNote='Ecran de production pour Temps prod',
SMNOTRANS=''
```

### Date Extraction from TJDEBUTDATE

**Old:** Uses ColdFusion `DateFormat()` and `TimeFormat()`:
```coldfusion
DateFormat(trouveDernierStatut.TJDEBUTDATE, 'yyyy-mm-dd')
TimeFormat(trouveDernierStatut.TJDEBUTDATE, 'HH:nn:ss')
```

**New:** The mssql driver returns DATETIME as a JavaScript Date tagged UTC. Must use `getUTC*()` methods:
```javascript
const prevDate = new Date(prev.TJDEBUTDATE);
const prevDateStr = `${prevDate.getUTCFullYear()}-${pad(prevDate.getUTCMonth()+1)}-${pad(prevDate.getUTCDate())}`;
const prevTimeStr = `${pad(prevDate.getUTCHours())}:${pad(prevDate.getUTCMinutes())}:${pad(prevDate.getUTCSeconds())}`;
```

> **CRITICAL:** Using `getMonth()`/`getHours()` instead of `getUTCMonth()`/`getUTCHours()` would produce incorrect dates shifted by the server's timezone offset.

---

## 3. `dbo.FctCalculTempsDeProduction(TJSEQ)`

A **table-valued function** (not a stored procedure) that calculates labor, operation, and material costs for a given TEMPSPROD row.

### Input

| Parameter | Type | Description                           |
|-----------|------|---------------------------------------|
| `TJSEQ`   | INT  | The TEMPSPROD row to calculate for    |

### Output Columns (returned as table)

| Column               | Type    | Maps To TEMPSPROD Column | Description                    |
|----------------------|---------|--------------------------|--------------------------------|
| `TJSEQ`              | INT     | (join key)               | Same as input                  |
| `CALCSYSTEMPSHOMME`  | FLOAT   | `TJSYSTEMPSHOMME`       | System calculated hours        |
| `CALCTEMPSHOMME`     | FLOAT   | `TJTEMPSHOMME`          | Total man-hours                |
| `CALCEMCOUT`         | FLOAT   | `TJEMCOUT`              | Employee cost                  |
| `CALCOPCOUT`         | FLOAT   | `TJOPCOUT`              | Operation cost                 |
| `CALCMACOUT`         | FLOAT   | `TJMACOUT`              | Material cost                  |
| `VALEUR_MATIERE`     | FLOAT   | `TJVALEUR_MATIERE`      | Material value                 |

### Usage Pattern

Always used with `INNER JOIN` in an `UPDATE` statement:
```sql
UPDATE TEMPSPROD SET
    TJSYSTEMPSHOMME  = ISNULL(C.CALCSYSTEMPSHOMME, 0),
    TJTEMPSHOMME     = ISNULL(C.CALCTEMPSHOMME, 0),
    TJEMCOUT         = ISNULL(C.CALCEMCOUT, 0),
    TJOPCOUT         = ISNULL(C.CALCOPCOUT, 0),
    TJMACOUT         = ISNULL(C.CALCMACOUT, 0),
    TJVALEUR_MATIERE = ISNULL(C.VALEUR_MATIERE, 0)   -- only for PROD rows, NOT SETUP rows
FROM TEMPSPROD
INNER JOIN dbo.FctCalculTempsDeProduction(@tjseq) C ON C.TJSEQ = @tjseq
WHERE TEMPSPROD.TJSEQ = @tjseq
```

### When It's Called

1. **On STOP/COMP (non-VCUT):** Applied to the **previous PROD row** (the one just closed)
2. **On STOP/COMP (non-VCUT, if NOPTEMPSETUP > 0):** Applied to the **most recent SETUP row**

> **Note:** ON_HOLD does NOT trigger cost recalculation — only STOP and COMP do (`api.cjs:3740`: `mpcode === "STOP" || mpcode === "COMP"`).

### Error Handling

**Old:** No error handling around cost recalculation queries — if the function fails, the ColdFusion error propagates normally.

**New:** Wraps both PROD and SETUP cost recalculation in try/catch (`api.cjs:3742, 3763`). On failure, logs a warning and continues:
```javascript
try { /* cost recalc */ } catch (err) { console.warn("[changeStatus] Cost recalc skipped:", err.message); }
```

### SETUP vs PROD Cost Recalculation Difference

- **PROD row:** Updates all 6 fields including `TJVALEUR_MATIERE`
- **SETUP row:** Updates only 5 fields (`TJSYSTEMPSHOMME`, `TJTEMPSHOMME`, `TJEMCOUT`, `TJOPCOUT`, `TJMACOUT`) — does NOT update `TJVALEUR_MATIERE`
