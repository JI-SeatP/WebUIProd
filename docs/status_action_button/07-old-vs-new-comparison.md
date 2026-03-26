# Status Action Buttons — Old vs New Comparison

## Architecture Differences

| Aspect               | Old (ColdFusion)                                | New (React + Express)                           |
|----------------------|-------------------------------------------------|-------------------------------------------------|
| Frontend framework   | jQuery + Bootstrap 3                            | React 18 + shadcn/ui + Tailwind                 |
| Button layout        | Horizontal `btn-group` (5 icon buttons)         | Floating dropdown menu (6 actions)               |
| Confirmation         | None — immediate AJAX call on click             | ConfirmDialog before API call                    |
| HTTP method          | GET (params in URL query string)                | POST (params in JSON body)                       |
| Backend              | ColdFusion CFC (QuestionnaireSortie.cfc)        | Express.js (server/api.cjs)                      |
| SP invocation        | XML SOAP API via `envoiXMLGet()`                | Direct `mssql` driver `.execute()`               |
| Employee source      | Server-side session (`session.InfoClient.EMSEQ`)| Client-side context, sent in request body        |
| Navigation           | `afficheDiv()` (jQuery DOM swap within SPA)     | React Router `navigate()`                        |
| Screen type param    | `Type` = `"Go"` (sent to JS function)           | Not used                                         |
| Language param       | `Langue` (sent to CFC)                          | Not sent (i18n is client-side)                   |
| Department param     | `DEPARTEMENT` (sent to JS but unused by CFC)    | Not used                                         |

---

## Status Code Differences

### MODEPROD_MPCODE Values

| Status    | Old MPCODE | New Frontend Action | New maps to MPCODE |
|-----------|-----------|--------------------|--------------------|
| Setup     | `Setup`   | `SETUP`            | `Setup`            |
| Production| `Prod`    | `PROD`             | `Prod`             |
| Pause     | `PAUSE`   | `PAUSE`            | `PAUSE`            |
| Stop      | `STOP`    | `STOP`             | `STOP`             |
| Complete  | `COMP`    | `COMP`             | `COMP`             |
| On Hold   | N/A       | `ON_HOLD`          | `HOLD`             |
| Ready     | N/A       | `READY`            | `READY`            |

`ON_HOLD` and `READY` are **new statuses** that do not exist in the old ColdFusion system.

> **Note:** `RESET_READY` exists in the `StatusAction` type union (`useStatusChange.ts:6`) and in `confirmLabels` (`StatusActionBar.tsx:142`) but has NO button in the `getAllActions` array. It is an unused/reserved action variant — no UI element triggers it. The actual status shown for ready operations uses `READY` (the OperationStatus enum), not `RESET_READY`.

---

## Button Visibility Differences

### Transitions the OLD allows but NEW does NOT

| From    | To      | Old | New | Impact                                              |
|---------|---------|-----|-----|------------------------------------------------------|
| PROD    | SETUP   | ✅  | ❌  | Old lets you go back to SETUP from active production |
| PAUSE   | SETUP   | ✅  | ❌  | Old lets you go to SETUP from paused state           |

### Transitions the NEW allows but OLD does NOT

| From     | To       | Old | New | Impact                                    |
|----------|----------|-----|-----|-------------------------------------------|
| Any PROD | ON_HOLD  | N/A | ✅  | New "On Hold" status not in old system    |
| ON_HOLD  | SETUP    | N/A | ✅  | Recovery from ON_HOLD                     |
| ON_HOLD  | PROD     | N/A | ✅  | Recovery from ON_HOLD                     |

### Selected/Highlighted State

- **Old:** The current status button gets a highlighted border class (e.g., `SETUPencadre`) and is NOT clickable
- **New:** No "selected" concept in dropdown — current status is shown on the trigger button; the dropdown only shows other available actions

---

## Backend Logic Differences

### 1. CNOMENCLATURE and INVENTAIRE Resolution

**Old:** Uses `ConstruitDonneesLocales()` method (`support.cfc:772-1072`) which:
- Queries `vEcransProduction`, `PARA_CIE`, `TRANSAC`, `NOMENCLATURE`, and other tables
- Resolves `Matiere_NiSeq`, `Fabrique_NiSeq`, `Matiere_InSeq`, `Inventaire_P`, `Transac_InSeq`
- Uses a priority chain: Matiere_NiSeq > Fabrique_NiSeq > empty (for CNOMENCLATURE)
- Uses a priority chain: Matiere_InSeq > Inventaire_P (if != Transac_InSeq) > empty (for INVENTAIRE)

**New:** Uses `vEcransProduction.CNOMENCLATURE` and `vEcransProduction.INVENTAIRE_SEQ` directly.

