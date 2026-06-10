# 04 - Database Interactions

## Old Software: Queries Executed

### Query 1: `trouveUneOperation` (support.cfc:3602-3615)

**Datasource:** `dsClientEXT` (TS_SEATPL_EXT / AF_SEATPLY_EXT)

```sql
SELECT DISTINCT TOP 50 v.*, VBE.*
FROM vEcransProduction v
LEFT OUTER JOIN dbo.VSP_BonTravail_Entete AS VBE
  ON VBE.TRANSAC = (SELECT TOP 1 TRANSAC FROM dbo.VSP_BonTravail_Entete VBE2 WHERE VBE2.TRANSAC = v.TRANSAC)
WHERE v.TRANSAC = <TRANSAC>
  -- COPMACHINE conditional: skipped when 0
  <cfif val(COPMACHINE) NEQ 0>
    AND v.COPMACHINE = <COPMACHINE>
  </cfif>
  -- NOPSEQ conditional: skipped when 0
  <cfif val(NOPSEQ) NEQ 0>
    AND v.NOPSEQ = <NOPSEQ>
  </cfif>
  AND (v.OPERATION <> 'FINSH')
```

**Key behavior for unstarted orders:**
- `vEcransProduction` uses `OUTER APPLY` for TEMPSPROD → STATUT_CODE, TJSEQ, TJFINDATE are NULL
- Rows still returned — the operation exists in `CNOMENCOP` and `PL_RESULTAT`
- Result includes NULL TJSEQ, NULL STATUT_CODE → UI shows "PRET" status

### Query 2: `trouveLesDetailsOperation` (tableau.cfc:162-165)

**Datasource:** `dsClientEXT`

```sql
SELECT * FROM VCeduleMachine VC
WHERE VC.TRANSAC = <TRANSAC>
  <cfif Val(COPMACHINE) NEQ 0>
    AND VC.CNOMENCOP_MACHINE = <COPMACHINE>
  </cfif>
  AND VC.CNOMENCOP = <NOPSEQ>
```

### Query 3: `trouveDernierStatutOperation` (tableau.cfc:277-279)

**Datasource:** `dsClient` (primary)

```sql
SELECT TOP 1 * FROM TEMPSPROD
WHERE TRANSAC = <TRANSAC>
  AND cNOMENCOP = <NOPSEQ>
  <cfif Val(COPMACHINE) NEQ 0>
    AND cNOMENCOP_MACHINE = <COPMACHINE>
  </cfif>
  ORDER BY TJSEQ DESC
```

**For unstarted orders:** Returns 0 rows (no TEMPSPROD exists). The code handles this gracefully — no error, just shows "PRET" status.

---

## New Software: Queries Executed

### Step 1: TJSEQ Lookup (getOperation.cfm:37-46)

**Datasource:** `datasourcePrimary` (**WRONG — should be `datasourceExt`**)

```sql
SELECT TOP 1 v.TJSEQ
FROM vEcransProduction v
WHERE v.TRANSAC = <transac>
  AND v.OPERATION <> 'FINSH'
  <cfif Val(copmachine) NEQ 0>
    AND v.COPMACHINE = <copmachine>
  </cfif>
  ORDER BY v.TJSEQ DESC
```

**Problems:**
1. Queries primary datasource, not EXT
2. Returns TJSEQ=NULL for unstarted orders → `Val(NULL)=0` → error on line 48
3. Missing NOPSEQ filter — may return wrong operation for multi-operation orders

### Step 2: Full Operation Query (getOperation.cfm:59-147)

**Datasource:** `datasourcePrimary` (correct for this query — it references base tables)

```sql
-- Line 145: INNER JOIN TEMPSPROD TPROD ON ...
-- Line 146: WHERE TPROD.TJSEQ = <theTJSEQ>
```

**Problem:** `INNER JOIN TEMPSPROD` excludes orders with no production record.

---

## Comparison: Old vs New Query Approach

| Aspect | Old Software | New Software |
|--------|-------------|-------------|
| **Strategy** | Single query against `vEcransProduction` (view with OUTER APPLY) | Two-step: find TJSEQ first, then full query by TJSEQ |
| **Datasource for view** | `dsClientEXT` | `datasourcePrimary` (wrong) |
| **COPMACHINE=0** | Filter skipped | Filter skipped (correct) |
| **NOPSEQ** | Always used as filter | **Not passed/used** |
| **No TEMPSPROD** | Returns row with NULL status fields | **Fails — INNER JOIN excludes, TJSEQ guard rejects** |
| **Multi-operation orders** | NOPSEQ disambiguates | No disambiguation (returns arbitrary) |

## Tables/Views Read

| Object | Old Software | New Software |
|--------|-------------|-------------|
| `vEcransProduction` | EXT datasource | Primary datasource (wrong) |
| `VSP_BonTravail_Entete` | EXT datasource (via view join) | EXT datasource (cross-DB ref, line 131) |
| `VCeduleMachine` | EXT datasource | Not queried |
| `TEMPSPROD` | Primary (trouveDernierStatut, tolerates 0 rows) | Primary (`INNER JOIN` — **fails on 0 rows**) |
| `COMMANDE`, `TRANSAC`, `DET_COMM`, `CNOMENCOP` | Via view | Via Step 2 direct joins |
| `PL_RESULTAT` | Via view | Via Step 2 `LEFT JOIN` |
| `MACHINE`, `FAMILLEMACHINE` | Via view | Via Step 2 `INNER JOIN` |

## Write Paths

Neither the old nor new OK/Go button click writes to the database. All operations are read-only at this stage. Database writes happen later when the user changes the status from the footer buttons.
