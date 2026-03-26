# Status Action Buttons — Backend Flow

This document describes the exact sequence of database operations executed when a status button is clicked (the **changeStatus write flow**). Both the old ColdFusion and new Express implementations follow the same logical flow.

> For the **status read flow** on screen load, see `03a-status-on-load-flow.md`.

## Old ColdFusion Entry Point

**File:** `src/old/EcransSeatPly/cfc/QuestionnaireSortie.cfc` lines 1295-1635
**Method:** `ajouteModifieStatut` (remote, returntype="string", returnFormat="PLAIN")
**HTTP:** GET via AJAX
**Arguments:** `TRANSAC` (string), `COPMACHINE` (string), `NOPSEQ` (string), `Statut` (string, required), `Langue` (string)

## New Express Entry Point

**File:** `server/api.cjs` lines 3487-3808
**Route:** POST `/changeStatus.cfm`
**Body:** `{ transac, copmachine, newStatus, employeeCode }`

---

## Execution Sequence

> **Note on step ordering:** The old and new implementations execute the initial queries in **different orders**. The old order is: Operation → PreviousRow → SetupRow → Employee → MODEPROD → Time. The new order is: Time → MODEPROD → Operation → Employee → PreviousRow. The logical steps below are numbered by function, not execution order. See the "Query Execution Order" summary at the bottom for the actual sequence in each system.

### Step 1: Resolve Employee

**Old (`QuestionnaireSortie.cfc:1339-1343`):** Queries `EMPLOYE` table from server-side session:
```sql
SELECT EMSEQ, EMNO, EMNOM, EMTAUXHOR FROM EMPLOYE WHERE EMSEQ = @session_EMSEQ
```
But only EMSEQ is used for the SP call (rate is always passed as 0). The query result provides denormalized employee info that may be logged.

**New (`api.cjs:3548`):** Employee EMSEQ comes directly from request body (`req.body.employeeCode`). No EMPLOYE query is needed.

---

### Step 2: Get Operation Details

**Old (`QuestionnaireSortie.cfc:1307-1313`):**
Invokes `support.trouveUneOperation()` which queries the `vEcransProduction` view:

```sql
SELECT TOP 1 v.*, bt.*
FROM vEcransProduction v
INNER JOIN VSP_BonTravail_Entete bt ON bt.TRANSAC = v.TRANSAC
WHERE v.TRANSAC = @TRANSAC
  AND v.COPMACHINE = @COPMACHINE    -- conditional: only if COPMACHINE != 0
  AND v.NOPSEQ = @NOPSEQ            -- conditional: only if NOPSEQ != 0
  AND v.OPERATION <> 'FINSH'
```

**New (`api.cjs:3528-3545`):**

```sql
SELECT TOP 1 v.OPERATION_SEQ, v.MACHINE, v.INVENTAIRE_SEQ, v.CNOMENCLATURE,
       v.NOPSEQ, v.COPMACHINE, v.TAUXHORAIREOPERATION, v.NO_INVENTAIRE
FROM vEcransProduction v
WHERE v.TRANSAC = @transac
  AND v.COPMACHINE = @copmachine    -- conditional: only if copmachine provided
  AND v.OPERATION <> 'FINSH'
```

**Key outputs used later:**
- `OPERATION_SEQ` — for SP params
- `MACHINE` (MASEQ) — for SP params
- `INVENTAIRE_SEQ` — for INVENTAIRE_C on TEMPSPROD
- `CNOMENCLATURE` — for cNOMENCLATURE on TEMPSPROD
- `NOPSEQ` — for CNOMENCOP on TEMPSPROD
- `COPMACHINE` — for CNOMENCOP_MACHINE on TEMPSPROD
- `NO_INVENTAIRE` — to detect VCUT products (skip cost recalc)

> **Note:** `vEcransProduction` is queried from the **EXT database** (`datasourceExt` / `getPoolExt()`). All other queries use the **primary database**.

---

### Step 3: Get Server Time

