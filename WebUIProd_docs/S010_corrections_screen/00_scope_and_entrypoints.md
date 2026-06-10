# 00 - Scope and Entrypoints

## In scope

- The DivCorrection screen: rendering the correction form and submitting corrections
- CFC: `CorrectionInventaire.cfc` — methods `afficheTableauCorrection`, `afficheQuitterSoumettre`, `CorrigeProduction`
- Server-side routing: `operation.cfc::afficheDiv` DivCorrection branch
- Client-side JS: `CorrigeProduction()`, `RetireCorrections()`, and `afficheDiv('DivCorrection',...)` in `sp_js.cfm`
- Sub-component rendering: `TempsProd.cfc`, `QteDefect.cfc`, `QteBonne.cfc`, `ProduitFini.cfc`, `SortieMateriel.cfc`, `InfoCommande.cfc`
- Stored procedures called: `Nba_Corrige_Quantite_Transaction`, `Nba_Sp_Update_Production`, `Nba_Recalcul_Un_Produit_EnCours`
- SQL function: `FctCalculTempsDeProduction`
- Direct SQL: UPDATE on `cNOMENCOP`, UPDATE on `TEMPSPROD` (cost recalc)

## Out of scope

- The DivTempsHomme screen itself (the caller)
- The questionnaire/stop-cause flows
- The `Nba_Corrige_Production` consolidated SP (newer path in `SCRIPT CORRIGE PRODUCTION.SQL`) — documented in open questions only
- Print/report flows
- SMS/email notification flows

## User-visible triggers

| Trigger | Location | Condition |
|---------|----------|-----------|
| Pencil edit button on TEMPSPROD row | `operation.cfc:5538-5544` | `TJQTEPROD != 0 OR TJQTEDEFECT != 0 OR MODEPROD_MPCODE IN ('PROD','SETUP')` |

The button calls:
```js
afficheDiv('DivCorrection', TRANSAC, 'Go', COPMACHINE, CNOMENCOP, '', CurrentRow, TJSEQ, Departement)
```

## Backend entrypoints

### 1. Display — `afficheTableauCorrection`
- **File:** `CorrectionInventaire.cfc:9-157`
- **Called by:** `operation.cfc:130-151` (server-side `afficheDiv` routing)
- **Returns:** HTML string (the complete correction form)
- **Parameters:** `dsClient, TRANSAC, COPMACHINE, NOPSEQ, TJSEQ, Langue, Type, Appareil, MASEQ, ENTREPOT, POSTE, DEPARTEMENT`

### 2. Footer buttons — `afficheQuitterSoumettre`
- **File:** `CorrectionInventaire.cfc:159-197`
- **Called by:** `afficheTableauCorrection` internally (line 116)
- **Returns:** HTML string with OK button

### 3. Submit — `CorrigeProduction`
- **File:** `CorrectionInventaire.cfc:199-471`
- **Called by:** JS `CorrigeProduction()` via AJAX POST
- **URL:** `CorrectionInventaire.cfc?method=CorrigeProduction&TJSEQ=...&QteBonne=...&QteDefectueux=...&EstVCUT=...`
- **Returns:** string (error messages concatenated with `<br>`, or empty on success)

## Relevant configuration

- `application.dbClient` / `application.dsClient` — datasource names from `Application.cfc`
- `application.afficheLog` — logging toggle (1 = enabled)
- `application.AutoFabServeur` / `application.AutoFabPort` — AutofabAPI SOAP endpoint URL (from `PARAMETRES` table)
- `session.InfoClient.NomEmploye` — current user's name (used in SP parameters and logging)
- `session.InfoClient.Departement` — current user's department

## Initial evidence map

| File | Role |
|------|------|
| `cfc/CorrectionInventaire.cfc` | Main controller: display + submit |
| `cfc/operation.cfc:130-151` | Routing: DivCorrection branch |
| `cfc/operation.cfc:5538-5544` | Trigger: pencil button rendering |
| `prive/multilangue/sp_js.cfm:1985-1999` | JS submit handler |
| `prive/multilangue/sp_js.cfm:791-793` | JS cancel handler |
| `prive/multilangue/sp_js.cfm:324-471` | JS afficheDiv function |
| `prive/multilangue/index.cfm:281` | DOM container `<div id="DivCorrection">` |
| `cfc/TempsProd.cfc:9-100` | Renders date/time, operation, machine, employee fields |
| `cfc/QteDefect.cfc:9-280` | Renders defect quantity rows |
| `cfc/QteBonne.cfc:10-52` | Renders good quantity field |
| `cfc/ProduitFini.cfc:218-327` | Renders finished-product quantity fields |
| `cfc/SortieMateriel.cfc:92-156` | Renders material-exit quantity fields |
| `cfc/InfoCommande.cfc` | Renders order info header |
| `cfc/support.cfc:3329-3520` | `envoiXMLGet` — SOAP dispatcher to AutofabAPI |
| `cfc/support.cfc:105` | Header button treatment for DivCorrection |
| `requetes/SCRIPT CORRIGE PRODUCTION.SQL` | Alternate SP `Nba_Corrige_Production` (not used by legacy path) |