**Risk:** If the view's values differ from what `ConstruitDonneesLocales()` would resolve, the TEMPSPROD rows will have different CNOMENCLATURE/INVENTAIRE_C values.

### 2. TJNOTE Value

- **Old:** `'Ecran de production pour Temps prod'`
- **New:** `'Ecran de production pour Temps prod New'`

Both match the filter `LIKE 'Ecran de production pour Temps prod%'`, so queries work across both. The "New" suffix distinguishes rows created by the new system.

### 3. COMP Status End Date

**Old (`QuestionnaireSortie.cfc:1479-1485`):**
When status is COMP, the INSERT sets `StrDateF` and `StrHeureF` to NOW:
```coldfusion
<cfif arguments.Statut EQ "COMP">
    <cfset LaDateFin = DateFormat(Now(),"yyyy-mm-dd")>
    <cfset LaHeureFIn = TimeFormat(Now(),'HH:nn:ss')>
```

**New (`api.cjs:3691-3692`):**
Always sets empty end date/time on insert:
```javascript
insertReq.input("StrDateF", sql.Char(10), "");
insertReq.input("StrHeureF", sql.Char(8), "");
```

**Impact:** In the old system, if COMP is the status being set, the newly inserted TEMPSPROD row is immediately "closed" (has both start and end times set to NOW). In the new system, the COMP row is inserted with empty end date/time (same as any other status), meaning it starts "open" and would need to be closed by the questionnaire submission or a subsequent operation.

### 4. VCUT Detection

**Old:** Checks both `NO_INVENTAIRE` and `PRODUIT_CODE`:
```coldfusion
trouveOperation.NO_INVENTAIRE NEQ "VCUT" AND trouveOperation.PRODUIT_CODE NEQ "VCUT"
```

**New:** Only checks `NO_INVENTAIRE`:
```javascript
const isVcut = op.NO_INVENTAIRE === "VCUT";
```

**Impact:** If a product has `PRODUIT_CODE = "VCUT"` but `NO_INVENTAIRE` is something else, the new system would incorrectly attempt cost recalculation.

### 5. Employee Query

**Old:** Queries EMPLOYE table to get details:
```sql
SELECT EMSEQ, EMNO, EMNOM, EMTAUXHOR FROM EMPLOYE WHERE EMSEQ = @EMSEQ
```
But only uses `EMSEQ` for the SP call (rate is always 0).

**New:** Skips this query entirely — employee EMSEQ comes directly from the request body.

### 6. Quantity Totals Query

**Old (`QuestionnaireSortie.cfc:1468-1477, 1615-1624`):**
After closing the previous row, queries total PROD quantities:
```sql
SELECT SUM(TJQTEPROD) AS TotalPROD, SUM(TJQTEDEFECT) AS TotalDEFECT
FROM TEMPSPROD
WHERE TRANSAC = @TRANSAC AND cNomencOp = @NOPSEQ AND MODEPROD_MPCODE = 'PROD'
```

This runs twice in the old code:
- Line 1468: after closing the previous row (inside `trouveDernierStatut.RecordCount == 1` block)
- Line 1615: after cost recalculation (inside `STOP/COMP AND non-VCUT` block)

The results are stored in `LeTJQTEPROD`, `LeTJQTEDEFECT`, and `QteTotale`, but **none of these are included in the return value** (lines 1630-1634 only return `LeTJSEQ` and `MODEPROD_MPCODE`). This is dead code — the quantities are computed but discarded.

**New:** Does not run this query at all (correctly omitted since the result was unused).

### 7. Error Handling

**Old:** Wraps SP calls in XML API; errors come back as `SQLERREUR` and `ERREUR` in response struct. The function continues executing even if errors occur — no early return.

**New:** Uses try/catch with `.execute()`. Cost recalculation errors are caught and logged as warnings but do not fail the request:
```javascript
try { /* cost recalc */ } catch (err) { console.warn("[changeStatus] Cost recalc skipped:", err.message); }
```

---

## Response Format Differences

### Old Response

```json
{
  "LeTJSEQ": 12345,
  "MODEPROD_MPCODE": "Prod"
}
```

- `MODEPROD_MPCODE` is the **previous** row's status (from `trouveDernierStatut`)
- Frontend uses this to detect SETUP→PROD transition

### New Response

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

- Does NOT return previous row's MODEPROD_MPCODE
- Frontend detects SETUP→PROD by checking `currentStatus === "SETUP"` client-side before the API call

### 8. Update SP — OPERATION/MACHINE Source

**Old (`QuestionnaireSortie.cfc:1443`):** Always uses the **current operation query** result: `trouveOperation.Operation_Seq` and `trouveOperation.MACHINE`.

