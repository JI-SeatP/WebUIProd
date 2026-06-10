# 02 - Triggers and Inputs

## Trigger 1: Display SM in corrections form

- **User action:** Opens correction screen via pencil button
- **JS:** `afficheDiv('DivCorrection', ...)` → server renders `SortieMateriel.afficheListeSortieMateriel`
- **Inputs:** `TRANSAC, COPMACHINE, NOPSEQ, TJSEQ, Statut, Langue`
- **Condition:** Only rendered when `MODEPROD_MPCODE != "SETUP"` (CorrectionInventaire.cfc:101-108)

## Trigger 2: Recalculate SM quantities (client-side trigger)

- **User action:** Changes good quantity, defect quantity, or finished-product quantity
- **JS function:** `calculeQteSM()` at `sp_js.cfm:1878-1926`
- **Called from 4 places in sp_js.cfm:**
  1. `retireDetailDEFECT` success callback (line 1356) — when defect row removed
  2. `AjouteModifieDetailDEFECT` success callback (line 1458) — when defect row added/modified
  3. `calculeQteBonnePF` success callback (line 1491) — when finished-product qty recalculated
  4. `AjouteModifieEPF` success callback (line 1554) — when EPF entry added/modified
- **Guard:** All calls check `AvecSM == 1` before invoking

### `calculeQteSM` JS reads from DOM:

| DOM element | Variable |
|-------------|----------|
| `#TJQTEBONNE` | MaQteBonne |
| `#DTRQTEBONNE` | LaQteBonne (EPF total) |
| `#TJQTEBONNE_ORIGINE` | MaQteBonneOrigine |
| `#DTRQTEBONNE_ORIGINE` | LaQteBonneOrigine |
| `#POP_TJQTEDEFECT` | LaQteDefectueux |
| `#POP_TJQTEDEFECT_ORIGINE` | LaQteDefectueuxOrigine |
| `#ListeTJSEQ` | LaListeTJSEQ |
| `#ListeSMSEQ` | LaListeSMSEQ |
| `FormCorrectionInventaire` | FormData (all hidden inputs including `DTRQTE_SM_*`) |

### Server-side `calculeQteSM` input contract:

| Parameter | Type | Source |
|-----------|------|--------|
| TRANSAC | string | Passed from JS |
| COPMACHINE | string | Passed from JS |
| NOPSEQ | string | Passed from JS |
| TJSEQ | string | Passed from JS |
| Statut | string | Passed from JS |
| Langue | string | Passed from JS |
| QteBonne | string | Current good qty from DOM |
| QteDefectueux | string | Current defect total from DOM |
| QteBonneOrigine | string | Original good qty (baseline) |
| QteDefectueuxOrigine | string | Original defect total (baseline) |
| SMNOTRANS | string | SM transaction number |
| ListeTJSEQ | string | Comma-separated TJSEQ list |

## Trigger 3: SM correction on form submit

- **User action:** Clicks OK on correction form
- **Flow:** `CorrigeProduction` reads `form.DTRQTE_SM_<DTRSEQ>` hidden fields and compares with DB `DTRQTE`
- **SP called if different:** `Nba_Corrige_Quantite_Transaction(DTRSEQ, new_qty, username)`
- **Source:** `CorrectionInventaire.cfc:299-342`

## Trigger 4: Container/Warehouse change (VCUT)

- **User action:** Changes container or warehouse dropdown on an SM row
- **JS:** `CorrigeDetailSM(TRANSAC, COPMACHINE, NOPSEQ, Langue, Statut, TJSEQ, DTRSEQ, TRANSAC_TRNO, 'Contenant'|'Entrepot')`
- **Server:** `SortieMateriel.cfc::CorrigeDetailSM` — updates DET_TRANS row
