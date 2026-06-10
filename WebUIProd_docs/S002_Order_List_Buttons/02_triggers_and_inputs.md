# 02 - Triggers & Inputs

## Button 1: Consult (Info Icon)

### Trigger
User taps the blue info-circle button (`btnCONSULTE_PETIT`). Always visible.

### onclick Call
```javascript
afficheDiv('DivOperation', TRANSAC, 'Consulter', COPMACHINE, NOPSEQ, MACHINE, COMPTEURLIGNE, TJSEQ, DEPARTEMENT)
```

### Input Contract

| # | Parameter | Source | Type | Nullable |
|---|-----------|--------|------|----------|
| 1 | Div | Hardcoded | String `'DivOperation'` | No |
| 2 | TRANSAC | `trouveTableau.TRANSAC[CurrentRow]` | int | No |
| 3 | Type | Hardcoded | String `'Consulter'` | No |
| 4 | COPMACHINE | `trouveTableau.COPMACHINE[CurrentRow]` | int | No |
| 5 | NOPSEQ | `trouveTableau.NOPSEQ[CurrentRow]` | int | No |
| 6 | MASEQ | `trouveTableau.MACHINE[CurrentRow]` | int | No |
| 7 | Prochain | `COMPTEURLIGNE` (page counter) | int | No |
| 8 | TJSEQ | `session.InfoClient.TJSEQ` | int | No |
| 9 | Departement | `trouveTableau.DEPARTEMENT[CurrentRow]` | int | No |

### Upstream Dependencies
- `trouveTableau` query must have returned at least one row
- `session.InfoClient.TJSEQ` must be set (established during login in `initialise.cfc`)

---

## Button 2: Go/OK

### Trigger
User taps the "OK" button (`btnGO_MOYEN`). Visible only when `local.Statut.LeBoutonGo EQ 1`.

### onclick Call
```javascript
afficheDiv('DivOperation', TRANSAC, 'Go', COPMACHINE, NOPSEQ, MACHINE, COMPTEURLIGNE, TJSEQ, DEPARTEMENT)
```

### Input Contract
**Identical to Consult** except parameter 3 is `'Go'` instead of `'Consulter'`.

| # | Parameter | Source | Type | Nullable |
|---|-----------|--------|------|----------|
| 1 | Div | Hardcoded | String `'DivOperation'` | No |
| 2 | TRANSAC | `trouveTableau.TRANSAC[CurrentRow]` | int | No |
| 3 | Type | Hardcoded | String `'Go'` | No |
| 4 | COPMACHINE | `trouveTableau.COPMACHINE[CurrentRow]` | int | No |
| 5 | NOPSEQ | `trouveTableau.NOPSEQ[CurrentRow]` | int | No |
| 6 | MASEQ | `trouveTableau.MACHINE[CurrentRow]` | int | No |
| 7 | Prochain | `COMPTEURLIGNE` (page counter) | int | No |
| 8 | TJSEQ | `session.InfoClient.TJSEQ` | int | No |
| 9 | Departement | `trouveTableau.DEPARTEMENT[CurrentRow]` | int | No |

### Upstream Dependencies
Same as Consult, plus: `LeBoutonGo` must equal `1` (not COMP, not VCUT-completed).

---

## Button 3: Transfer (Arrow Icon, 3 Colors)

### Trigger
User taps the bidirectional arrow button (`btnCARISTE_MOYEN` or `btnCARISTE_PETIT`). Visible only when all outer gate conditions pass (see [01_state_model.md](01_state_model.md)).

### onclick Call
```javascript
afficheMOUVEMENT(TRANSAC, COPMACHINE, NOPSEQ, LeTrePoster)
```

### Input Contract

| # | Parameter | Source | Type | Nullable |
|---|-----------|--------|------|----------|
| 1 | TRANSAC | `trouveTableau.TRANSAC[CurrentRow]` | int | No |
| 2 | COPMACHINE | `trouveTableau.COPMACHINE[CurrentRow]` | int | No |
| 3 | NOPSEQ | `trouveTableau.NOPSEQ[CurrentRow]` | int | No |
| 4 | TREPOSTER | `local.Statut.LeTrePoster` | string (`''`, `0`, or `1`) | Yes (empty string = no record) |

### Upstream Dependencies
- `session.InfoClient.CodeFonction` must be `1031` or `1032`
- `local.Statut.LePret` must equal `1` (always true currently)
- `trouveTableau.TJFINDATE[CurrentRow]` must be empty
- `trouveTableau.DESEQ` must not be `10`

---

## Button 4: Details (Magnifier Icon)

### Trigger
User taps the blue magnifier button (`btnVOIR_PETIT`). Always visible. Located next to the order number (`NO_PROD`).

### onclick Call
```javascript
AfficheDetailCommande(TRANSAC, NO_PROD)
```

### Input Contract

| # | Parameter | Source | Type | Nullable |
|---|-----------|--------|------|----------|
| 1 | TRANSAC | `trouveTableau.TRANSAC[CurrentRow]` | int | No |
| 2 | NO_PROD | `trouveTableau.NO_PROD[CurrentRow]` | string | No |

### Upstream Dependencies
- `trouveTableau` query must have returned at least one row

---

## Validation and Preprocessing

No client-side validation occurs before any button click. All parameters are server-rendered into the onclick attribute during page generation — they are not read from user input at click time.

The `afficheDiv` JS function does read 13 filter values from DOM elements before the AJAX call, but these are filter state (not button-specific inputs). See [03_execution_paths.md](03_execution_paths.md) for details.