**Old (`QuestionnaireSortie.cfc:1360-1363`):**
```coldfusion
<cfset DateDebutSP = DateFormat(Now(), 'yyyy-mm-dd')>
<cfset HeureDebutSP = TimeFormat(Now(), 'HH:nn:ss')>
```

**New (`api.cjs:3513-3515`):**
```sql
SELECT FORMAT(GETDATE(), 'yyyy-MM-dd') AS d, FORMAT(GETDATE(), 'HH:mm:ss') AS t
```

**Purpose:** Ensures consistent server time for all TEMPSPROD date/time fields within this request.

---

### Step 4: Look Up MODEPROD Record

**Old (`QuestionnaireSortie.cfc:1344-1348`):**
```sql
SELECT MPSEQ, MPCODE, MPDESC_P, MPDESC_S
FROM MODEPROD
WHERE MPCODE = @Statut
```

**New (`api.cjs:3518-3520`):**
```sql
SELECT MPSEQ, MPCODE
FROM MODEPROD
WHERE MPCODE = @mpcode
```

**Status-to-MPCODE mapping (new only, `api.cjs:3504`):**

| Frontend Action | MODEPROD.MPCODE |
|----------------|-----------------|
| `SETUP`        | `Setup`         |
| `PROD`         | `Prod`          |
| `PAUSE`        | `PAUSE`         |
| `STOP`         | `STOP`          |
| `COMP`         | `COMP`          |
| `ON_HOLD`      | `HOLD`          |
| `READY`        | `READY`         |

> **CRITICAL:** The MPCODE values are **case-sensitive** in the database. `Setup` and `Prod` are title-case; `PAUSE`, `STOP`, `COMP` are uppercase.

---

### Step 5: Find Previous TEMPSPROD Row (`trouveDernierStatut`)

**Old (`QuestionnaireSortie.cfc:1315-1326`):**
```sql
SELECT TOP 1 TJSEQ, MODEPROD_MPCODE, TJQTEPROD, TJQTEDEFECT, TJDEBUTDATE,
       SMNOTRANS, cNOMENCOP, CNOMENCLATURE, EMPLOYE, EMPLOYE_EMNO, EMPLOYE_EMNOM
FROM TEMPSPROD
WHERE TRANSAC = @TRANSAC
  AND cNOMENCOP_MACHINE = @COPMACHINE   -- conditional: only if COPMACHINE != 0
  AND cNOMENCOP = @NOPSEQ
  AND MODEPROD_MPCODE <> @Statut        -- DIFFERENT from the new status
  AND TJNOTE LIKE 'Ecran de production pour Temps prod%'
ORDER BY TJSEQ DESC
```

**New (`api.cjs:3551-3570`):**
```sql
SELECT TOP 1 TJSEQ, EMPLOYE, OPERATION, MACHINE, cNOMENCLATURE, INVENTAIRE_C,
       CNOMENCOP, cNomencOp_Machine, MODEPROD_MPCODE,
       TJDEBUTDATE, TJQTEPROD, TJQTEDEFECT, SMNOTRANS
FROM TEMPSPROD
WHERE TRANSAC = @transac2
  AND CNOMENCOP = @nopseq2
  AND MODEPROD_MPCODE <> @newMpcode
  AND TJNOTE LIKE 'Ecran de production pour Temps prod%'
  AND cNomencOp_Machine = @copmachine2  -- conditional: only if copmachine provided
ORDER BY TJSEQ DESC
```

**Purpose:** Find the most recent time-tracking row that has a **different** status than the one being set. This row will be "closed" (end date/time set) before inserting the new one.

**Filter logic:** The `TJNOTE LIKE 'Ecran de production pour Temps prod%'` filter ensures only rows created by the production screen are affected. Other screens may create TEMPSPROD rows with different notes.

---

### Step 5b: Find Previous SETUP Row (`trouveDernierSetup`) — Old Only

