# Open Questions

## Q1: Department 10 Identity

**Question:** What is department 10 (`DESEQ = 10`) and why is it excluded from transfer button visibility?

**Source:** `Tableau_principal.cfm:19` — `trouveTableau.DESEQ NEQ 10`

**Impact:** Low — the exclusion is simple to replicate. Understanding the reason would help validate the rule during porting.

**Recommended follow-up:** Query `DEPARTEMENT` table for `DESEQ = 10` to get the department name and description.

---

## Q2: `LePret` Query Status

**Question:** Was the `trouvePret` query (operation.cfc:991-1006) disabled intentionally or temporarily? If re-enabled, it would dynamically compute readiness from `VDET_COMM` and could hide Go/Transfer buttons for unready orders.

**Source:** `operation.cfc:1007` — hardcoded `LePret = 1`; lines 991-1006 commented out

**Impact:** Medium — if this is re-enabled before migration completes, the React code would need to implement the `LePret` logic. If it was permanently disabled, we can safely ignore it.

**Recommended follow-up:** Check git history for when the `trouvePret` query was commented out and whether there are any plans to re-enable it.

---

## Q3: `Filtre12` / `Filtre13` Dead Parameters

**Question:** The JS `afficheDiv` sends `Filtre12` and `Filtre13` in the AJAX URL, but `operation.cfc:afficheDiv` only has `cfargument` for Filtre1-11. Are these intentionally unused, or does ColdFusion's `argumentCollection` capture them?

**Source:** `sp_js.cfm` (URL construction) vs `operation.cfc:9-35` (cfargument list)

**Impact:** Low — they appear to be silently ignored. Confirming this avoids accidentally omitting meaningful filters during migration.

---

## Q4: `tableau.cfc:afficheTableauOperation` Full Query

**Question:** What exact queries does `afficheTableauOperation` run when Consult/Go loads the DivOperation panel?

**Source:** `operation.cfc:afficheDiv` calls `tableau.cfc:afficheTableauOperation` — body not fully traced in this audit.

**Impact:** Out of scope for this audit (belongs to the DivOperation / S003 feature audit), but relevant if the migration needs to replicate the exact data loading.

---

## Q5: `afficheMOUVEMENT` Complete Query Set

**Question:** What is the complete set of SQL queries executed by `support.cfc:afficheMOUVEMENT`? The audit identified tables `TRANSAC`, `DET_TRANS`, `CONTENANT`, `ENTREPOT`, `AUTOFAB_TRANSFENTREP` but the exact query text was not fully extracted.

**Source:** `support.cfc:2535+`

**Impact:** Medium — needed when implementing the Transfer modal in React.

**Recommended follow-up:** Full trace of `support.cfc:afficheMOUVEMENT` method.

---

## Q6: Error Handling in Transfer and Details

**Question:** Do `afficheMOUVEMENT` and `AfficheDetailCommande` JS functions have error callbacks? If the AJAX call fails, what does the user see?

**Source:** `sp_js.cfm:1168-1181` and `sp_js.cfm:2236-2253` — no visible `.fail()` callback in the excerpts read.

**Impact:** Low — the React migration should add proper error handling regardless. But knowing the old behavior helps set expectations.

---

## Q7: `session.InfoClient.TJSEQ` Role in Consult/Go

**Question:** What is `TJSEQ` and how is it used by the `afficheDiv` flow? It's passed as a parameter from the button onclick but its role in the backend is not fully traced.

**Source:** `Tableau_principal.cfm:5,12` — passed as 8th param to `afficheDiv`; set in `initialise.cfc` from session init.

**Impact:** Medium — the React migration needs to know whether to pass this value and how to obtain it.
