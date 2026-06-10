# 03 - Execution Paths

## Flow 1: Display SM in corrections form

| Step | File:Line | Action |
|------|-----------|--------|
| 1 | `SortieMateriel.cfc:103-107` | Query SMNOTRANS from TEMPSPROD by TJSEQ |
| 2 | `SortieMateriel.cfc:108-118` | Query DET_TRANS with OUTER APPLY for QTECORRIGEE |
| 3 | `SortieMateriel.cfc:143-148` | Per row: if QTECORRIGEE=0 → use DTRQTE; else use QTECORRIGEE |
| 4 | `SortieMateriel.cfc:153-156` | Render `<div>` (display) + `<input type="hidden" name="DTRQTE_SM_<DTRSEQ>">` |
| 5 | `SortieMateriel.cfc:121-177` | If no DET_TRANS rows found → show error + fallback detail table |

## Flow 2: Recalculate SM quantities (non-QS `calculeQteSM`)

| Step | File:Line | Action |
|------|-----------|--------|
| 1 | `sp_js.cfm:1878-1896` | JS reads DOM values and POSTs FormData to `SortieMateriel.cfc?method=calculeQteSM` |
| 2 | `SortieMateriel.cfc:739-740` | Compute `TotalQte = QteBonne + QteDefectueux` and `TotalQteOrigine` |
| 3 | `SortieMateriel.cfc:749-771` | Query DET_TRANS with OUTER APPLY + computed RATIO column |
| 4a | `SortieMateriel.cfc:776-797` | **Branch A (has EPF):** Lookup NIQTE from BOM → `NouvelleQte = TotalQte × NIQTE` |
| 4b | `SortieMateriel.cfc:798-811` | **Branch B (no EPF):** `LeRatio = OriginalTotal / QteBonne` → `NouvelleQte = TotalQte / LeRatio` |
| 5 | `SortieMateriel.cfc:794,808` | Guard: only include rows whose `form.DTRQTE_SM_<DTRSEQ>` was submitted |
| 6 | `SortieMateriel.cfc:815-820` | Return `{ListeDTRSEQ: [...], ListeQteSM: [...], Erreur: ""}` |
| 7 | `sp_js.cfm:1918-1920` | JS writes each `ListeQteSM[i]` into `DTRQTE_SM_<DTRSEQ>` hidden + display div |

## Flow 3: SM correction on submit (CorrigeProduction)

| Step | File:Line | Action |
|------|-----------|--------|
| 1 | `CorrectionInventaire.cfc:291-298` | Query DET_TRANS rows (NO OUTER APPLY — raw DTRQTE) |
| 2 | `CorrectionInventaire.cfc:300` | Check `isDefined('form.DTRQTE_SM_<DTRSEQ>')` |
| 3 | `CorrectionInventaire.cfc:301` | Compare `form.DTRQTE_SM_<DTRSEQ>` with `DTRQTE` |
| 4 | `CorrectionInventaire.cfc:313-323` | If different → call `Nba_Corrige_Quantite_Transaction(DTRSEQ, new_qty, username)` via SOAP |
| 5 | `CorrectionInventaire.cfc:337-339` | Accumulate result messages |

**Key asymmetry:** Display uses OUTER APPLY (corrected qty), submit compares against raw `DTRQTE`. This means if a prior correction exists, the SP will fire even if the user didn't change anything (because corrected value ≠ raw DTRQTE).

## Flow 4: SM creation (QS path via `ajouteSM`)

| Step | File:Line | Action |
|------|-----------|--------|
| 1 | `SortieMateriel.cfc:1566-1572` | Call `support.trouveUneOperation` → detect VCUT |
| 2 | `SortieMateriel.cfc:1722-1731` | Call `support.ConstruitDonneesLocales` → build context struct |
| 3 | `SortieMateriel.cfc:1736-1748` | Call `InsertSortieMateriel` |
| 3a | `SortieMateriel.cfc:2289` | SP: `Nba_Sp_Insert_Sortie_Materiel` (creates SM header) |
| 3b | `SortieMateriel.cfc:2339` | SP: `Nba_Sp_Sortie_Materiel` (populates TRANSAC + DET_TRANS) |
| 3c | `SortieMateriel.cfc:2387-2399` | UPDATE TEMPSPROD SET SMNOTRANS |
| 4 | `SortieMateriel.cfc:1797-1805` | (VCUT) UPDATE TEMPSPROD SET SMNOTRANS for all batch PROD rows |

## Flow 5: `Nba_Sp_Sortie_Materiel` internal logic (SQL SP)

| Step | Lines | Action |
|------|-------|--------|
| 1 | 233 | BEGIN TRANSACTION |
| 2 | 240-260 | Read company parameters (auto-serial, group-materials, reservations) |
| 3 | 267 | Lookup TRANSAC.TRSEQ for originating order |
| 4 | 287-434 | Build BOM cursor from cNOMENCLATURE (grouped or individual mode) |
| 5 | 439-933 | **Cursor loop per BOM line:** |
| 5a | 443 | If sub-assembly (NIEXPLOSER=1) → recursive call |
| 5b | 468-495 | Compute `DTRQTE = SMQTEPRODUIT × NOMENCLATURE_QTE` |
| 5c | 510-511 | Call `Nba_Execute_Ceiling` for rounding |
| 5d | 519-550 | If existing unposted row → UPDATE TRANSAC + SORTIEMATERIEL |
| 5e | 562-668 | Else → INSERT TRANSAC (TRNO_EQUATE=7) |
| 5f | 681-930 | Populate DET_TRANS per stock lot (auto-serial or reservation-based) |
| 6 | 937 | COMMIT |