**Old (`QuestionnaireSortie.cfc:1327-1338`):**
```sql
SELECT TOP 1 TJSEQ, MODEPROD_MPCODE, TJQTEPROD, TJQTEDEFECT, TJDEBUTDATE,
       SMNOTRANS, cNOMENCOP, CNOMENCLATURE
FROM TEMPSPROD
WHERE TRANSAC = @TRANSAC
  AND cNOMENCOP_MACHINE = @COPMACHINE   -- conditional
  AND cNOMENCOP = @NOPSEQ
  AND MODEPROD_MPCODE = 'SETUP'
  AND TJNOTE LIKE 'Ecran de production pour Temps prod%'
ORDER BY TJSEQ DESC
```

**New:** This query is done later in Step 12 (only when needed for cost recalculation).

---

### Step 6: PATH A — Create Initial PROD Row (if no previous row exists)

**Condition:**
- Old: `trouveDernierStatut.RecordCount EQ 0 AND arguments.Statut NEQ "SETUP"` (`QuestionnaireSortie.cfc:1350`)
- New: `tpResult.recordset.length === 0 && mpcode !== "Setup"` (`api.cjs:3577`) — note title-case `"Setup"` after mapping

This handles the case where an operation has NO existing TEMPSPROD rows from the production screen and the worker is setting a non-SETUP status (e.g., clicking PROD directly). The old software creates a PROD row first so there's always a row to close.

**Old (`QuestionnaireSortie.cfc:1350-1432`):**
1. Query MODEPROD for `MPCODE = 'PROD'` (need MPSEQ for the PROD status)
2. Resolve CNOMENCLATURE and INVENTAIRE via `ConstruitDonneesLocales()`
3. Call `Nba_Sp_Insert_Production` with MODEPROD = PROD's MPSEQ
4. Re-query `trouveDernierStatut` to find the just-created row

**New (`api.cjs:3577-3633`):**
1. Query `SELECT MPSEQ FROM MODEPROD WHERE MPCODE = 'Prod'`
2. Call `Nba_Sp_Insert_Production` directly using vEcransProduction data
3. Re-query to find the just-created row, push into result set

**After Path A:** The flow falls through to Step 7 with the newly created row as the "previous" row.

---

### Step 7: Close Previous Row via `Nba_Sp_Update_Production`

**Condition:**
- Old: `trouveDernierStatut.RecordCount EQ 1` (`QuestionnaireSortie.cfc:1434`)
- New: `tpResult.recordset.length > 0` (`api.cjs:3635`) — functionally equivalent since `SELECT TOP 1` returns 0 or 1 rows

Sets the end date/time on the previous TEMPSPROD row.

**Old (`QuestionnaireSortie.cfc:1434-1467`):**
```
Parameter list (comma-separated string for XML API):
  TJSEQ, EMPLOYE, Operation_Seq, MACHINE, TRANSAC,
  '', '',                              -- NO_SERIE, NO_SERIE_NSNO_SERIE (empty strings)
  CNOMENCLATURE, INVENTAIRE_SEQ,
  1, 0,                                -- TJVALIDE=1, TJPROD_TERMINE=0
  TJQTEPROD, TJQTEDEFECT,
  DateDebutSP, HeureDebutSP,           -- from previous row's TJDEBUTDATE
  DateFinSP, HeureFinSP,               -- NOW (closing time)
  MODEPROD_MPCODE,                     -- previous row's status code
  'Ecran de production pour Temps prod',
  SMNOTRANS
```

**New (`api.cjs:3635-3669`):**
Direct SP execution with named parameters. See `05-stored-procedures.md` for full parameter list.

**Key details:**
- The start date/time comes from the **previous row's TJDEBUTDATE**, and the end date/time is **NOW** (server time from Step 3)
- **EMPLOYE** comes from the **previous row** (`trouveDernierStatut.EMPLOYE`), NOT from the current session employee. This preserves the identity of who was working during that period.

