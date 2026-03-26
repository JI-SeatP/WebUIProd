# Status Action Buttons — Status Determination on Screen Load

This document covers how the current operation status is **read** when the operation screen loads. For the **write** flow (button click → new TEMPSPROD row), see `04-backend-flow.md`.

## Old ColdFusion — `operation.cfc:ConstruitDonneesStatut` (lines 4569-4756)

### Function Signature

```coldfusion
<cffunction access="remote" name="ConstruitDonneesStatut" output="false" returntype="struct">
  <cfargument required="true" name="TRANSAC" type="string" default=""/>
  <cfargument required="true" name="COPMACHINE" type="string" default=""/>
  <cfargument required="true" name="NOPSEQ" type="string" default=""/>
  <cfargument required="true" name="TJSEQ" type="string" default="0"/>
  <cfargument required="true" name="Langue" type="string" default="FR"/>
  <cfargument required="true" name="COPMACHINEPRECEDENT" type="string" default=""/>
  <cfargument required="true" name="NOPSEQPRECEDENT" type="string" default=""/>
```

### Execution Steps

#### Step 1: Initialize Status Struct (lines 4581-4597)

```coldfusion
<cfset local.Statut.LeBoutonGo = 1>         <!--- Go button enabled by default --->
<cfset local.Statut.LePret = "">             <!--- Empty string (not 0, not 1) --->
<cfset local.Statut.LaCouleurBG = "##eeeeee">
<cfset local.Statut.LaImageStatut = "sm_btn_attente_actif.png">
<cfset local.Statut.LeStatut = LeTitreEnAttente>
<cfset local.Statut.LaCouleurStatut = "666666">
```

#### Step 2: Query TEMPSPROD Directly (lines 4599-4603)

```sql
-- Datasource: PRIMARY (THIS.dsClient)
SELECT MODEPROD_MPCODE
FROM TEMPSPROD
WHERE TJSEQ = @TJSEQ
```

This queries the **primary database** directly — NOT the vEcransProduction view. The TJSEQ was passed as an argument from the calling screen.

#### Step 3: Two-Path Branching for Operation Data (lines 4604-4614)

```coldfusion
<cfif trouveLeStatut.MODEPROD_MPCODE EQ "SETUP">
    <cfinclude template="RequeteAlternative.cfm">
<cfelse>
    <cfinvoke component="support" method="trouveUneOperation" ...>
</cfif>
```

- **SETUP path:** `RequeteAlternative.cfm` — joins primary tables directly with `INNER JOIN TEMPSPROD TPROD ON T.TRSEQ = TPROD.TRANSAC AND CNOP.NOPSEQ = TPROD.CNOMENCOP WHERE TPROD.TJSEQ = @TJSEQ`
- **Non-SETUP path:** `support.trouveUneOperation` — queries `vEcransProduction` view

#### Step 4: LePret and Quantity Calculation (lines 4621-4711)

If the operation query returns results:

1. **`trouvePret` query** (lines 4642-4645): Queries `VDET_COMM` with `FctSp_BookingFilter`. **This is dead code** — the result is never used.

2. **`LePret = 1`** (line 4647): Set **unconditionally** — hardcoded to 1 regardless of any condition.

3. Quantity calculations vary by machine family (PRESS, PanelSaw, CNC/Sand, other).

4. **`LeBoutonGo = 1`** (line 4712): Re-confirmed enabled.

#### Step 5: Status-to-Visual Mapping (lines 4713-4743)

Based on `trouveLeStatut.MODEPROD_MPCODE` from Step 2:

| MODEPROD_MPCODE | Background | Status Label | Color | LeBoutonGo |
|----------------|------------|-------------|-------|------------|
| `SETUP` | #d3c8f0 (purple) | LeTitreSetUp | 9900FF | 1 (enabled) |
| `PAUSE` | #ffe599 (amber) | LeTitrePause | FF9900 | 1 (enabled) |
| `STOP` | #ea9999 (red) | LeTitreArret | CC0000 | 1 (enabled) |
| `COMP` | #cfe2ff (blue) | LeTitreComplete | 2B78E4 | **0 (disabled)** |
| `PROD` | #93c47d (green) | LeTitreProduction | 009E0F | 1 (enabled) |
| NULL/other | #ffffff (white) | LeTitrePret | 000000 | 1 (enabled) |

#### Step 6: Dead Code — LePret Overrides (lines 4745-4752)

```coldfusion
<cfif local.Statut.LePret EQ 0>
    <!--- Override visual to "Ready" state --->
</cfif>
<cfif local.Statut.LePret NEQ 1>
    <cfset local.Statut.LeBoutonGo = 0>
</cfif>
```

