# 06 - Edge Cases & Failure Modes

## Dead Code: `LePret` Dynamic Query

### Finding
The `trouvePret` query against `VDET_COMM` (operation.cfc:991-1006) is **commented out**. `LePret` is hardcoded to `1`.

### Confidence: Direct
- Source: `operation.cfc:1007` — `local.Statut.LePret = 1;`
- Source: `operation.cfc:991-1006` — commented-out `<cfquery name="trouvePret">`

### Impact
- The Go button is never hidden by `LePret` (only by COMP status or VCUT completion)
- The Transfer button's `LePret EQ 1` gate always passes
- The "En Attente" (waiting) visual path (operation.cfc:1105-1113) is unreachable

### Porting Implication
The React migration should **not** implement `LePret` logic unless the CF code is first updated to re-enable it. Port only the active code paths.

---

## VCUT Completion Override

### Finding
For VCUT orders where `qteRestante <= 0`, the system overrides both the visual status (forces COMP appearance) and `LeBoutonGo` (forces to `0`), regardless of the actual `STATUT_CODE`.

### Confidence: Direct
- Source: `operation.cfc:1114-1124`

```coldfusion
<cfif (trouveTableau.NO_INVENTAIRE[CurrentRow] EQ "VCUT"
  OR trouveTableau.PRODUIT_CODE[CurrentRow] EQ "VCUT")
  AND qteRestante LTE 0>
    <!--- Force COMP visual --->
    local.Statut.LaCouleurBG = "#cfe2ff";
    local.Statut.LaImageStatut = "sm_btn_terminer_actif.png";
    local.Statut.LeBoutonGo = 0;
</cfif>
```

### Impact
- A VCUT order can be in PROD/SETUP/PAUSE status but show as COMP and hide the Go button if all big sheets have been consumed
- The `qteRestante` calculation depends on `trouveQteBigSheets` subquery: `SUM(DET_TRANS.DTRQTE) WHERE TRNO_EQUATE = 7`

### Porting Implication
The React migration already has `isVcutCompleted()` in `src/lib/utils.ts` for status badge rendering but must also wire it to hide the Go action in `ActionsDropdown.tsx`.

---

## Department 10 Transfer Exclusion

### Finding
Transfer button is never shown for department 10 (`DESEQ NEQ 10`).

### Confidence: Direct
- Source: `Tableau_principal.cfm:19`

### Impact
Orders from department 10 cannot have material transfers initiated from the order list, even by cell chiefs.

### Porting Implication
Must preserve the `DESEQ !== 10` check. The current `ActionsDropdown.tsx` already has this check.

---

## Duplicate HTML IDs

### Finding
Transfer button variants A (blue) and B (red) both use `id="btnCARISTE_MOYEN"`. Variant C (gray) uses `id="btnCARISTE_PETIT"`.

### Confidence: Direct
- Source: `Tableau_principal.cfm:21,28,35`

### Impact
Since the `<cfif>/<cfelseif>/<cfelseif>` ensures only one variant renders per row, duplicate IDs don't cause runtime issues. However, `document.getElementById('btnCARISTE_MOYEN')` across multiple rows would be ambiguous (though the old code doesn't use ID-based selection on these buttons).

### Porting Implication
Not relevant — React uses component keys, not HTML IDs.

---

## Filter Skip Logic (Row Filtering)

### Finding
After computing button state, rows may be **skipped** (not rendered) based on `LeBoutonGo` and `Filtre1`:

### Confidence: Direct
- Source: `operation.cfc:1125-1147`

| Condition | Result |
|-----------|--------|
| `MASEQ NEQ "" AND LeBoutonGo EQ 0` | Row skipped entirely |
| `Filtre1 = 2` | Only rows where `LeBoutonGo = 0` (COMP only) |
| `Filtre1 = 1` | Only rows where `LeBoutonGo = 1` (non-COMP only) |
| `Filtre1 = 3` (default) | All rows shown |

### Impact
`LeBoutonGo` serves a dual purpose: it controls Go button visibility AND acts as a filter criterion. When `Filtre1=1` (show "En cours" / in-progress), completed orders are filtered out entirely — the row isn't rendered at all, not just the Go button hidden.

### Porting Implication
The React migration must replicate this filtering logic. `LeBoutonGo` is not just a UI flag — it's a filter condition that determines whether a row appears in the list.

---

## `DESEQ` Missing `[CurrentRow]` Indexer

### Finding
Line 19 of `Tableau_principal.cfm` uses `trouveTableau.DESEQ` without `[CurrentRow]`, unlike every other column reference.

### Confidence: Tentative inference
- In ColdFusion `<cfloop query>` context, unindexed column references resolve to the current row, so this works correctly.
- It may be an oversight or intentional shorthand.

### Impact
No functional impact — behaves identically to `trouveTableau.DESEQ[CurrentRow]`.

---

## `Filtre12` / `Filtre13` Mismatch

### Finding
The JS `afficheDiv` function sends `Filtre12` and `Filtre13` in the AJAX URL, but `operation.cfc:afficheDiv` only declares `cfargument` for `Filtre1` through `Filtre11`.

### Confidence: Direct
- Source: `sp_js.cfm` — URL construction includes Filtre12, Filtre13
- Source: `operation.cfc:9-35` — cfargument list ends at Filtre11

### Impact
ColdFusion silently ignores URL parameters that have no matching `cfargument`. These filters have no backend effect.

### Porting Implication
Do not port Filtre12/Filtre13 — they are dead parameters.

---

## AJAX Error Handling

### Finding
The `afficheDiv` JS function has a `.fail()` callback but the old code only shows a generic error message. The `afficheMOUVEMENT` and `AfficheDetailCommande` functions do not appear to have explicit error callbacks.

### Confidence: Strong inference
- Source: `sp_js.cfm:324-472` (afficheDiv has error handling)
- Source: `sp_js.cfm:1168-1181` (afficheMOUVEMENT — no visible .fail())
- Source: `sp_js.cfm:2236-2253` (AfficheDetailCommande — no visible .fail())

### Impact
If the AJAX call for Transfer or Details fails, the modal may not open and no error is shown to the user.

### Porting Implication
The React migration should add proper error handling for all button actions.
