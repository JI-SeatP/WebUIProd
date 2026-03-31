# 02 — Triggers and Inputs

## Trigger list

### T1 — Open questionnaire (STOP or COMP)

| Field | Value |
|-------|-------|
| **User action** | Tap STOP or COMP button on operation details screen |
| **CFC method** | `QuestionnaireSortie.afficheTableauQuestionnaire()` |
| **Source** | `QuestionnaireSortie.cfc:9` |
| **Preconditions** | Operation is in PROD status; worker is on the operation details screen |

### T2 — Add EPF per component ("+" button)

| Field | Value |
|-------|-------|
| **User action** | Tap "+" button on a VCUT component row in the questionnaire |
| **CFC method** | `ProduitFini.AjouteEPF()` |
| **Source** | `ProduitFini.cfc:1311` |
| **Preconditions** | Questionnaire is open; component has quantity entered |

### T3 — SM creation/update (automatic after EPF add)

| Field | Value |
|-------|-------|
| **User action** | Automatic — triggered by EPF add callback |
| **CFC method** | `SortieMateriel.ajouteSM()` |
| **Source** | `SortieMateriel.cfc:1648` |
| **Preconditions** | At least one EPF has been created; `ListeTJSEQ` is non-empty |

### T4 — Validate form state (polling)

| Field | Value |
|-------|-------|
| **User action** | Automatic — called periodically and after each action |
| **CFC method** | `QuestionnaireSortie.verifieStatutSortie()` |
| **Source** | `QuestionnaireSortie.cfc:2290` |
| **Preconditions** | Questionnaire is open |

### T5 — Submit questionnaire

| Field | Value |
|-------|-------|
| **User action** | Tap OK button |
| **CFC method** | `QuestionnaireSortie.ModifieTEMPSPROD()` then `ajouteModifieStatut()` |
| **Source** | `QuestionnaireSortie.cfc:599`, `QuestionnaireSortie.cfc:1295` |
| **Preconditions** | OK button is enabled (SM exists, quantities match) |

### T6 — Cancel questionnaire

| Field | Value |
|-------|-------|
| **User action** | Tap Cancel/Quit button |
| **CFC method** | `QuestionnaireSortie.retireQuestionnaireSortie()` |
| **Source** | `QuestionnaireSortie.cfc:314` |
| **Preconditions** | Questionnaire is open |

## Input contracts

### `afficheTableauQuestionnaire` parameters

| Parameter | Type | Required | Source |
|-----------|------|----------|--------|
| `TRANSAC` | Integer | Yes | Work order transaction sequence |
| `COPMACHINE` | Integer | Yes | cNOMENCOP_Machine sequence |
| `NOPSEQ` | Integer | Yes | cNOMENCOP sequence |
| `TJSEQ` | Integer | Yes | Current TEMPSPROD sequence |
| `Statut` | String | Yes | "STOP" or "COMP" |
| `Langue` | String | Yes | "P" (French) or "S" (English) |

### `AjouteEPF` parameters (ProduitFini.cfc)

| Parameter | Type | Required | Source |
|-----------|------|----------|--------|
| `dsClient` | String | Yes | Datasource name |
| `TRANSAC` | Integer | Yes | Work order transaction sequence |
| `COPMACHINE` | Integer | Yes | cNOMENCOP_Machine sequence |
| `NOPSEQ` | Integer | Yes | cNOMENCOP sequence |
| `TJSEQ` | Integer | Yes | Current TEMPSPROD sequence |
| `Statut` | String | Yes | Current status code |
| `Langue` | String | Yes | Language code |
| `QteBonne` | Numeric | Yes | Good quantity for this component |
| `QteDefectueux` | Numeric | Yes | Defect quantity for this component |
| `DtrSeq` | Integer | Yes | DET_TRANS sequence (-1 = new) |
| `EpfSeq` | Integer | Yes | ENTRERPRODFINI sequence (0 = new) |
| `Contenant` | String | No | Container number |
| `Entrepot` | String | No | Warehouse code |

### `ajouteSM` parameters — VCUT branch (SortieMateriel.cfc)

