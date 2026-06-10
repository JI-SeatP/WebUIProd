# Status Action Buttons — Database Tables

## Primary Table: TEMPSPROD

The main time-tracking table. Each row represents a period of time in a specific production status.

### Columns Used by Status Change Logic

| Column                 | Type         | Description                                     | Set By                              |
|------------------------|--------------|-------------------------------------------------|-------------------------------------|
| `TJSEQ`                | INT (PK)     | Auto-generated row ID                           | SP output param                     |
| `TRANSAC`              | INT (FK)     | Work order transaction ID                       | SP param `TRSEQ`                    |
| `CNOMENCOP`            | INT (FK)     | Nomenclature operation (NOPSEQ)                 | Post-insert UPDATE (Step 9)         |
| `cNOMENCLATURE`        | INT (FK)     | Product nomenclature ID                         | SP param `cNOMENCLATURE`            |
| `cNomencOp_Machine`    | INT (FK)     | Nomenclature component-machine ID (COPMACHINE). Note: column uses mixed-case naming; the SP param is `CNOMENCOP_MACHINE`; the separate lookup table is `cNomencOp_Machine` | SP param `CNOMENCOP_MACHINE` |
| `EMPLOYE_EMNO`         | VARCHAR      | Denormalized employee number (from EMPLOYE)     | Set by SP                           |
| `EMPLOYE_EMNOM`        | VARCHAR      | Denormalized employee name (from EMPLOYE)       | Set by SP                           |
| `MODEPROD`             | INT (FK)     | FK to MODEPROD.MPSEQ                            | SP param `MODEPROD`                 |
| `MODEPROD_MPCODE`      | VARCHAR(5)   | Status code string (Setup/Prod/PAUSE/STOP/COMP) | Set by SP (derived from MODEPROD)   |
| `EMPLOYE`              | INT (FK)     | Employee EMSEQ                                  | SP param `EMPLOYE`                  |
| `OPERATION`            | INT (FK)     | Operation OPERATION_SEQ                         | SP param `OPERATION`                |
| `MACHINE`              | INT (FK)     | Machine MASEQ                                   | SP param `MACHINE`                  |
| `INVENTAIRE_C`         | INT (FK)     | Inventory INSEQ                                 | Post-insert UPDATE (Step 9)         |
| `TJDEBUTDATE`          | DATETIME     | Start date/time of this status period           | SP params `StrDateD` + `StrHeureD`  |
| `TJFINDATE`            | DATETIME     | End date/time (NULL while active)               | SP params `StrDateF` + `StrHeureF`  |
| `TJQTEPROD`            | FLOAT        | Good quantity produced                          | SP param (0 at insert, updated by questionnaire) |
| `TJQTEDEFECT`          | FLOAT        | Defect quantity                                 | SP param (0 at insert, updated by questionnaire) |
| `TJVALIDE`             | BIT          | Valid flag                                      | SP param (always 1)                 |
| `TJPROD_TERMINE`       | BIT          | Production finished flag                        | SP param (always 0)                 |
| `TJNOTE`               | VARCHAR(7500)| Note identifying the source screen              | SP param `TjNote`                   |
| `SMNOTRANS`            | CHAR(9)      | Material output transaction number              | SP param (empty at insert)          |
| `ENTRERPRODFINI_PFNOTRANS` | VARCHAR  | Finished product transaction number             | Set by questionnaire                |
| `TJEMTAUXHOR`          | FLOAT        | Employee hourly rate                            | Zeroed for PAUSE/STOP/COMP (Step 11)|
| `TJOPTAUXHOR`          | FLOAT        | Operation hourly rate                           | Zeroed for PAUSE/STOP/COMP          |
| `TJMATAUXHOR`          | FLOAT        | Material hourly rate                            | Zeroed for PAUSE/STOP/COMP          |
| `TJSYSTEMPSHOMME`      | FLOAT        | System calculated hours                         | Zeroed or recalculated via FctCalculTempsDeProduction |
| `TJTEMPSHOMME`         | FLOAT        | Total man-hours                                 | Zeroed or recalculated              |
| `TJEMCOUT`             | FLOAT        | Employee cost                                   | Zeroed or recalculated              |
| `TJOPCOUT`             | FLOAT        | Operation cost                                  | Zeroed or recalculated              |
| `TJMACOUT`             | FLOAT        | Material cost                                   | Zeroed or recalculated              |
| `TJVALEUR_MATIERE`     | FLOAT        | Material value                                  | Recalculated only on PROD rows      |

