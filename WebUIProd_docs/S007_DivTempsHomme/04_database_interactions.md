# 04 — Database Interactions

## Datasource Mapping

| Variable | Test | Production | Used By |
|----------|------|------------|---------|
| `THIS.dsClient` | `TS_SEATPL` | `AF_SEATPLY` | `TEMPSPROD`, `MACHINE`, `DEPARTEMENT`, `EMPLOYE`, `EQUIPE`, `MODEPROD`, `PL_RESULTAT`, `cNOMENCOP`, `INVENTAIRE` |
| `THIS.dsClientEXT` | `TS_SEATPL_EXT` | `AF_SEATPLY_EXT` | `EMPLOYE_HEURES` (with `AutoFAB_*` views) |

**Critical distinction:** Production time data (`TEMPSPROD`) lives in the primary datasource, while worker man-hours (`EMPLOYE_HEURES`) lives in the EXT datasource. The EXT datasource uses `AutoFAB_` prefixed tables/views for JOINs to `DEPARTEMENT`, `MACHINE`, and `EMPLOYE`.

---

## Tables Read

### `TEMPSPROD` (dsClient) — Production Time Records

**Read by:** `afficheTempsProd` (line 5425)

```sql
SELECT DISTINCT
    T.TJSEQ, T.MACHINE, T.MACHINE_MACODE, T.MACHINE_MADESC_P, T.MACHINE_MADESC_S,
    T.TRANSAC, T.OPERATION, T.OPERATION_OPCODE, T.OPERATION_OPDESC_P, T.OPERATION_OPDESC_S,
    T.EMPLOYE_EMNOM, T.MODEPROD, T.MODEPROD_MPCODE, T.MODEPROD_MPDESC_P, T.MODEPROD_MPDESC_S,
    T.TJQTEPROD, T.TJQTEDEFECT, T.TRANSAC_TRNO, T.TRANSAC_TRITEM,
    T.SMNOTRANS, T.ENTRERPRODFINI_PFNOTRANS, T.TJDEBUTDATE, T.TJFINDATE, T.TJDUREE,
    T.cNomencOp_Machine AS COPMACHINE, T.CNOMENCOP,
    M.DEPARTEMENT, D.DEDESCRIPTION_S, D.DEDESCRIPTION_P,
    dbo.FctFormatNoProd(T.TRANSAC_TRNO, T.TRANSAC_TRITEM) AS NO_PROD,
    I.INDESC1, I.INDESC2, I.INNOINV
FROM TEMPSPROD T
INNER JOIN MACHINE M ON T.MACHINE = M.MASEQ
INNER JOIN DEPARTEMENT D ON M.DEPARTEMENT = D.DESEQ
INNER JOIN PL_RESULTAT PL ON PL.TRANSAC = T.TRANSAC AND PL.CNOMENCOP = T.CNOMENCOP
INNER JOIN cNOMENCOP CNOP ON CNOP.NOPSEQ = T.CNOMENCOP
LEFT OUTER JOIN INVENTAIRE I ON I.INSEQ = T.INVENTAIRE_C
WHERE 0=0
  [AND T.TJDEBUTDATE >= :DateDebut]
  [AND (T.TJFINDATE <= :DateFin OR T.TJFINDATE IS NULL)]
  [AND M.DEPARTEMENT = :Departement]
  [AND T.MACHINE = :Machine]
  [AND dbo.FctFormatNoProd(T.TRANSAC_TRNO, T.TRANSAC_TRITEM) LIKE '%:Commande%']
  [AND 0=1  -- if ALL filters empty]
  AND (T.OPERATION <> 11 OR T.OPERATION IS NULL)
ORDER BY T.TJDEBUTDATE DESC, T.TJFINDATE DESC
```

**Columns used in output:**

| Column | Purpose |
|--------|---------|
| `TJSEQ` | Row PK, used for status editing, row highlighting |
| `TJDEBUTDATE`, `TJFINDATE` | Start/end datetimes |
| `TJDUREE` | Duration |
| `MODEPROD_MPCODE` | Status code (PROD, SETUP, COMP, STOP, PAUSE) |
| `MODEPROD_MPDESC_P/S` | Status description (bilingual) |
| `TRANSAC_TRNO`, `TRANSAC_TRITEM` | Order number parts |
| `NO_PROD` | Formatted order number (via `dbo.FctFormatNoProd`) |
| `INDESC1`, `INDESC2`, `INNOINV` | Item descriptions |
| `SMNOTRANS` | Material output transaction number |
| `ENTRERPRODFINI_PFNOTRANS` | Finished product entry number |
| `DEDESCRIPTION_P/S` | Department name |
| `OPERATION_OPDESC_P/S` | Operation name |
| `MACHINE_MADESC_P/S` | Machine name |
| `TJQTEPROD` | Good quantity |
| `TJQTEDEFECT` | Defective quantity |
| `COPMACHINE`, `CNOMENCOP` | Used in edit button `onClick` |
| `TRANSAC` | Used in edit button `onClick` |