> **⚠️ OPERATION/MACHINE source difference:**
> - **Old:** Always uses the **current operation query** result: `trouveOperation.Operation_Seq` and `trouveOperation.MACHINE` (`QuestionnaireSortie.cfc:1443`)
> - **New:** Uses **previous row with fallback**: `prev.OPERATION || op.OPERATION_SEQ` and `prev.MACHINE || op.MACHINE` (`api.cjs:3648-3649`)
> - If the operation/machine was changed between the time the previous row was created and now, these may produce different values.

> **⚠️ cNOMENCLATURE source difference:**
> - **Old:** Uses `trouveDernierStatut.CNOMENCLATURE` (previous row only, `QuestionnaireSortie.cfc:1443`)
> - **New:** Uses `prev.cNOMENCLATURE || op.CNOMENCLATURE || 0` (fallback to current operation, `api.cjs:3653`)

**Error handling:** Both old and new code check the `ERREUR` output parameter from the SP but only log it — they do NOT stop execution on error. The status change continues even if the update SP reports an error.

---

### Step 8: Insert New Row via `Nba_Sp_Insert_Production`

Always executed. Creates a new TEMPSPROD row for the new status.

**Old (`QuestionnaireSortie.cfc:1518-1550`):**
```
Parameter list:
  EMSEQ, 0,                            -- employee, employee rate (always 0)
  Operation_Seq, 0,                    -- operation, operation rate (always 0)
  Machine_Seq, 0,                      -- machine, machine rate (always 0)
  TRANSAC, 0, '',                      -- TRSEQ, NO_SERIE=0, NO_SERIE_NSNO_SERIE=''
  cNOMENCLATURE, INVENTAIRE,           -- resolved via ConstruitDonneesLocales
  0, 0,                                -- TJQTEPROD=0, TJQTEDEFECT=0
  1, 0,                                -- TJVALIDE=1, TJPROD_TERMINE=0
  DateDebutSP, HeureDebutSP,           -- NOW (start time)
  LaDateFin, LaHeureFin,               -- empty (or NOW if COMP)
  MODEPROD.MPSEQ,                      -- new status MPSEQ
  'Ecran de production pour Temps prod',
  0, '',                               -- LOT_FAB=0, SMNOTRANS=''
  COPMACHINE
```

**New (`api.cjs:3671-3704`):**
Direct SP execution with named parameters. See `05-stored-procedures.md` for full parameter list.

> **⚠️ COMP end date difference:**
> - **Old** (`QuestionnaireSortie.cfc:1479-1485`): When status is COMP, sets `StrDateF/StrHeureF = NOW()` on insert — the COMP row is immediately "closed" with both start and end time.
> - **New** (`api.cjs:3691-3692`): Always sets empty end date/time — the COMP row starts "open" and must be closed by the questionnaire submission or subsequent operation.

**SP outputs:** `TJSEQ` (new row ID), `ERREUR` (error code). Both old and new log the ERREUR value but do NOT stop execution if non-zero.

**TJNOTE difference:** Old software passes `'Ecran de production pour Temps prod'` as the TjNote. New software passes `'Ecran de production pour Temps prod New'`. Both match the `LIKE 'Ecran de production pour Temps prod%'` filter used in all queries, so cross-system compatibility is preserved. The "New" suffix allows distinguishing rows created by each system.

**Clarion date calculations (old only):** Before the insert, the old code calculates `LaDateClarion` and `LaHeureClarion` (`QuestionnaireSortie.cfc:1487-1488`) using `DateDiff` from the Clarion epoch (1800-12-28). These variables are **never used** — they are dead code carried over from legacy systems.

---

### Step 9: Post-Insert — Update CNOMENCOP and INVENTAIRE_C

**Old (`QuestionnaireSortie.cfc:1552-1557`):**
```sql
UPDATE TEMPSPROD
SET CNOMENCOP = @NOPSEQ,
    INVENTAIRE_C = @INVENTAIRE_SEQ
WHERE TJSEQ = @LeTJSEQ
```

**New (`api.cjs:3709-3715`):**
```sql
UPDATE TEMPSPROD
SET CNOMENCOP = @cnomencop,
    INVENTAIRE_C = @inventaire
WHERE TJSEQ = @tjseq
```