**These never fire.** `LePret` is always `1` (set on line 4647). The `trouvePret` query result is never assigned to `LePret`. The Go button is disabled **only for COMP** in practice.

---

## TJSEQ Origin

The TJSEQ argument comes from the `vEcransProduction` view's OUTER APPLY (view line 173):

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

**Filters:**
- `TRANSAC = T.TRSEQ` — same work order
- `ISNULL(CNOMENCOP,0) = ISNULL(CNOP.NOPSEQ,0)` — same operation (null-safe comparison)
- `OPERATION IS NOT NULL` — only rows with an operation value set
- `ORDER BY TJSEQ DESC` — most recent row first

The TJSEQ selected by this OUTER APPLY is what gets passed to `ConstruitDonneesStatut`.

---

## New React + Express Flow

### CFM Endpoint — `queries/getOperation.cfm`

The CFM endpoint replicates the old software's exact data access pattern:

1. **Step 1** (lines 37-46): Get TJSEQ from `vEcransProduction` on **primary** datasource
   ```sql
   SELECT TOP 1 v.TJSEQ FROM vEcransProduction v
   WHERE v.TRANSAC = @transac AND v.OPERATION <> 'FINSH'
   [AND v.COPMACHINE = @copmachine]
   ORDER BY v.TJSEQ DESC
   ```

2. **Step 2** (lines 59-147): Run RequeteAlternative query on **primary** datasource with:
   - `INNER JOIN TEMPSPROD TPROD ON T.TRSEQ = TPROD.TRANSAC AND CNOP.NOPSEQ = TPROD.CNOMENCOP`
   - `WHERE TPROD.TJSEQ = @theTJSEQ`
   - Returns `TPROD.MODEPROD_MPCODE AS STATUT_CODE` directly from the INNER JOIN
   - Cross-DB references to EXT for VBE and functions: `#datasourceExt#.dbo.VSP_BonTravail_Entete`

### Express Endpoint — `server/api.cjs` GET `/getOperation.cfm`

Replicates the same 2-step approach:

1. **Step 1:** Get TJSEQ from `vEcransProduction` using `poolExt` (the view lives on the EXT database; the CFM accesses it from `datasourcePrimary` via cross-DB resolution)
2. **Step 2:** Run RequeteAlternative query on `pool` (primary DB) with `INNER JOIN TEMPSPROD TPROD ... WHERE TPROD.TJSEQ = @theTJSEQ`
3. Cross-DB refs use `DB_EXT` variable (from `db.cjs`): `${DB_EXT}.dbo.VSP_BonTravail_Entete`

STATUT_CODE comes directly from `TPROD.MODEPROD_MPCODE` — no override or patch needed.

### Frontend Flow

```
Express returns { success: true, data: { STATUT_CODE: "PROD", ... } }
    │
    ▼
useOperation hook → setOperation(res.data)
    │
    ▼
OperationDetailsPage: statusCode = localStatus ?? operation.STATUT_CODE
    │
    ├─▶ OperationHeader → statusCodeToEnum(statusCode) → StatusBadge
    └─▶ StatusActionBar → statusCodeToEnum(statusCode) → getAllActions(status) → button rendering
```

`statusCodeToEnum()` (`StatusBadge.tsx:56-93`) maps MODEPROD_MPCODE values (case-insensitive):

| Database MPCODE | Enum Result |
|----------------|-------------|
| `Setup` | `SETUP` |
| `Prod` | `PROD` |
| `PAUSE` | `PAUSE` |
| `STOP` | `STOP` |
| `COMP` | `COMP` |
| `HOLD` | `ON_HOLD` |
| `READY` | `READY` |
| Unknown/NULL | `READY` (fallback) |

---

## Key Differences: Old CFC vs New

| Aspect | Old CFC (`ConstruitDonneesStatut`) | New (Express + React) |
|--------|------------------------------------|-----------------------|
| Status query | Direct `SELECT FROM TEMPSPROD WHERE TJSEQ` on primary | `INNER JOIN TEMPSPROD ... WHERE TPROD.TJSEQ` on primary |
| Data source | Primary DB for status; view for operation data | Primary DB for both (RequeteAlternative) |
| Go button logic | Disabled only for COMP (LePret dead code) | COMP has no available actions (terminal state) |
| Color mapping | Inline hex colors in CFC | Tailwind classes via StatusBadge component |
| Two-path branching | SETUP → RequeteAlternative; else → view | Always RequeteAlternative (single path) |
| Dead code | trouvePret query, LePret overrides | None |