### TJNOTE Filter Pattern

All queries in the status change flow filter by:
```sql
TJNOTE LIKE 'Ecran de production pour Temps prod%'
```

This distinguishes rows created by the production screen from rows created by other screens (e.g., corrections, imports). The old software writes `'Ecran de production pour Temps prod'` and the new writes `'Ecran de production pour Temps prod New'` — both match the LIKE pattern.

### Row Lifecycle

```
INSERT (Step 8):  TJDEBUTDATE = NOW, TJFINDATE = NULL, TJQTEPROD = 0, TJQTEDEFECT = 0
                  → Row is "open" (active status period)

UPDATE (Step 7):  TJFINDATE = NOW
                  → Row is "closed" (status period ended)

UPDATE (Step 12): TJSYSTEMPSHOMME, TJTEMPSHOMME, TJEMCOUT, TJOPCOUT, TJMACOUT, TJVALEUR_MATIERE
                  → Costs recalculated (only for PROD/SETUP rows on STOP/COMP)

UPDATE (questionnaire): TJQTEPROD = goodQty, TJQTEDEFECT = defectQty
                        → Quantities filled in by worker
```

---

## PL_RESULTAT (Production Results)

Tracks the overall state of an operation's production plan.

| Column        | Type    | Description                                       | Modified By Status Change |
|---------------|---------|---------------------------------------------------|---------------------------|
| `CNOMENCOP`   | INT (FK)| Nomenclature operation NOPSEQ (used as WHERE key) | Step 10 WHERE clause      |
| `PR_DEBUTE`   | BIT     | Operation has been started (1=yes)                | Set to `1` in Step 10     |
| `MODEPROD`    | INT (FK)| Current production mode (FK to MODEPROD.MPSEQ)    | Updated in Step 10        |
| `PR_TERMINE`  | BIT     | Operation is complete (1=yes)                     | Set by questionnaire on COMP |
| `MACHINE`     | INT (FK)| Assigned machine MASEQ                            | Updated by changeMachine  |
| `CNOMENCOP_MACHINE` | INT (FK) | Component-machine ID                       | Updated by changeMachine  |

### Update Query (Step 10)

```sql
UPDATE PL_RESULTAT
SET PR_DEBUTE = 1,
    MODEPROD = @MPSEQ
WHERE CNOMENCOP = @NOPSEQ
```

---

## MODEPROD (Production Mode Lookup)

Static lookup table mapping status codes to their IDs.

| Column    | Type         | Description                    |
|-----------|-------------|--------------------------------|
| `MPSEQ`   | INT (PK)    | Production mode sequence ID    |
| `MPCODE`  | VARCHAR(5)  | Status code string             |
| `MPDESC_P`| VARCHAR     | French description             |
| `MPDESC_S`| VARCHAR     | English/secondary description  |

### Known MPCODE Values

| MPCODE   | Meaning              |
|----------|----------------------|
| `Setup`  | Setup (title-case)   |
| `Prod`   | Production (title-case) |
| `PAUSE`  | Paused (uppercase)   |
| `STOP`   | Stopped (uppercase)  |
| `COMP`   | Completed (uppercase)|
| `HOLD`   | On hold (new only)   |
| `READY`  | Ready (new only)     |

> **Note on casing:** The canonical stored values are title-case for `Setup` and `Prod`, uppercase for `PAUSE`, `STOP`, `COMP`. SQL Server's default collation is **case-insensitive**, so the old code's uppercase queries (`WHERE MPCODE = 'SETUP'`) and the new code's title-case queries (`WHERE MPCODE = 'Setup'`) both work. However, the actual stored values and the values written into `TEMPSPROD.MODEPROD_MPCODE` by the SP follow the casing above.

---

## CNOMENCOP (Nomenclature Operation)

Operation definition table.