**Purpose:** The SP may not set CNOMENCOP and INVENTAIRE_C correctly (it uses the params differently), so they are explicitly updated after insert.

---

### Step 10: Post-Insert — Mark Operation Started in PL_RESULTAT

**Old (`QuestionnaireSortie.cfc:1558-1563`):**
```sql
UPDATE PL_RESULTAT
SET PR_DEBUTE = 1,
    MODEPROD = @MPSEQ
WHERE CNOMENCOP = @NOPSEQ
```

**New (`api.cjs:3718-3723`):**
```sql
UPDATE PL_RESULTAT
SET PR_DEBUTE = 1,
    MODEPROD = @modeprod
WHERE CNOMENCOP = @nopseq
```

**Purpose:** Marks the operation as "started" in the production results table and records which production mode it's in.

---

### Step 11: PAUSE/STOP/COMP — Zero Out Cost Fields

**Condition:** `Statut IN ('PAUSE', 'STOP', 'COMP')` — note: ON_HOLD is NOT included in this condition in either old or new code.

**Old (`QuestionnaireSortie.cfc:1565-1578`):**
```sql
UPDATE TEMPSPROD
SET TJEMTAUXHOR = 0,
    TJOPTAUXHOR = 0,
    TJMATAUXHOR = 0,
    TJSYSTEMPSHOMME = 0,
    TJTEMPSHOMME = 0,
    TJEMCOUT = 0,
    TJOPCOUT = 0,
    TJMACOUT = 0
WHERE TJSEQ = @LeTJSEQ
```

**New (`api.cjs:3726-3736`):** Identical query.

**Purpose:** Non-productive statuses (PAUSE, STOP, COMP) should not accrue labor/operation/material costs. The cost fields on the new row are zeroed out.

---

### Step 12: STOP/COMP (non-VCUT) — Recalculate Costs on Previous PROD Row

**Condition:**
- Old: `Statut IN ('STOP', 'COMP') AND NO_INVENTAIRE != 'VCUT' AND PRODUIT_CODE != 'VCUT'` (`QuestionnaireSortie.cfc:1581`)
- New: `mpcode === 'STOP' || mpcode === 'COMP'` AND `op.NO_INVENTAIRE !== 'VCUT'` (`api.cjs:3739-3740`)

> **⚠️ VCUT detection difference:** Old checks BOTH `NO_INVENTAIRE` AND `PRODUIT_CODE`. New only checks `NO_INVENTAIRE`. If a product has `PRODUIT_CODE = "VCUT"` but a different `NO_INVENTAIRE`, the new system would incorrectly attempt cost recalculation.
>
> **⚠️ ON_HOLD exclusion:** The new code only triggers cost recalc for STOP/COMP — not for ON_HOLD (`api.cjs:3740`). This is correct since ON_HOLD is a pause-like state, not a completion state.

**Old (`QuestionnaireSortie.cfc:1581-1593`):**
```sql
UPDATE TEMPSPROD SET
    TJSYSTEMPSHOMME = ISNULL(COUTS_TEMPSPROD.CALCSYSTEMPSHOMME, 0),
    TJTEMPSHOMME    = ISNULL(COUTS_TEMPSPROD.CALCTEMPSHOMME, 0),
    TJEMCOUT        = ISNULL(COUTS_TEMPSPROD.CALCEMCOUT, 0),
    TJOPCOUT        = ISNULL(COUTS_TEMPSPROD.CALCOPCOUT, 0),
    TJMACOUT        = ISNULL(COUTS_TEMPSPROD.CALCMACOUT, 0),
    TJVALEUR_MATIERE = ISNULL(COUTS_TEMPSPROD.VALEUR_MATIERE, 0)
FROM TEMPSPROD
INNER JOIN dbo.FctCalculTempsDeProduction(@trouveDernierStatut_TJSEQ) COUTS_TEMPSPROD
    ON (COUTS_TEMPSPROD.TJSEQ = @trouveDernierStatut_TJSEQ)
WHERE TEMPSPROD.TJSEQ = @trouveDernierStatut_TJSEQ
```