| Parameter | Type | Required | Source |
|-----------|------|----------|--------|
| `dsClient` | String | Yes | Datasource name |
| `TRANSAC` | Integer | Yes | Work order transaction sequence |
| `COPMACHINE` | Integer | Yes | Machine sequence |
| `NOPSEQ` | Integer | Yes | Operation sequence |
| `TJSEQ` | Integer | Yes | Current TEMPSPROD sequence |
| `Statut` | String | Yes | Current status |
| `Langue` | String | Yes | Language |
| `QteBonne` | Numeric | Yes | Total good qty. **VCUT note:** The frontend passes the component's qty (sp_js.cfm:1606 sets `LaQteBonne = parseFloat(LaQte)`), but the VCUT block in `ajouteSM` does NOT use this value. Instead it computes `TotalQteVCUT` from `MAX(TJQTEPROD)` across `ListeTJSEQ` (SortieMateriel.cfc:1706-1718). See Flow C step 4. |
| `QteDefectueux` | Numeric | Yes | Total defect qty |
| `ListeEPFSEQ` | String (CSV) | Yes | Comma-separated PFSEQ list |
| `ListeTJSEQ` | String (CSV) | Yes | Comma-separated TJSEQ list (session-scoped — see D1) |
| `SMNOTRANS` | String | No | Existing SM transaction number |
| `ListeSMSEQ` | String (CSV) | No | Comma-separated SMSEQ list |

### `ModifieTEMPSPROD` parameters (submit)

| Parameter | Type | Required | Source |
|-----------|------|----------|--------|
| `TRANSAC` | Integer | Yes | Work order transaction sequence |
| `COPMACHINE` | Integer | Yes | Machine sequence |
| `NOPSEQ` | Integer | Yes | Operation sequence |
| `TJSEQ` | Integer | Yes | Current TEMPSPROD sequence |
| `Statut` | String | Yes | "STOP" or "COMP" |
| `Langue` | String | Yes | Language |
| `QteBonne` | Numeric | Yes | Total good qty |
| `QteDefectueux` | Numeric | Yes | Total defect qty |
| `Note` | String | No | Free-text note |
| `ListeEPFSEQ` | String (CSV) | Yes | PFSEQ list |
| `ListeTJSEQ` | String (CSV) | Yes | TJSEQ list |
| `SMNOTRANS` | String | No | SM transaction number |
| `ListeSMSEQ` | String (CSV) | No | SMSEQ list |

### `retireQuestionnaireSortie` parameters (cancel)

| Parameter | Type | Required | Source |
|-----------|------|----------|--------|
| `TRANSAC` | Integer | Yes | Work order transaction sequence |
| `COPMACHINE` | Integer | Yes | Machine sequence |
| `NOPSEQ` | Integer | Yes | Operation sequence |
| `TJSEQ` | Integer | Yes | Current TEMPSPROD sequence |
| `Statut` | String | Yes | Current status |
| `Langue` | String | Yes | Language |
| `ListeEPFSEQ` | String (CSV) | No | PFSEQ list to clean up |
| `ListeTJSEQ` | String (CSV) | No | TJSEQ list to clean up |
| `SMNOTRANS` | String | No | SM transaction number to clean up |
| `ListeSMSEQ` | String (CSV) | No | SMSEQ list to clean up |

## Upstream dependencies

| Dependency | Source | Required for |
|-----------|--------|-------------|
| `trouveOperation` recordset | `support.cfc::trouveUneOperation` via `vEcransProduction` | VCUT detection, QTE_FORCEE, all conditional branches |
| `trouveOPERATIONPARTRANSAC` recordset | `VOperationParTransac` view | ENTREPF flag, UtiliseInventaire flag, NISEQ |
| `trouveUnTableauVCut` query result | `operation.cfc:4487` | Component list, BOM ratios, container data |
| Active PROD TEMPSPROD row | Must exist before questionnaire opens | TJSEQ anchor for the session |

## Validation and preprocessing

### `verifieStatutSortie` — OK button enablement (`QuestionnaireSortie.cfc:2290-2519`)

VCUT enters the SM validation path at line 2372 (forced by `NO_INVENTAIRE EQ "VCUT"` OR `PRODUIT_CODE EQ "VCUT"`):

| Condition | OK button state |
|-----------|----------------|
| `SMNOTRANS` is non-empty (DB-read value) | Active |
| `QteBonne > 0` AND `SMNOTRANS` is empty | **Disabled** — worker must create SM first |
| `SMNOTRANS` non-empty AND `SMQTEPRODUIT != (QteBonne + QteDefectueux)` | **Disabled** — quantity mismatch |
| Total = 0 and SM exists | Zero-quantity modal — SM is deleted, TEMPSPROD reset |

The non-VCUT simple-qty-check path (line 2475) is excluded for VCUT via `trouveOperation.NO_INVENTAIRE NEQ "VCUT"`.

**Note:** The `SMNOTRANS` check at line 2375 uses the DB-read value from `trouveTotal.SMNOTRANS` (queried from TEMPSPROD), NOT the `arguments.SMNOTRANS` parameter passed to the function. The argument is accepted but unused in the validation logic.
