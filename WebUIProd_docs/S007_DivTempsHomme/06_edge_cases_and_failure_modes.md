# 06 — Edge Cases and Failure Modes

## Validation Failures

### Client-Side (JS)

#### `AjouteModifieTempsHomme` — 5 sequential guards (`sp_js.cfm:795-840`)

| # | Field | Condition | User Feedback |
|---|-------|-----------|---------------|
| 1 | DateDebut | Empty string | `alert(MessageChampManquant)` + return |
| 2 | DateFin | Empty string | `alert(MessageChampManquant)` + return |
| 3 | Departement | `parseFloat() == 0` | `alert(MessageChampManquant)` + return |
| 4 | Machine | `parseFloat() == 0` | `alert(MessageChampManquant)` + return |
| 5 | Employe | `parseFloat() == 0` | `alert(MessageChampManquant)` + return |

**Note:** Effort rate is NOT validated client-side. A value of 0 or negative will pass client validation but produce a zero-duration entry server-side.

#### `CalculHeures` — negative duration (`sp_js.cfm:495-544`)

If `DateFin < DateDebut`, the display shows `"Negative"` in both `HeuresDates` and `HeuresTravaillees` divs. This is a visual warning only — it does not block form submission.

### Server-Side (CFC)

#### `ajouteModifieTempsHomme` — 2 guards

| Guard | Condition | Result | User Feedback |
|-------|-----------|--------|---------------|
| Duplicate | All 6 fields match an existing record | Return `-1` | JS shows `alert(MessageErreurDate)` |
| Zero/negative duration | `DateDiff('n', DateDebut, DateFin) <= 0` | Return `-1` | JS shows `alert(MessageErreurDate)` |

**Note:** Both failure conditions return the same value (`-1`), making it impossible for the client to distinguish between a duplicate and a duration error.

---

## Guard Clauses

### `afficheTempsProd` — empty filter guard

**Source:** `operation.cfc:~5453`

If ALL five filter fields are empty/zero/default, the query includes `AND 0=1`, returning zero rows. This prevents an unbounded full-table scan.

**Confidence:** Direct — observed in the conditional WHERE clause assembly.

### `afficheTempsProd` — Operation 11 exclusion

**Source:** `operation.cfc:~5454`

The fixed filter `AND (T.OPERATION <> 11 OR T.OPERATION IS NULL)` always excludes operation 11 records. The meaning of operation 11 is not documented in the code.

**Confidence:** Direct.

### `trouveDepartements` — visibility filter

**Source:** `operation.cfc:1637`

`WHERE DEVOIRDANSUSINE = 1` ensures only factory-floor-visible departments appear.

### `trouveDepartements` — Forklift role restriction

**Source:** `operation.cfc:~1640-1642`

If `session.InfoClient.CodeFonction == 1034`, only departments where `DECODE LIKE 'Forklift%'` are shown.

---

## No-Error-Handling Cases

### `ModifieStatutTempsProd` — always returns `"0"`

**Source:** `operation.cfc:5922-5945`

There is no `<cftry>/<cfcatch>`. If the `MODEPROD` lookup returns zero rows (invalid status code), the UPDATE will write NULL values for `MPDESC_P`/`MPDESC_S`. If the UPDATE fails entirely, ColdFusion will return an HTML error page instead of `"0"`.

The JS caller checks for `-1` as an error indicator (`sp_js.cfm:879`), but the CFC never returns `-1`. The only way the error branch triggers is if ColdFusion returns an error string that starts with `-1`, which is unlikely.

**Porting implication:** The rewrite should add proper error handling and return distinct error codes.

### `retireTempsHomme` — no existence guard

**Source:** `operation.cfc:5736-5753`

The function does a SELECT before DELETE, but does not check `RecordCount` before executing the DELETE. If the record doesn't exist:
- The DELETE is a no-op
- The return value will be an empty string (since `trouveTempsHomme.EMPHSEQ` is blank when `RecordCount=0`)
- The JS caller passes this empty string to `afficheTempsHomme` and `afficheTempsEmploye`, which will work but with no row highlighted

### No `<cftry>/<cfcatch>` on any function

None of the 11 CFC methods documented in this audit use `<cftry>/<cfcatch>`. Any database error produces a raw ColdFusion HTML error response, which will break the jQuery `$.ajax` success handler.

---

## Partial Update Risks

### `ModifieStatutTempsProd` — denormalized write

The UPDATE writes 4 columns atomically (`MODEPROD`, `MODEPROD_MPCODE`, `MODEPROD_MPDESC_P`, `MODEPROD_MPDESC_S`). If the `MODEPROD` lookup returns no rows, the integer FK `MPSEQ` will be undefined, potentially writing `0` or NULL while writing the string code. This would create an inconsistent state between the FK and the denormalized description.

### `ajouteModifieTempsHomme` — Effort division inconsistency

**Source:** `operation.cfc:5780-5847`

The INSERT uses `Val(arguments.Effort)/100` to compute `EMPHEFFORT_HOMME`. The duplicate-check query formats it as `NumberFormat(Val(arguments.Effort)/100, '0.00')`. If `Effort=33`, the INSERT stores `0.33` but the duplicate check compares against `'0.33'` — rounding may differ for edge-case values.

---

## Surprising Behavior

### Initial search tab loads with impossible employee

**Source:** `operation.cfc:1247`

`afficheTempsHomme` is called with `Employe=-1250000`, which will never match any real employee. This is an intentional trick to load the search tab with zero results while still rendering the table structure.

### Initial search tab uses `Filtre5` for both start and end date

**Source:** `operation.cfc:1243-1244`

Both `DateDebut` and `DateFin` arguments are set to `session.InfoClient.Filtre5` (the start date). This means the initial search tab results are always empty because start == end with no employee match anyway.

### Duplicate HTML element IDs

**Source:** `afficheTempsHomme` (line ~5300, 5350)

The delete and edit buttons use fixed IDs (`btnRETIRE_PETIT`, `btnMODIFIE_PETIT`) for every row, producing duplicate `id` attributes. This is invalid HTML but functionally benign since they use `onClick` handlers rather than ID-based targeting.

### `EQUIPE` query result unused

**Source:** `operation.cfc:1192-1196`

`trouveQuarts` is executed but never referenced in the HTML rendering. The shift boundaries are hardcoded in the shift detection logic (07:00, 15:30, 00:00, 07:00).

---

## Dead-End States

### Machine dropdown shows `"--"` only

If the user's department has no machines in the `MACHINE` table, the machine dropdown will only show the `"--"` (value=0) option. The validation will reject submission since `parseFloat(Machine) == 0`.

### Employee lookup fails silently

If `afficheNomEmploye()` returns no match, `EmployeHomme_0` remains `0`. The submission validation will reject with `MessageChampManquant` but the user may not understand why if the employee code field appears populated.