**New (`api.cjs:3740-3760`):** Identical query structure, targeting `prevTjseq`.

**Purpose:** When stopping/completing, recalculate the labor costs on the **previous PROD row** (which was just closed in Step 7) using the database function `FctCalculTempsDeProduction`.

**VCUT exception:** See condition above for the old vs new detection difference.

---

### Step 13: STOP/COMP — Recalculate SETUP Row Costs (if applicable)

**Condition:** Same as Step 12, PLUS:
- Old: `CNOMENCOP.NOPTEMPSETUP NEQ 0` (`QuestionnaireSortie.cfc:1601`) — includes negative values
- New: `CNOMENCOP.NOPTEMPSETUP > 0` (`api.cjs:3767`) — excludes negative values

**Old (`QuestionnaireSortie.cfc:1596-1614`):**

First, check if operation has setup time:
```sql
SELECT NOPTEMPSETUP FROM CNOMENCOP WHERE NOPSEQ = @NOPSEQ
```

If `NOPTEMPSETUP != 0` (old) / `> 0` (new), find the most recent SETUP row:
```sql
-- Old: Uses trouveDernierSetup from Step 5b (queried at the START, MODEPROD_MPCODE = 'SETUP')
-- New: Queries inline here (MODEPROD_MPCODE = 'Setup' — title-case, api.cjs:3774)
```

Then recalculate costs on that SETUP row:
```sql
UPDATE TEMPSPROD SET
    TJSYSTEMPSHOMME = ISNULL(COUTS_TEMPSPROD.CALCSYSTEMPSHOMME, 0),
    TJTEMPSHOMME    = ISNULL(COUTS_TEMPSPROD.CALCTEMPSHOMME, 0),
    TJEMCOUT        = ISNULL(COUTS_TEMPSPROD.CALCEMCOUT, 0),
    TJOPCOUT        = ISNULL(COUTS_TEMPSPROD.CALCOPCOUT, 0),
    TJMACOUT        = ISNULL(COUTS_TEMPSPROD.CALCMACOUT, 0)
FROM TEMPSPROD
INNER JOIN dbo.FctCalculTempsDeProduction(@trouveDernierSetup_TJSEQ) COUTS_TEMPSPROD
    ON (COUTS_TEMPSPROD.TJSEQ = @trouveDernierSetup_TJSEQ)
WHERE TEMPSPROD.TJSEQ = @trouveDernierSetup_TJSEQ
```

**New (`api.cjs:3762-3798`):**
Same logic but queries the SETUP row inline:
```sql
SELECT TOP 1 TJSEQ FROM TEMPSPROD
WHERE TRANSAC = @transac AND CNOMENCOP = @nopseq
  AND MODEPROD_MPCODE = 'Setup'
  AND TJNOTE LIKE 'Ecran de production pour Temps prod%'
ORDER BY TJSEQ DESC
```

> **Note:** The SETUP cost recalc does NOT include `TJVALEUR_MATIERE` — only the 5 cost/time fields.

---

### Step 14: Return Response

**Old (`QuestionnaireSortie.cfc:1630-1634`):**
```json
{
  "LeTJSEQ": 12345,
  "MODEPROD_MPCODE": "Prod"
}
```

Where `MODEPROD_MPCODE` is the **previous** row's status (from `trouveDernierStatut`), NOT the new status. This is used by the frontend to detect the SETUP→PROD transition.

**New (`api.cjs:3802-3806`):**
```json
{
  "success": true,
  "data": {
    "transac": 1068112,
    "copmachine": 213768,
    "newStatus": "PROD",
    "tjseq": 98765
  },
  "message": "Status changed to PROD"
}
```

The new implementation does NOT return the previous row's MODEPROD_MPCODE. Instead, the frontend detects SETUP→PROD by checking `currentStatus === "SETUP"` client-side.

---

## Summary: Query Execution Order

### Old ColdFusion Order (`QuestionnaireSortie.cfc:1295-1635`)

