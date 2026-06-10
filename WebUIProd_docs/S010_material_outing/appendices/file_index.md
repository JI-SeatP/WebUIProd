# Appendix: File Index

## Primary CFC

| File | Role | Key methods |
|------|------|-------------|
| `src/old/EcransSeatPly/cfc/SortieMateriel.cfc` | Main SM component (10 methods) | See [00_scope_and_entrypoints.md](../00_scope_and_entrypoints.md) |

## Related CFCs

| File | Role |
|------|------|
| `src/old/EcransSeatPly/cfc/CorrectionInventaire.cfc:291-342` | SM correction path in CorrigeProduction |
| `src/old/EcransSeatPly/cfc/QuestionnaireSortie.cfc` | SM creation/deletion in questionnaire flow |
| `src/old/EcransSeatPly/cfc/QteDefect.cfc:605` | SORTIEMATERIEL.SMQTEPRODUIT update after defect entry |
| `src/old/EcransSeatPly/cfc/support.cfc` | `envoiXMLGet` (SOAP bridge), `trouveUneOperation`, `ConstruitDonneesLocales` |

## JavaScript

| File | Role |
|------|------|
| `src/old/EcransSeatPly/prive/multilangue/sp_js.cfm:1878-1926` | `calculeQteSM()` JS function |
| `src/old/EcransSeatPly/prive/multilangue/sp_js.cfm:1356,1458,1491,1554` | Four trigger points for SM recalculation |

## SQL

| File | Role |
|------|------|
| `src/old/EcransSeatPly/requetes/SCRIPT CORRIGE PRODUCTION.SQL:188-939` | `Nba_Sp_Sortie_Materiel` SP definition |
| `src/old/EcransSeatPly/requetes/Nba_Insert_Transac_Generique.sql` | TRNO_EQUATE=7 for SM confirmation |

## Existing React code

| File | Role |
|------|------|
| `src/types/corrections.ts:60-73` | `CorrectionMaterial` interface with `niqte` field |
| `src/features/corrections/components/CorrectionMaterialOutput.tsx` | Material output display component |
| `server/api.cjs:4370-4490` | SM query in `getCorrection.cfm` endpoint |
| `server/api.cjs:4570-4583` | SM correction in `submitCorrection.cfm` endpoint |