| Column          | Type    | Description                                      | Used By              |
|-----------------|---------|--------------------------------------------------|----------------------|
| `NOPSEQ`        | INT (PK)| Operation sequence ID                            | All queries as FK    |
| `NOPQTEAFAIRE`  | FLOAT   | Quantity to produce                              | Display only         |
| `NOPQTETERMINE` | FLOAT   | Quantity completed                               | Calculated from TEMPSPROD |
| `NOPQTESCRAP`   | FLOAT   | Scrap quantity                                   | Calculated from TEMPSPROD |
| `NOPQTERESTE`   | FLOAT   | Remaining quantity                               | Display only         |
| `NOPTEMPSETUP`  | FLOAT   | Setup time for this operation                    | Step 13: checked to decide SETUP cost recalc |
| `TRANSAC`       | INT (FK)| Work order transaction ID                        |                      |

### Query in Step 13

```sql
SELECT NOPTEMPSETUP FROM CNOMENCOP WHERE NOPSEQ = @NOPSEQ
```

If `NOPTEMPSETUP != 0`, the SETUP row also gets cost recalculation.

> **⚠️ Behavioral difference:** Old code checks `NOPTEMPSETUP NEQ 0` (`QuestionnaireSortie.cfc:1601`), which includes negative values. New code checks `NOPTEMPSETUP > 0` (`api.cjs:3767`), which excludes negatives. If this column is ever negative, old would trigger SETUP cost recalc but new would not.

---

## vEcransProduction (View — EXT Database)

A view that joins multiple tables to provide operation details for the production screen. Defined on the **EXT database** (uses `AUTOFAB_*` prefixed tables). Also accessible from the **primary database** via cross-DB references — the CFM's `getOperation.cfm` queries it from `datasourcePrimary`.

| Column                | Type        | Description                              | Used By                |
|-----------------------|-------------|------------------------------------------|------------------------|
| `TRANSAC`             | INT         | Work order transaction ID                | WHERE filter           |
| `OPERATION_SEQ`       | INT         | Operation sequence (PK in OPERATION)     | SP param OPERATION     |
| `OPERATION`           | VARCHAR     | Operation code                           | Filter (`<> 'FINSH'`) |
| `MACHINE`             | INT         | Machine MASEQ                            | SP param MACHINE       |
| `INVENTAIRE_SEQ`      | INT         | Inventory INSEQ                          | SP param, post-insert update |
| `CNOMENCLATURE`       | INT         | Nomenclature ID                          | SP param cNOMENCLATURE |
| `NOPSEQ`              | INT         | Nomenclature operation NOPSEQ            | All subsequent queries |
| `COPMACHINE`          | INT         | Component-machine ID                     | SP param, WHERE filter |
| `TAUXHORAIREOPERATION`| FLOAT       | Operation hourly rate                    | Not used in status change |
| `NO_INVENTAIRE`       | VARCHAR     | Inventory number (checked for "VCUT")    | VCUT detection (Step 12) |
| `PRODUIT_CODE`        | VARCHAR     | Product code (also checked for "VCUT" in old software) | VCUT detection (Step 12, old only) |
| `STATUT_CODE`         | VARCHAR     | From `TPROD.MODEPROD_MPCODE` via OUTER APPLY on `AUTOFAB_TEMPSPROD` (see below) | TJSEQ lookup only (status is read via RequeteAlternative INNER JOIN) |

### OUTER APPLY: TEMPSPROD Status Resolution (view line 173)

The view uses an OUTER APPLY to select the latest TEMPSPROD row for each operation:

```sql
OUTER APPLY (
  SELECT TOP 1
    TEMPSPROD.TJSEQ, TEMPSPROD.MODEPROD, TEMPSPROD.MODEPROD_MPCODE,
    TEMPSPROD.MODEPROD_MPDESC_P, TEMPSPROD.MODEPROD_MPDESC_S,
    TEMPSPROD.TJDEBUTDATE, TEMPSPROD.TJFINDATE, TEMPSPROD.TJPROD_TERMINE
  FROM AUTOFAB_TEMPSPROD AS TEMPSPROD
  WHERE TEMPSPROD.TRANSAC = T.TRSEQ
    AND (ISNULL(TEMPSPROD.CNOMENCOP,0) = ISNULL(CNOP.NOPSEQ,0)
         AND TEMPSPROD.OPERATION IS NOT NULL)
  ORDER BY TEMPSPROD.TJSEQ DESC
) TPROD
```