```
1.  INVOKE trouveUneOperation                        (get op details from vEcransProduction — EXT DB)
2.  SELECT TOP 1 from TEMPSPROD (diff status)        (trouveDernierStatut — find previous row)
3.  SELECT TOP 1 from TEMPSPROD WHERE 'SETUP'        (trouveDernierSetup — find SETUP row)
4.  SELECT from EMPLOYE                              (trouveEmploye — get employee details)
5.  SELECT from MODEPROD                             (trouveLeMODEPROD — resolve new status MPSEQ)
6.  DateFormat/TimeFormat(Now())                     (server time — only when needed for SP params)
7.  [PATH A only] INVOKE ConstruitDonneesLocales     (resolve CNOMENCLATURE/INVENTAIRE)
8.  [PATH A only] EXEC Nba_Sp_Insert_Production      (create initial PROD row)
9.  [PATH A only] SELECT TOP 1 from TEMPSPROD        (re-find previous row)
10. EXEC Nba_Sp_Update_Production                    (close previous row)
11. SELECT SUM(TJQTEPROD/TJQTEDEFECT)                (quantity totals — dead code, result unused)
12. INVOKE ConstruitDonneesLocales                   (resolve CNOMENCLATURE/INVENTAIRE for insert)
13. EXEC Nba_Sp_Insert_Production                    (create new status row)
14. UPDATE TEMPSPROD SET CNOMENCOP, INVENTAIRE_C     (fix fields on new row)
15. UPDATE PL_RESULTAT SET PR_DEBUTE=1               (mark operation started)
16. [PAUSE/STOP/COMP] UPDATE TEMPSPROD SET costs=0   (zero cost fields)
17. [STOP/COMP, non-VCUT] UPDATE via FctCalculTempsDeProduction  (recalc PROD costs)
18. [STOP/COMP, non-VCUT] SELECT NOPTEMPSETUP        (check for setup time)
19. [if NOPTEMPSETUP != 0] UPDATE via FctCalculTempsDeProduction  (recalc SETUP costs)
20. [STOP/COMP, non-VCUT] SELECT SUM(TJQTEPROD/TJQTEDEFECT) (quantity totals — dead code again)
21. RETURN JSON { LeTJSEQ, MODEPROD_MPCODE }
```

### New Express Order (`api.cjs:3487-3808`)

```
1.  SELECT FORMAT(GETDATE())                         (server time)
2.  SELECT from MODEPROD                             (resolve new status MPSEQ)
3.  SELECT TOP 1 from vEcransProduction              (get op details — EXT DB)
4.  employeeCode from req.body                       (no query needed)
5.  SELECT TOP 1 from TEMPSPROD (diff status)        (find previous row)
6.  [PATH A only] SELECT MPSEQ from MODEPROD         (get PROD MPSEQ)
7.  [PATH A only] EXEC Nba_Sp_Insert_Production      (create initial PROD row)
8.  [PATH A only] SELECT TOP 1 from TEMPSPROD        (re-find previous row)
9.  EXEC Nba_Sp_Update_Production                    (close previous row)
10. EXEC Nba_Sp_Insert_Production                    (create new status row)
11. UPDATE TEMPSPROD SET CNOMENCOP, INVENTAIRE_C     (fix fields on new row)
12. UPDATE PL_RESULTAT SET PR_DEBUTE=1               (mark operation started)
13. [PAUSE/STOP/COMP] UPDATE TEMPSPROD SET costs=0   (zero cost fields)
14. [STOP/COMP, non-VCUT] UPDATE via FctCalculTempsDeProduction  (recalc PROD costs)
15. [STOP/COMP, non-VCUT] SELECT NOPTEMPSETUP        (check for setup time)
16. [if NOPTEMPSETUP > 0] SELECT TOP 1 SETUP TJSEQ   (find SETUP row — queried here, not at start)
17. [if NOPTEMPSETUP > 0] UPDATE via FctCalculTempsDeProduction  (recalc SETUP costs)
18. RETURN JSON { success, data, message }
```