**New (`api.cjs:3648-3649`):** Uses **previous TEMPSPROD row with fallback**: `prev.OPERATION || op.OPERATION_SEQ` and `prev.MACHINE || op.MACHINE`.

**Impact:** If the machine was reassigned (via changeMachine) between when the previous TEMPSPROD row was created and when the status change happens, old code would pass the NEW machine to the Update SP (closing the old row with the new machine), while new code would pass the OLD machine from the previous row (preserving the machine that was active during that period). The new behavior is arguably more correct.

### 9. Update SP — cNOMENCLATURE Source

**Old (`QuestionnaireSortie.cfc:1443`):** Uses `trouveDernierStatut.CNOMENCLATURE` — the value from the previous TEMPSPROD row only.

**New (`api.cjs:3653`):** Uses `prev.cNOMENCLATURE || op.CNOMENCLATURE || 0` — falls back to current operation data if the previous row has no value.

**Impact:** If the previous row had a NULL or 0 cNOMENCLATURE (which shouldn't happen in practice), old code would pass 0 while new code would fall back to the current operation's CNOMENCLATURE.

### 10. NOPTEMPSETUP Condition for SETUP Cost Recalc

**Old (`QuestionnaireSortie.cfc:1601`):** `trouveCNOMENCOP.NOPTEMPSETUP NEQ 0` — triggers SETUP cost recalc for any non-zero value including negatives.

**New (`api.cjs:3767`):** `setupCheck.recordset[0].NOPTEMPSETUP > 0` — only triggers for strictly positive values.

**Impact:** If NOPTEMPSETUP is ever negative (unknown if this occurs in practice), old would trigger SETUP cost recalculation but new would not.

### 11. MODEPROD_MPCODE Casing in Queries

**Old:** Uses uppercase in WHERE clauses: `MODEPROD_MPCODE = 'SETUP'` (`QuestionnaireSortie.cfc:1335`), `MPCODE = 'PROD'` (`QuestionnaireSortie.cfc:1354`).

**New:** Uses title-case matching the stored values: `MODEPROD_MPCODE = 'Setup'` (`api.cjs:3774`), `MPCODE = 'Prod'` (`api.cjs:3578`).

**Impact:** Both work correctly due to SQL Server's default case-insensitive collation. No functional difference.

### 12. ON_HOLD and Cost Recalculation

ON_HOLD is a new status that does not exist in the old system. In the new code, ON_HOLD does NOT trigger cost recalculation (`api.cjs:3740` only checks `mpcode === "STOP" || mpcode === "COMP"`). ON_HOLD also does NOT zero cost fields (`api.cjs:3726` checks `PAUSE || STOP || COMP`). This means an ON_HOLD row retains whatever cost rates the SP sets.

### 13. trouveDernierStatut Condition Check

**Old (`QuestionnaireSortie.cfc:1434`):** `trouveDernierStatut.RecordCount EQ 1` — checks for exactly 1 row.

**New (`api.cjs:3635`):** `tpResult.recordset.length > 0` — checks for any rows.

**Impact:** Functionally equivalent since `SELECT TOP 1` returns 0 or 1 rows. No behavioral difference.

### 14. Clarion Date Calculations (Dead Code)

**Old (`QuestionnaireSortie.cfc:1486-1488`):**
```coldfusion
<cfset LaDateDebut = CreateDateTime(Year(Now()),Month(Now()),Day(Now()),'00','00','00')>
<cfset LaDateClarion = DateDiff('d',Now(),'1800,12,28')>
<cfset LaHeureClarion = DateDiff('s',Now(),LaDateDebut) * 100>
```

These Clarion epoch date values are calculated but **never used** anywhere in the function. They are dead code from an older version of the system. The new implementation correctly omits them.

---

## STATUT_CODE Source Difference (getOperation endpoint)

### 15. STATUT_CODE: Datasource Structure Mismatch (Fixed)

> **BUG — DISCOVERED DURING IMPLEMENTATION (2026-03-26), ROOT CAUSE FIXED (2026-03-26)**

**Old (`getOperation.cfm:37-147`):**
The CFM endpoint uses a **two-step** approach on the **primary database**:
1. Gets the latest `TJSEQ` from `vEcransProduction` view (`ORDER BY v.TJSEQ DESC`)
2. Runs RequeteAlternative query with `INNER JOIN TEMPSPROD TPROD ON T.TRSEQ = TPROD.TRANSAC AND CNOP.NOPSEQ = TPROD.CNOMENCOP WHERE TPROD.TJSEQ = @theTJSEQ`
3. Returns `TPROD.MODEPROD_MPCODE AS STATUT_CODE` directly from the join

This reads the **actual TEMPSPROD row's status code** on the **primary database**.

**Root cause:** The Express endpoint originally queried the `vEcransProduction` view directly on the **EXT database** (`poolExt`) instead of replicating the CFM's RequeteAlternative approach on the **primary database** (`pool`). The view's STATUT_CODE column IS from `TPROD.MODEPROD_MPCODE` via an OUTER APPLY on `AUTOFAB_TEMPSPROD` (view definition line 118/173), but the OUTER APPLY has restrictive filters (`OPERATION IS NOT NULL`, null-safe NOPSEQ matching) that can miss certain TEMPSPROD rows. This caused operations in STOP, PAUSE, or other active statuses to incorrectly display as "Prêt" (READY).

**Note on the view's STATUT_CODE:** The vEcransProduction view DOES source its STATUT_CODE from TEMPSPROD (not from PL_RESULTAT as was previously documented). The issue was the Express endpoint's query strategy, not the view's column definition. See `06-database-tables.md` for the exact OUTER APPLY definition.

**Fix applied:** The Express `getOperation` endpoint now replicates the CFM's exact two-step approach:
1. Gets TJSEQ from `vEcransProduction` using `pool` (primary database)
2. Runs RequeteAlternative on `pool` (primary database) with `INNER JOIN TEMPSPROD`
3. Cross-references EXT database for VBE and functions using `DB_EXT` variable (mirrors CF's `#datasourceExt#` pattern)

STATUT_CODE comes directly from `TPROD.MODEPROD_MPCODE` via the INNER JOIN — no override or patch needed.

### 16. statusCodeToEnum Missing MPCODE Mapping

**Issue:** The `statusCodeToEnum()` function in `StatusBadge.tsx` was missing a mapping for the raw MPCODE value `"HOLD"` (the database value for ON_HOLD status). It only had `"on_hold"` (the frontend action name).

When `TEMPSPROD.MODEPROD_MPCODE` contains `"HOLD"`:
- `"HOLD".toLowerCase()` → `"hold"`
- `stringMap["hold"]` → `undefined` (not found!)
- Falls back to `"READY"` (incorrect)

**Fix applied:** Added `hold: "ON_HOLD"` to the stringMap in `statusCodeToEnum()`.

**General principle:** The stringMap must cover **both** frontend action names (`"on_hold"`) **and** raw MPCODE values from the database (`"hold"`, `"setup"`, `"prod"`, etc.). All existing MPCODE values happened to match their lowercase stringMap keys — except `"HOLD"`.

---

## Summary of Items to Verify for Parity

### Data Integrity
1. **CNOMENCLATURE/INVENTAIRE resolution** — Ensure `vEcransProduction.CNOMENCLATURE` and `INVENTAIRE_SEQ` return the same values as the old `ConstruitDonneesLocales()` priority chain (Matiere_NiSeq > Fabrique_NiSeq > empty)
2. ~~**COMP end date**~~ — **FIXED.** New system now sets end date/time = NOW for COMP rows (matching old software)
3. ~~**VCUT detection**~~ — **FIXED.** Added `PRODUIT_CODE` check alongside `NO_INVENTAIRE`
4. ~~**Update SP OPERATION/MACHINE source**~~ — **FIXED.** Now uses current operation data (matching old software)
5. ~~**Update SP cNOMENCLATURE source**~~ — **FIXED.** Now uses previous row only, no fallback (matching old software)
6. ~~**NOPTEMPSETUP condition**~~ — **FIXED.** Changed to `!== 0` (matching old software's `NEQ 0`)

### UI Behavior
7. ~~**PROD→SETUP transition**~~ — **FIXED.** Restored in `StatusActionBar.tsx`
8. ~~**PAUSE→SETUP transition**~~ — **FIXED.** Restored in `StatusActionBar.tsx`

### Infrastructure
9. **ON_HOLD status** — Verify MODEPROD table has `HOLD` MPCODE entry in database
10. ~~**Error handling**~~ — **FIXED.** Added user-facing error alerts in `useStatusChange.ts`
11. **SP ERREUR output** — Neither old nor new code stops on SP error codes; verify this is intentional
12. **ON_HOLD cost behavior** — ON_HOLD rows do not get zeroed cost fields and do not trigger cost recalculation. Verify this is the intended behavior for a "hold" state
13. ~~**STATUT_CODE source**~~ — **FIXED.** Express getOperation now uses RequeteAlternative on primary DB with INNER JOIN TEMPSPROD (matching CFM endpoint exactly)
14. ~~**statusCodeToEnum "HOLD" mapping**~~ — **FIXED.** Added `"hold": "ON_HOLD"` to stringMap