### `EMPLOYE_HEURES` (dsClientEXT) — Worker Man-Hours

**Read by:** `afficheTempsHomme` (line 5228), `afficheTempsEmploye` (line ~5595), `ajouteModifieTempsHomme` (lines ~5795, ~5802)

```sql
SELECT EH.EMPHSEQ, EH.EMPHDATEDEBUT, EH.EMPHDATEFIN, EH.DEPARTEMENT, EH.MACHINE,
       EH.EMPLOYE, EH.EMPHEFFORT_HOMME,
       D.deDescription_P, D.DeDescription_S,
       M.MADESC_P, M.MADESC_S,
       E.EMNOM
FROM EMPLOYE_HEURES EH
INNER JOIN AutoFAB_DEPARTEMENT D ON EH.DEPARTEMENT = D.DESEQ
INNER JOIN AutoFAB_MACHINE M ON EH.MACHINE = M.MASEQ
INNER JOIN AutoFAB_EMPLOYE E ON EH.EMPLOYE = E.EMSEQ
WHERE 0=0
  [AND EH.EMPHDATEDEBUT >= :DateDebut]
  [AND EH.EMPHDATEFIN <= :DateFin]
  [AND EH.DEPARTEMENT = :Departement]
  [AND EH.MACHINE = :Machine]
  [AND EH.EMPLOYE = :Employe]
ORDER BY EH.EMPHDATEDEBUT DESC, EH.EMPHDATEFIN DESC
```

**Columns:**

| Column | Type | Purpose |
|--------|------|---------|
| `EMPHSEQ` | int (PK) | Record identity |
| `EMPHDATEDEBUT` | datetime | Start time |
| `EMPHDATEFIN` | datetime | End time |
| `DEPARTEMENT` | int (FK) | Department reference |
| `MACHINE` | int (FK) | Machine reference |
| `EMPLOYE` | int (FK) | Employee reference |
| `EMPHEFFORT_HOMME` | decimal | Effort rate (0.00-1.00 range, displayed as percentage) |

### `MACHINE` (dsClient)

**Read by:** `afficheTableauTempsHomme` (line 1178), `afficheMachines` (line ~5956), `afficheMachinesRecherche` (line ~5983), `afficheMachinesTempsProd` (line ~6008)

```sql
SELECT MASEQ, MACODE, MADESC_P, MADESC_S
FROM MACHINE
[WHERE DEPARTEMENT = :Departement]  -- filtered in afficheMachines variants
ORDER BY MADESC_P  -- or MADESC_S for EN
```

### `DEPARTEMENT` (dsClient)

**Read by:** `trouveDepartements` (line 1635)

```sql
SELECT DESEQ, DECODE, DEDESCRIPTION_S, DEDESCRIPTION_P
FROM DEPARTEMENT
WHERE DEVOIRDANSUSINE = 1
  [AND DESEQ IN (SELECT DEPARTEMENT FROM MACHINE WHERE MASEQ = :Machine)]
  [AND DECODE LIKE 'Forklift%']  -- if CodeFonction = 1034
ORDER BY DEDESCRIPTION_P  -- or DEDESCRIPTION_S for EN
```

### `EMPLOYE` (dsClient)

**Read by:** `afficheTableauTempsHomme` (line 1187), `afficheTempsEmploye` (line ~5608)

```sql
SELECT EMSEQ, EMNOM FROM EMPLOYE ORDER BY EMNOM
-- or --
SELECT EMNOM FROM EMPLOYE WHERE EMSEQ = :Employe
```

### `EQUIPE` (dsClient)

**Read by:** `afficheTableauTempsHomme` (line 1192)

```sql
SELECT DISTINCT EQDEBUTQUART, EQFINQUART FROM EQUIPE ORDER BY EQDEBUTQUART
```

**Note:** This query is executed but its results are not used in the rendered HTML. The shift times are hardcoded in the shift detection logic.

### `MODEPROD` (dsClient)

**Read by:** `ModifieStatutTempsProd` (line ~5930)

```sql
SELECT MPSEQ, MPCODE, MPDESC_P, MPDESC_S FROM MODEPROD WHERE MPCODE = :Statut
```

### `PL_RESULTAT` (dsClient)

**Read by:** `afficheTempsProd` (line 5445, JOIN only)

