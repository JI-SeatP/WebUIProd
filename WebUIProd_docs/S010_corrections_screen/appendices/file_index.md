# Appendix: File Index

All files inspected during this audit, grouped by role.

## Primary CFC (correction logic)

| File | Role | Key methods |
|------|------|-------------|
| `src/old/EcransSeatPly/cfc/CorrectionInventaire.cfc` | Main controller | `afficheTableauCorrection` (display), `afficheQuitterSoumettre` (footer), `CorrigeProduction` (submit) |

## Routing and entry

| File | Role | Key lines |
|------|------|-----------|
| `src/old/EcransSeatPly/cfc/operation.cfc:130-151` | Server-side routing for DivCorrection | `afficheDiv` method, `DivCorrection` branch |
| `src/old/EcransSeatPly/cfc/operation.cfc:5538-5544` | Trigger button rendering | Pencil button with `onClick` → `afficheDiv('DivCorrection',...)` |
| `src/old/EcransSeatPly/prive/multilangue/index.cfm:281` | DOM container | `<div id="DivCorrection">` |

## Client-side JavaScript

| File | Role | Key functions |
|------|------|---------------|
| `src/old/EcransSeatPly/prive/multilangue/sp_js.cfm:1985-1999` | Submit handler | `CorrigeProduction()` |
| `src/old/EcransSeatPly/prive/multilangue/sp_js.cfm:791-793` | Cancel handler | `RetireCorrections()` |
| `src/old/EcransSeatPly/prive/multilangue/sp_js.cfm:324-471` | Div navigation | `afficheDiv()` |

## Sub-component CFCs (form rendering)

| File | Role | Key method |
|------|------|------------|
| `src/old/EcransSeatPly/cfc/TempsProd.cfc:9-100` | Time/date fields, operation/machine selects, employee | `afficheTempsProd` |
| `src/old/EcransSeatPly/cfc/QteDefect.cfc:9-280` | Defect quantity rows with reasons | `afficheQteDefectueuses`, `afficheTableauDEFECT` |
| `src/old/EcransSeatPly/cfc/QteBonne.cfc:10-52` | Simple good quantity field | `afficheTableauQteBonnes` |
| `src/old/EcransSeatPly/cfc/ProduitFini.cfc:218-327` | Per-row finished-product editing | `afficheListeProduitFini` |
| `src/old/EcransSeatPly/cfc/SortieMateriel.cfc:92-156` | Material-exit quantities (hidden) | `afficheListeSortieMateriel` |
| `src/old/EcransSeatPly/cfc/InfoCommande.cfc` | Order info header | `afficheInfoCommande` |

## Support / infrastructure

| File | Role | Key method/lines |
|------|------|-----------------|
| `src/old/EcransSeatPly/cfc/support.cfc:3329-3520` | SOAP dispatcher | `envoiXMLGet` |
| `src/old/EcransSeatPly/cfc/support.cfc:105` | Header button treatment | DivCorrection branch |
| `src/old/EcransSeatPly/cfc/operation.cfc` | Operation lookup | `trouveUneOperationParTransac` |
| `src/old/EcransSeatPly/cfc/support.cfc` | Operation lookup | `trouveUneOperation` |
| `src/old/EcransSeatPly/inclus/dictionnaire.cfm` | I18n label loader | Reads `dictionnaire.xls` at runtime |
| `src/old/EcransSeatPly/cfc/RequeteAlternative.cfm` | SETUP operation resolver | Included when MODEPROD_MPCODE = "SETUP" |
| `src/old/EcransSeatPly/Application.cfc` | App config | `application.dsClient`, `application.AutoFabServeur` |
| `src/old/EcransSeatPly/InitialiseConstantes.cfm` | SOAP URL config | AutofabAPI URL from PARAMETRES table |

## SQL scripts

| File | Role |
|------|------|
| `src/old/EcransSeatPly/requetes/SCRIPT CORRIGE PRODUCTION.SQL` | SP definitions: `Nba_Corrige_Production`, `Nba_Delete_Transaction`, `Nba_Sp_Sortie_Materiel`, `Nba_Valide_Dereport`, `Nba_DereporteTransaction` |

## Existing React migration code

| File | Role |
|------|------|
| `src/types/corrections.ts` | TypeScript types for correction data |
| `src/features/corrections/CorrectionsPage.tsx` | Main page component |
| `src/features/corrections/hooks/useCorrection.ts` | Data fetching hook |
| `src/features/corrections/components/CorrectionProductionTime.tsx` | Time info component |
| `src/features/corrections/components/CorrectionOrderInfo.tsx` | Order info component |
| `src/features/corrections/components/CorrectionDefects.tsx` | Defects component |
| `src/features/corrections/components/CorrectionGoodQty.tsx` | Good quantity component |
| `src/features/corrections/components/CorrectionFinishedProducts.tsx` | Finished products component |
| `src/features/corrections/components/CorrectionMaterialOutput.tsx` | Material output component |
| `src/features/corrections/components/CorrectionTimeInfo.tsx` | Time info display |
| `src/api/corrections.ts` | API fetch wrappers |
| `src/mocks/handlers/corrections.ts` | MSW mock handlers |