**Filter conditions:**
1. `TRANSAC = T.TRSEQ` — same work order
2. `ISNULL(CNOMENCOP,0) = ISNULL(CNOP.NOPSEQ,0)` — same operation (null-safe: treats NULL as 0)
3. `OPERATION IS NOT NULL` — only rows where the OPERATION field has been populated
4. `ORDER BY TJSEQ DESC` — most recent row first, `TOP 1` selects it

**Important notes:**
- The `OPERATION IS NOT NULL` filter means TEMPSPROD rows created before the OPERATION field was set will be skipped
- OUTER APPLY means if no matching TEMPSPROD row exists, all TPROD columns are NULL → STATUT_CODE is NULL → frontend maps to READY
- The view's STATUT_CODE is used for the **TJSEQ lookup only**. The actual status for display is read via the RequeteAlternative query which uses `INNER JOIN TEMPSPROD ... WHERE TPROD.TJSEQ = @theTJSEQ` — a more direct and reliable approach
- The old CFC's `ConstruitDonneesStatut` bypasses the view entirely for status, querying `TEMPSPROD` directly on the primary database with `WHERE TJSEQ = @TJSEQ`

---

## EMPLOYE (Employee Master)

| Column      | Type        | Description           | Used By               |
|-------------|-------------|------------------------|----------------------|
| `EMSEQ`     | INT (PK)    | Employee sequence ID  | SP param EMPLOYE     |
| `EMNO`      | VARCHAR     | Employee number       | Display only         |
| `EMNOM`     | VARCHAR     | Employee name         | Display only         |
| `EMTAUXHOR` | FLOAT       | Hourly rate           | Not used in status change (always 0) |
| `EMACTIF`   | BIT         | Active flag           | Filtering only       |

---

## MACHINE (Machine Master)

| Column          | Type        | Description             | Used By                |
|-----------------|-------------|-------------------------|------------------------|
| `MASEQ`         | INT (PK)    | Machine sequence ID     | SP param MACHINE       |
| `MACODE`        | VARCHAR     | Machine code            | Display only           |
| `MADESC_P`      | VARCHAR     | French description      | Display only           |
| `MADESC_S`      | VARCHAR     | English description     | Display only           |
| `FAMILLEMACHINE`| INT (FK)    | Machine family          | Filtering only         |

---

## cNomencOp_Machine (Nomenclature Component-Machine)

Links operations to machines. Updated by the changeMachine endpoint.

| Column      | Type    | Description                     | Modified By        |
|-------------|---------|----------------------------------|--------------------|
| `CNOM_SEQ`  | INT (PK)| Component-machine sequence ID   | changeMachine WHERE |
| `MACHINE`   | INT (FK)| Machine MASEQ                   | changeMachine SET   |

### changeMachine Update Query

```sql
UPDATE cNomencOp_Machine SET MACHINE = @machineId WHERE CNOM_SEQ = @copmachineId
```

---

## Database Topology

```
                          ┌─────────────────────┐
                          │   vEcransProduction  │ ← EXT database (read-only view)
                          │   (operation details)│
                          └──────────┬──────────┘
                                     │
                                     ▼
┌──────────┐     ┌──────────┐     ┌──────────────┐     ┌──────────┐
│ EMPLOYE  │────▶│TEMPSPROD │◀────│  PL_RESULTAT │◀────│ MODEPROD │
│          │     │ (time    │     │  (plan       │     │ (status  │
│          │     │  tracking)│     │   results)   │     │  lookup) │
└──────────┘     └─────┬────┘     └──────────────┘     └──────────┘
                       │
              ┌────────┼────────┐
              ▼        ▼        ▼
         ┌────────┐ ┌────────┐ ┌────────────────┐
         │MACHINE │ │CNOMENCOP│ │cNomencOp_Machine│
         │        │ │(operation│ │(op-machine link)│
         │        │ │ defn)   │ │                │
         └────────┘ └────────┘ └────────────────┘
```