```sql
INNER JOIN PL_RESULTAT PL ON PL.TRANSAC = T.TRANSAC AND PL.CNOMENCOP = T.CNOMENCOP
```

### `cNOMENCOP` (dsClient)

**Read by:** `afficheTempsProd` (line 5446, JOIN only)

```sql
INNER JOIN cNOMENCOP CNOP ON CNOP.NOPSEQ = T.CNOMENCOP
```

### `INVENTAIRE` (dsClient)

**Read by:** `afficheTempsProd` (line 5447, LEFT JOIN)

```sql
LEFT OUTER JOIN INVENTAIRE I ON I.INSEQ = T.INVENTAIRE_C
```

---

## Tables Written

### `EMPLOYE_HEURES` (dsClientEXT)

**Written by:** `ajouteModifieTempsHomme` (INSERT/UPDATE), `retireTempsHomme` (DELETE)

#### INSERT (new record)
```sql
SET NOCOUNT ON
INSERT INTO EMPLOYE_HEURES (EMPHDATEDEBUT, EMPHDATEFIN, EMPHEFFORT_HOMME, DEPARTEMENT, MACHINE, EMPLOYE)
VALUES (:DateDebut, :DateFin, :Effort/100, :Departement, :Machine, :Employe)
SELECT NouvTempsID = @@IDENTITY
SET NOCOUNT OFF
```

#### UPDATE (existing record)
```sql
UPDATE EMPLOYE_HEURES
SET EMPHDATEDEBUT = :DateDebut,
    EMPHDATEFIN = :DateFin,
    EMPHEFFORT_HOMME = :Effort/100,
    DEPARTEMENT = :Departement,
    MACHINE = :Machine,
    EMPLOYE = :Employe
WHERE EMPHSEQ = :EMPHSEQ
```

#### DELETE
```sql
DELETE FROM EMPLOYE_HEURES WHERE EMPHSEQ = :EMPHSEQ
```

### `TEMPSPROD` (dsClient)

**Written by:** `ModifieStatutTempsProd` (UPDATE only)

```sql
UPDATE TEMPSPROD
SET MODEPROD = :MPSEQ,
    MODEPROD_MPCODE = :Statut,
    MODEPROD_MPDESC_P = :MPDESC_P,
    MODEPROD_MPDESC_S = :MPDESC_S
WHERE TJSEQ = :TJSEQ
```

---

## Database Functions

### `dbo.FctFormatNoProd(TRNO, TRITEM)`

**Used by:** `afficheTempsProd` query (line ~5441) — formats order number for display and search filtering.

---

## Transaction and Locking Notes

- **No explicit transactions** — all queries run as individual auto-commit statements
- **No locking hints** — default SQL Server isolation level applies
- **`SET NOCOUNT ON/OFF`** wraps the INSERT in `ajouteModifieTempsHomme` to suppress row-count messages before `@@IDENTITY` capture
- **`@@IDENTITY`** is used (not `SCOPE_IDENTITY()`) — vulnerable to trigger-inserted identity values if triggers exist on `EMPLOYE_HEURES`

---

### `MACHINE.MAEFFORTHOMME` (dsClient)

**Read by:** `trouveEffort` (line 6034)

```sql
SELECT MAEFFORTHOMME FROM MACHINE WHERE MASEQ = :Machine
```

Returns the machine's default effort rate as a decimal fraction (e.g., `0.85` = 85%). Used to auto-fill the effort input when the user selects a machine.

---

## Cross-Datasource Notes

The `afficheTempsHomme` and `afficheTempsEmploye` functions read from `dsClientEXT` for the main data but use `dsClient` for lookup tables (`MACHINE`, `DEPARTEMENT`, `EMPLOYE`). The EXT datasource uses `AutoFAB_` prefixed equivalents for JOINs. This means:
- `AutoFAB_DEPARTEMENT` = view/synonym for `DEPARTEMENT` in the EXT database
- `AutoFAB_MACHINE` = view/synonym for `MACHINE` in the EXT database
- `AutoFAB_EMPLOYE` = view/synonym for `EMPLOYE` in the EXT database

The `AutoFAB_` prefix is a cross-database reference mechanism that works transparently in both environments:
- Test: `TS_SEATPL_EXT` → `AutoFAB_X` resolves to `TS_SEATPL.X`
- Production: `AF_SEATPLY_EXT` → `AutoFAB_X` resolves to `AF_SEATPLY.X`

**Porting note:** The Express API connects to both databases directly with separate connection pools. Cross-database JOINs via `AutoFAB_` are not needed — queries on `EMPLOYE_HEURES` can JOIN to `DEPARTEMENT`, `MACHINE`, `EMPLOYE` directly using the primary connection.
