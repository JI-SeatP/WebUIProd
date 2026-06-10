# 01 - State Model

## Initial State Sources

Button states are derived from the `local.Statut` struct, which is computed per-row inside `afficheTableauPrincipal()` in `operation.cfc`. The struct is populated from:

1. **`trouveTableau` query result** — the main SQL query against `vEcransProduction` view
2. **Hardcoded defaults** at `operation.cfc:971-989`
3. **Status-code switch** at `operation.cfc:1073-1110`
4. **VCUT override** at `operation.cfc:1114-1124`

## State Variables Controlling Buttons

### `local.Statut.LeBoutonGo` — Controls Go/OK button visibility

#### Confidence: Direct

#### Evidence
- Source: `operation.cfc:976` — initialized to `1`
- Source: `operation.cfc:1072` — re-set to `1` before status switch
- Source: `operation.cfc:1088-1093` — set to `0` when `STATUT_CODE EQ "COMP"`
- Source: `operation.cfc:1111-1113` — set to `0` when `LePret NEQ 1` (**dead code**, see below)
- Source: `operation.cfc:1114-1124` — set to `0` when VCUT and `qteRestante LTE 0`
- Source: `Tableau_principal.cfm:10` — `<cfif local.Statut.LeBoutonGo EQ 1>` gates button render

#### State Transition Table

| Previous `LeBoutonGo` | Condition | New Value |
|------------------------|-----------|-----------|
| 1 (default) | `STATUT_CODE = "COMP"` | 0 |
| 1 (default) | `LePret NEQ 1` | 0 (dead code) |
| 1 (default) | VCUT order AND `qteRestante <= 0` | 0 |
| 1 (default) | Any other status | 1 (unchanged) |

---

### `local.Statut.LePret` — Gates both Go button and Transfer button

#### Confidence: Direct (currently dead)

#### Evidence
- Source: `operation.cfc:1007` — **hardcoded to `1`**
- Source: `operation.cfc:991-1006` — the `trouvePret` query against `VDET_COMM` that would compute `LePret` dynamically is **commented out**
- Source: `operation.cfc:1105-1113` — if `LePret NEQ 1`, forces "Pret" visual and `LeBoutonGo = 0`
- Source: `Tableau_principal.cfm:19` — transfer button outer gate requires `LePret EQ 1`

#### Notes
Because `LePret` is hardcoded to `1`, the `LePret NEQ 1` branch is unreachable. The transfer button outer gate `LePret EQ 1` always passes. If the commented-out query were re-enabled, it would dynamically determine readiness from `VDET_COMM` booking filter state, potentially hiding both the Go and Transfer buttons for orders not yet ready.

---

### `local.Statut.LeTrePoster` — Controls Transfer button color

#### Confidence: Direct

#### Evidence
- Source: `operation.cfc:989` — set from `trouveTableau.TREPOSTER_TRANSFERT[CurrentRow]`
- Source: `vEcransProduction` view — `TREPOSTER_TRANSFERT` comes from `OUTER APPLY (SELECT TOP 1 TE.TREPOSTER FROM AUTOFAB_TRANSFENTREP TE WHERE TE.CNOMENCOP = CNOP.NOPSEQ ORDER BY TE.TRESEQ DESC)`
- Source: `Tableau_principal.cfm:20-41` — three-way branch on `LeTrePoster`

#### Values

| `LeTrePoster` | Meaning | Button Color | CSS Class |
|---------------|---------|--------------|-----------|
| `''` (empty) | No transfer record exists | Blue (#2B78E4) | `btn-outline-transfert_bleu` |
| `0` | Transfer exists, not posted | Red (#CC0000) | `btn-outline-transfert_rouge` |
| `1` | Transfer already posted | Gray (#696969) | `btn-outline-transfert_gris` |

---

### `STATUT_CODE` — Controls row background color and Go button visibility

#### Confidence: Direct

#### Evidence
- Source: `operation.cfc:1073-1110`
- Source: `vEcransProduction` view — `STATUT_CODE` is `AUTOFAB_TEMPSPROD.MODEPROD_MPCODE` from the most recent TEMPSPROD record

| `STATUT_CODE` | `LaCouleurBG` | `LeBoutonGo` |
|---------------|---------------|---------------|
| `"SETUP"` | `#d3c8f0` (purple) | 1 |
| `"PAUSE"` | `#ffe599` (yellow) | 1 |
| `"STOP"` | `#ea9999` (red) | 1 |
| `"COMP"` | `#cfe2ff` (blue) | **0** |
| `"PROD"` | `#93c47d` (green) | 1 |
| NULL/other | `#ffffff` (white) | 1 |

---

### `session.InfoClient.CodeFonction` — Gates Transfer button

#### Confidence: Direct

#### Evidence
- Source: `Tableau_principal.cfm:19` — `ListFind('1031,1032', session.InfoClient.CodeFonction)`
- Source: `initialise.cfc` — `CodeFonction` is set from `EMPLOYE.EMFONCTION` during login

Only codes `1031` (chef de cellule) and `1032` may see the transfer button.

---

### `trouveTableau.TJFINDATE` — Gates Transfer button

#### Confidence: Direct

#### Evidence
- Source: `Tableau_principal.cfm:19` — `trouveTableau.TJFINDATE[CurrentRow] EQ ''`

When `TJFINDATE` is empty (production session still open / no end date on last TEMPSPROD record), the transfer button may appear. When `TJFINDATE` has a value (production session closed), the transfer button is hidden even for privileged users.

---

### `trouveTableau.DESEQ` — Gates Transfer button

#### Confidence: Direct

#### Evidence
- Source: `Tableau_principal.cfm:19` — `trouveTableau.DESEQ NEQ 10`

Department 10 is excluded from transfer button visibility. The reason is not documented in code comments.

## Unresolved State Questions

1. What is department 10 and why is it excluded from transfers?
2. Would re-enabling the `trouvePret` query change button behavior for any current orders?
3. Is `DESEQ` on line 19 missing `[CurrentRow]` intentionally or is it a latent bug? (CF resolves it from the current row in a `<cfloop>` context, so it works correctly either way.)
