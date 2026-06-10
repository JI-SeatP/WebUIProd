# Appendix C — Open Questions

## Resolved

### R1: Initial search tab load — intentional zero results
**Resolution:** `Employe=-1250000` is an intentional impossible value to render the table structure without data. Confirmed by context — the search tab is not the default active tab.

### R2: `EQUIPE` query unused
**Resolution:** Executed at line 1192 but never referenced. Shift boundaries are hardcoded. The query is vestigial.

### R3: What does Operation 11 represent?
**Resolution:** `T.OPERATION = 11` (`OPCODEMAT_OUTING`) means "Sortie de matériel / Material Outing". This is an operation type that is intentionally excluded from display in both WebUIPROD and the old software. The filter `AND (T.OPERATION <> 11 OR T.OPERATION IS NULL)` must be preserved in the rewrite.

### R4: What is `trouveEffort()` and where is it defined?

**Resolution:** `trouveEffort(Sequence, Selection, Prefixe)` is defined at `sp_js.cfm:580-591`. It fires on machine dropdown `onChange` and calls `operation.cfc?method=trouveEffort` (CFC lines 6026-6042).

**CFC query:**
```sql
SELECT MAEFFORTHOMME FROM MACHINE WHERE MASEQ = :Machine
```
Datasource: `THIS.dsClient`

**Behavior:** Returns the machine's effort rate (`MAEFFORTHOMME` — a decimal fraction, e.g. `0.85`). The JS writes `Math.round(value)` into `{Prefixe}Effort_{Sequence}` input (displayed as percentage, e.g. `85`), then calls `CalculHeures(Sequence, Prefixe)` to recompute effective hours.

**Porting implication:** The rewrite must auto-fill the effort rate when the machine changes. The `MACHINE` table has an `MAEFFORTHOMME` column storing the default effort rate for each machine. The effort is stored as a decimal (0.00-1.00) but displayed as an integer percentage (0-100).

### R5: Does changing status to COMP/STOP trigger the questionnaire flow?

**Resolution:** **No.** `ModifieStatutTempsProd` (CFC line 5922-5945) does exactly one database operation: a 4-column UPDATE on `TEMPSPROD` (MODEPROD, MODEPROD_MPCODE, MODEPROD_MPDESC_P, MODEPROD_MPDESC_S). After success, the JS only calls `afficheTempsProd(Sequence)` to re-render the table. No questionnaire is opened, no additional writes occur.

The `TJPROD_TERMINE = 1` update and `PL_RESULTAT.PR_TERMINE = 1` that are associated with COMP **only fire inside `QuestionnaireSortie.cfc::ModifieTEMPSPROD`** (line 919-929), which is a completely separate path triggered by the questionnaire form submission from the main production screen — not from the Production Time tab.

**Note:** SQL Server database triggers on `TEMPSPROD` cannot be ruled out from application code alone — they would need to be checked on the database server.

### R6: Are `ListeQteProduite` and `ListeQteDefect` dead code?

**Resolution:** **Partially implemented / broken code.** The infrastructure is fully wired on both sides:
- CFC initializes the variables, converts them with `ListToArray`, and returns them in the JSON struct
- JS parses the arrays and has working `VKI_attach` loop logic (`sp_js.cfm:741-758`)
- Hidden `<input>` elements with IDs `TP_TJQTEPROD_{TJSEQ}` and `TP_TJQTEDEFECT_{TJSEQ}` are generated per row

**But the `ListAppend` calls that should populate the lists inside the `<cfloop>` were never written.** No line in `operation.cfc` ever appends to `Resultat.ListeQteProduite` or `Resultat.ListeQteDefect`. Both remain empty strings → `ListToArray("")` → empty arrays → JS loops execute zero times.

Additionally, the target inputs are `type="hidden"`, so attaching a virtual keyboard to them would be pointless even if the arrays were populated. This appears to be a planned-but-never-finished feature.

**Porting implication:** Safely omit. Do not replicate.

### R7: What is `modifieDonneesSession()`?

**Resolution:** A fire-and-forget session persistence function.

**JS definition:** `sp_js.cfm:241-251`
```javascript
function modifieDonneesSession(Item, Valeur) {
    $.ajax({
        url: CheminCFC + 'support.cfc?method=modifieDonneesSession&Item=' + Item + '&Valeur=' + Valeur,
        type: 'GET',
        success: function (result) {
            if (Item == 'Tous') { location.href = Racine + "web_prive_Accueil"; }
        }
    });
}
```

**CFC definition:** `support.cfc:765-770`
```coldfusion
<cfset 'session.InfoClient.#arguments.Item#' = arguments.Valeur>
<cfreturn arguments.Valeur>
```

Single-line function that sets `session.InfoClient.{Item} = Valeur`. No database writes, no logging, no validation. Used by `afficheTempsProd` JS to persist the 5 filter values (Filtre5, 6, 11, 12, 13) before querying.

**Porting implication:** In the React rewrite, filter persistence can be handled via React state, URL search params, or localStorage. No server-side session storage needed.

### R8: `AutoFAB_*` objects — cross-database references

**Resolution:** The `AutoFAB_` prefix is a cross-database reference mechanism. When a query runs on the `_EXT` database and needs to read tables from the primary database, it uses the `AutoFAB_` prefix. For example, to read `TS_SEATPL.TRANSAC` from a query running on `TS_SEATPL_EXT`, use `AutoFAB_TRANSAC`.

This prefix works transparently across both environments:
- Test: `TS_SEATPL_EXT` → `AutoFAB_X` resolves to `TS_SEATPL.X`
- Production: `AF_SEATPLY_EXT` → `AutoFAB_X` resolves to `AF_SEATPLY.X`

**Porting implication:** The Express API connects to both databases directly with separate connection pools. Cross-database JOINs via `AutoFAB_` are not needed — queries on `EMPLOYE_HEURES` can JOIN to `DEPARTEMENT`, `MACHINE`, `EMPLOYE` directly using the primary connection.

### R9: Effort rate precision

**Resolution:** Confirmed by user. The rewrite should use consistent decimal precision for both storage and comparison. Recommendation: store as integer percentage (0-100) and convert on read, or use a fixed 2-decimal format throughout. Avoid mixing `NumberFormat(..., '0.00')` string comparison with raw decimal arithmetic.

## Remaining Open

### Q1: SQL Server database triggers on TEMPSPROD

**Context:** The audit confirmed no application-level code triggers additional writes when `ModifieStatutTempsProd` changes a status. However, SQL Server triggers defined directly on the database (not in this repo) could fire on UPDATE.

**Impact:** If triggers exist (e.g., `TR_TEMPSPROD_UPDATE`), they may perform additional writes when status changes. The rewrite must check the database server for trigger definitions.

**Suggested probe:** Run `SELECT name, OBJECT_DEFINITION(object_id) FROM sys.triggers WHERE parent_id = OBJECT_ID('TEMPSPROD')` on the production database.
###### ANSWER FROM USER:
This brings empty results (no rows)
