# 04 - Database Interactions

## Button State Computation (before render)

These reads happen inside `afficheTableauPrincipal()` to determine button visibility/color.

### Main Query: `trouveTableau`

#### Confidence: Direct
- Source: `operation.cfc:833-910`

```sql
SELECT DISTINCT v.*, VBE.*, ...
FROM vEcransProduction v
INNER JOIN AUTOFAB_DET_COMM dc ON ...
LEFT JOIN VSP_BonTravail_Entete VBE ON ...
WHERE [filter conditions]
```

**View `vEcransProduction`** provides these button-relevant columns:
| Column | Source Table | Used By |
|--------|-------------|---------|
| `TRANSAC` | TRANSAC | All 4 buttons |
| `COPMACHINE` | CNOMENCOP | Buttons 1,2,3 |
| `NOPSEQ` | CNOMENCOP | Buttons 1,2,3 |
| `MACHINE` | CNOMENCOP | Buttons 1,2 |
| `DEPARTEMENT` | TRANSAC | Buttons 1,2; Transfer gate |
| `STATUT_CODE` | AUTOFAB_TEMPSPROD.MODEPROD_MPCODE | Go button visibility |
| `TREPOSTER_TRANSFERT` | AUTOFAB_TRANSFENTREP.TREPOSTER | Transfer button color |
| `TJFINDATE` | AUTOFAB_TEMPSPROD.TJFINDATE | Transfer button gate |
| `NO_PROD` | TRANSAC | Button 4 |
| `NO_INVENTAIRE` | INVENTAIRE | VCUT Go button override |
| `PRODUIT_CODE` | cNOMENCLATURE | VCUT Go button override |
| `QTE_FORCEE` | TRANSAC | VCUT quantity check |
| `DESEQ` | DEPARTEMENT | Transfer button gate |

### TREPOSTER_TRANSFERT Subquery in View

#### Confidence: Direct
- Source: `vEcransProduction.sql:146,174`

```sql
OUTER APPLY (
  SELECT TOP 1 TE.TREPOSTER
  FROM AUTOFAB_TRANSFENTREP TE
  WHERE TE.CNOMENCOP = CNOP.NOPSEQ
  ORDER BY TE.TRESEQ DESC
) AS TRANSFERT
```

Returns `NULL` (rendered as empty string in CF) when no transfer record exists.

### VCUT Quantity Subquery

#### Confidence: Direct
- Source: `operation.cfc:951-970`

```sql
-- trouveQteBigSheets
SELECT SUM(DT.DTRQTE) AS TotalBigSheet
FROM AUTOFAB_DET_TRANS DT
INNER JOIN AUTOFAB_TRANSFENTREP TE ON DT.TRANSFENTREP = TE.TRESEQ
WHERE TE.CNOMENCOP = #NOPSEQ#
  AND TE.TRNO_EQUATE = 7
```

Used to compute `QteUtilisee` and then `qteRestante = QTE_FORCEE - QteUtilisee`. If `qteRestante <= 0`, forces `LeBoutonGo = 0` for VCUT orders.

---

## Button 1 & 2: Consult / Go — Backend Reads

When `afficheDiv` is called with `Div=DivOperation`, the CFC routes to `tableau.cfc:afficheTableauOperation()`.

### Confidence: Strong inference
The exact queries inside `afficheTableauOperation` were not fully traced in this audit. The method loads operation detail data.

### Known reads (from `afficheDiv` dispatcher):
- `session.InfoClient` — reads/writes session variables
- Passes through to `tableau.cfc` which queries operation-specific data

### Footer reads (`affichePiedDePage`):
- Reads current `STATUT_CODE` to determine which status button should be highlighted
- Reads `TEMPSPROD` state to know if production is in progress

---

## Button 3: Transfer — Backend Reads

### Confidence: Direct
- Source: `support.cfc:2535+`

The `afficheMOUVEMENT` method calls `trouveUneOperation()` and then queries:

| Table | Purpose |
|-------|---------|
| `TRANSAC` | Order/transaction header |
| `DET_TRANS` | Transaction detail lines (material movements) |
| `CONTENANT` | Container/packaging data |
| `ENTREPOT` | Warehouse/storage location data |
| `AUTOFAB_TRANSFENTREP` | Transfer records for this operation |

**No writes** occur from this button's immediate action — it only loads and displays the movement modal.

---

## Button 4: Details — Backend Reads

### Confidence: Direct
- Source: `operation.cfc:3381+`

```sql
SELECT DISTINCT v.*, VBE.*
FROM vEcransProduction v
LEFT OUTER JOIN dbo.VSP_BonTravail_Entete VBE ON ...
WHERE v.TRANSAC = #TRANSAC#
  AND v.OPERATION <> 'FINSH'
ORDER BY DATE_DEBUT_PREVU
```

| Table/View | Purpose |
|------------|---------|
| `vEcransProduction` | All operations for the given TRANSAC |
| `VSP_BonTravail_Entete` | Work ticket header (external DB) |

**No writes** occur from this button's action — it only displays a read-only modal.

---

## Write Paths

**None of the 4 buttons directly write to the database.** All are read-only operations that display information.

The Go button's downstream flow (through `changeStatut` in the footer) does write to `AUTOFAB_TEMPSPROD`, but that is out of scope for this audit (it belongs to the DivOperation / status change feature).

The `afficheDiv` JS function writes to `session.InfoClient` (ColdFusion session) via `modifieDonneesSession()` calls, but this is session state, not database state.
