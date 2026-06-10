# 02 - Triggers and Inputs

## Trigger: Open correction form

### User action
Tap the pencil/edit button on a TEMPSPROD row in the DivTempsHomme time-tracking table.

### Source
- **Button:** `operation.cfc:5538-5544`
- **Condition:** `TJQTEPROD != 0 OR TJQTEDEFECT != 0 OR MODEPROD_MPCODE IN ('PROD', 'SETUP')`
- **JS call:** `afficheDiv('DivCorrection', TRANSAC, 'Go', COPMACHINE, CNOMENCOP, '', CurrentRow, TJSEQ, Departement)`
- **Confidence:** Direct

### Parameters passed to `afficheTableauCorrection`

| Parameter | Type | Source | Description |
|-----------|------|--------|-------------|
| `dsClient` | string | `THIS.dsClient` | Datasource name (injected server-side) |
| `TRANSAC` | string | TEMPSPROD row | Transaction sequence (TRSEQ) |
| `COPMACHINE` | string | TEMPSPROD row | Operation-machine code |
| `NOPSEQ` | string | TEMPSPROD row | Actually CNOMENCOP (nomenclature-operation seq) |
| `TJSEQ` | string | TEMPSPROD row | TEMPSPROD primary key |
| `Langue` | string | session | "fr" or "En" |
| `Type` | string | "Go" (hardcoded) | Screen type |
| `Appareil` | string | session | Device identifier |
| `MASEQ` | string | "" (empty) | Machine seq (unused in correction path) |
| `ENTREPOT` | string | "0" (default) | Warehouse (unused) |
| `POSTE` | string | "0" (default) | Workstation (unused) |
| `DEPARTEMENT` | string | session | Department |

## Trigger: Submit corrections

### User action
Tap the "OK" button at the bottom of the correction form.

### Source
- **Button:** `CorrectionInventaire.cfc:189` — rendered by `afficheQuitterSoumettre`
- **JS call:** `CorrigeProduction(Statut, TJSEQ, '0', TRANSAC, COPMACHINE, NOPSEQ, LeVCUT, TJSEQ)`
- **JS function:** `sp_js.cfm:1985-1999`
- **Confidence:** Direct

### Client-side data collection (sp_js.cfm:1986-1990)

```js
var fd = new FormData(document.getElementById('FormCorrectionInventaire'));
MaQteBonneSansPF = document.getElementById('TJQTEBONNE')?.value || 0;
LaQteDefectueux = document.getElementById('POP_TJQTEDEFECT')?.value || 0;
LaNote = document.getElementById('Note')?.value || '';
```

### AJAX request
```
POST CorrectionInventaire.cfc?method=CorrigeProduction
     &TJSEQ=<TJSEQ>
     &QteBonne=<MaQteBonneSansPF>
     &QteDefectueux=<LaQteDefectueux>
     &EstVCUT=<0|1>
Content-Type: multipart/form-data (FormData from FormCorrectionInventaire)
```

### `CorrigeProduction` CFC input contract

| Parameter | Type | Default | Source | Description |
|-----------|------|---------|--------|-------------|
| `TJSEQ` | string | required | URL param | TEMPSPROD PK being corrected |
| `QteBonne` | string | "0" | URL param | Good quantity (from `#TJQTEBONNE` or 0) |
| `QteDefectueux` | string | required | URL param | Total defect qty (from `#POP_TJQTEDEFECT`) |
| `EstVCUT` | string | "0" | URL param | 1 if VCUT product |

### Form fields submitted via FormData (multipart/form-data)

These fields are read in `CorrigeProduction` via `form.XXXX` or `evaluate('form.XXX_#ID#')`:

#### Time/Production fields (from TempsProd.cfc)

| Field name | Type | Default value |
|------------|------|---------------|
| `DateDebut_<TJSEQ>` | datetime-local | Current `TJDEBUTDATE` as `yyyy-MM-ddTHH:mm` |
| `DateFin_<TJSEQ>` | datetime-local | Current `TJFINDATE` as `yyyy-MM-ddTHH:mm` |
| `Operation_<TJSEQ>` | select (int) | Current `OPERATION` seq |
| `Machine_<TJSEQ>` | select (int) | Current `MACHINE` seq |
| `CodeEmploye_<TJSEQ>` | number | Current `EMPLOYE_EMNO` |

#### Good quantity (from QteBonne.cfc — only when no EPF)

| Field name | Type | Default value |
|------------|------|---------------|
| `TJQTEBONNE` | number | `TEMPSPROD.TJQTEPROD` |
| `TJQTEBONNE_ORIGINE` | hidden | Same (baseline for change detection) |

#### Finished-product quantities (from ProduitFini.cfc — only when EPF exists)

| Field name | Type | Default value |
|------------|------|---------------|
| `DTRQTE_PF_<DTRSEQ>` | text | `QTECORRIGEE` (original + prior corrections) |
| `DTRQTEBONNE` | hidden | Sum of all `QTECORRIGEE` |
| `DTRQTEBONNE_ORIGINE` | hidden | Same (baseline) |

#### Defect quantities (from QteDefect.cfc)

| Field name | Type | Default value |
|------------|------|---------------|
| `POP_DEF_DDQTEUNINV_<N>` | number | Per-defect qty |
| `POP_RAISON_<N>` | select (int) | Defect reason code |
| `POP_DEF_DDNOTE_<N>` | hidden | "" |
| `POP_TJQTEDEFECT` | hidden | Total defect qty |
| `POP_TJQTEDEFECT_ORIGINE` | hidden | Original total (baseline) |

#### Material-exit quantities (from SortieMateriel.cfc)

| Field name | Type | Default value |
|------------|------|---------------|
| `DTRQTE_SM_<DTRSEQ>` | hidden | Corrected SM qty (computed server-side, not user-editable) |

## Trigger: Cancel corrections

### User action
Currently the close/X button is commented out in the HTML (`CorrectionInventaire.cfc:184-186`). Cancel happens only by navigating away.

### JS function
```js
function RetireCorrections(TJSEQ, TRANSAC, COPMACHINE, NOPSEQ, Statut) {
    afficheDiv('DivTempsHomme', TRANSAC, Def_Type, COPMACHINE, NOPSEQ, PourMachine, 1, TJSEQ, PourDepartement);
}
```
- **Source:** `sp_js.cfm:791-793`
- **Effect:** Navigates back to DivTempsHomme. No server-side call — changes are discarded.
- **Confidence:** Direct

## Upstream dependencies

- **Session required:** `session.InfoClient.NomEmploye`, `session.InfoClient.Departement`
- **Application vars required:** `application.dsClient`, `application.AutoFabServeur`, `application.AutoFabPort`
- **TEMPSPROD row must exist** for the given `TJSEQ`
- **TRANSAC row must exist** for the associated transaction
