# CNC Operation — Reference Index

A **CNC operation** is a machining/sanding step identified by `FMCODE` containing "CNC" or "SAND". CNC operations use the standard side-by-side questionnaire layout, but have unique features: operation steps with media (PDF/video/RTF), accessories (T-nuts), mold action on completion, an inline next-step card, and panel details with a drawing viewer.

---

## Quick Reference: Question → File

| Question | File |
|----------|------|
| How is a CNC operation detected? | [01-overview](01-overview.md) |
| What does the Operation Details page show for CNC? | [02-operation-details](02-operation-details.md) |
| How does the header display quantities for CNC? | [03-header-display](03-header-display.md) |
| What does MachineInfoPanel show for CNC? | [04-machine-info](04-machine-info.md) |
| How do operation steps, accessories, and drawings work? | [05-steps-and-drawings](05-steps-and-drawings.md) |
| How is the questionnaire laid out for CNC? | [06-questionnaire-layout](06-questionnaire-layout.md) |
| How does SM (material output) work for CNC? | [07-sm-transaction](07-sm-transaction.md) |
| What happens when the user clicks Submit? | [08-submit-flow](08-submit-flow.md) |
| How do cancel and corrections work? | [09-cancel-correction](09-cancel-correction.md) |
| What database tables are involved? | [10-database-tables](10-database-tables.md) |
| What stored procedures are called? | [11-stored-procedures](11-stored-procedures.md) |
| What TypeScript types are used? | [12-type-definitions](12-type-definitions.md) |
| What i18n keys exist for CNC? | [13-translation-keys](13-translation-keys.md) |

---

## High-Level Flow

```
OPERATION DETAILS PAGE (read-only)
  ├─ Header: order info, "Qty Machined", product display, machine switcher
  ├─ Left panel (50%):
  │    ├─ PressInfoSection (materials, no mold card for CNC)
  │    ├─ Next Step inline card (CNC only — panel warning + next operation)
  │    ├─ MachineInfoPanel (group, product type, TRNOTE)
  │    ├─ PanelDetailsTable (if panel exists)
  │    └─ CncInfoSection (operation steps table + accessories table)
  └─ Right panel (50%):
       ├─ DrawingViewer (default — product drawings)
       └─ StepDetailsViewer (when step Info button clicked — RTF/PDF/video/images)

  User clicks Complete/Stop → QUESTIONNAIRE PAGE
  ├─ MoldActionSection (keep/uninstall — COMP only)
  ├─ Row 1: Employee | Good Qty OR Finished Products | Defect Quantities
  ├─ Row 2: Stop Cause (if STOP) | Material Output
  └─ Submit → POST /submitQuestionnaire.cfm
       ├─ Update TEMPSPROD quantities
       ├─ Create/post SM (Sortie de Materiel)
       ├─ Post EPF transactions (Nba_ReporteUnTransac)
       ├─ Set TJPROD_TERMINE = 1 on COMP
       ├─ Close PROD row (Nba_Sp_Update_Production)
       ├─ Forklift transfer (InsertTacheCariste)
       └─ Recalculate costs (FctCalculTempsDeProduction)
```

---

## File Index

| File | Description |
|------|-------------|
| [01-overview](01-overview.md) | CNC detection (FMCODE "CNC"/"SAND"), comparison with PRESS/VCUT |
| [02-operation-details](02-operation-details.md) | OperationDetailsPage CNC layout: left/right panels, component wiring |
| [03-header-display](03-header-display.md) | OperationHeader: "Qty Machined" label, product display, 4-box quantities |
| [04-machine-info](04-machine-info.md) | MachineInfoPanel: group, product type, TRNOTE dedicated row |
| [05-steps-and-drawings](05-steps-and-drawings.md) | CncInfoSection steps, AccessoriesTable (T-nuts), StepDetailsViewer, DrawingViewer |
| [06-questionnaire-layout](06-questionnaire-layout.md) | Standard side-by-side layout, MoldActionSection, defect types by FMCODE |
| [07-sm-transaction](07-sm-transaction.md) | SM creation: same as standard (no VCUT batch logic) |
| [08-submit-flow](08-submit-flow.md) | submitQuestionnaire CNC path: EPF posting, TJPROD_TERMINE, forklift transfer |
| [09-cancel-correction](09-cancel-correction.md) | Cancel + correction flow (Nba_Corrige_Quantite_Transaction) |
| [10-database-tables](10-database-tables.md) | CNC-relevant tables: TEMPSPROD, DET_DEFECT, RAISON, INSTRUCTION/METHODE |
| [11-stored-procedures](11-stored-procedures.md) | SPs: production, SM, EPF, corrections, forklift, accessories UDF |
| [12-type-definitions](12-type-definitions.md) | OperationStep, OperationAccessory, OperationData CNC fields |
| [13-translation-keys](13-translation-keys.md) | cnc.*, questionnaire.mold*, accessories.*, operation.nextStep |

---

## Cross-Reference: Functions → Files

| Function / Hook | Source File | Documented In |
|----------------|-------------|---------------|
| `useOperation()` | `src/features/operation/hooks/useOperation.ts` | [02](02-operation-details.md) |
| `useOperationAccessories()` | `src/features/operation/hooks/useOperationAccessories.ts` | [05](05-steps-and-drawings.md) |
| `stepHasMedia()` | `CncInfoSection.tsx:19` | [05](05-steps-and-drawings.md) |
| `handleViewStepDetails()` | `OperationDetailsPage.tsx` | [05](05-steps-and-drawings.md) |
| `handleGoodQtyOk()` | `QuestionnairePage.tsx:90` | [07](07-sm-transaction.md) |
| `handleSubmit()` | `QuestionnairePage.tsx:154` | [08](08-submit-flow.md) |
| `useQuestionnaireSubmit()` | `useQuestionnaireSubmit.ts` | [08](08-submit-flow.md) |
| `handleCancel()` | `QuestionnairePage.tsx:248` | [09](09-cancel-correction.md) |

## Cross-Reference: Database Tables → Files

| Table | Documented In |
|-------|---------------|
| `TEMPSPROD` | [10](10-database-tables.md), [08](08-submit-flow.md) |
| `ENTRERPRODFINI` | [10](10-database-tables.md), [08](08-submit-flow.md) |
| `DET_TRANS` | [10](10-database-tables.md), [07](07-sm-transaction.md), [08](08-submit-flow.md) |
| `DET_DEFECT` | [10](10-database-tables.md), [09](09-cancel-correction.md) |
| `RAISON` | [10](10-database-tables.md), [06](06-questionnaire-layout.md) |
| `INSTRUCTION / METHODE` | [10](10-database-tables.md), [05](05-steps-and-drawings.md) |
| `TRANSFENTREP` | [10](10-database-tables.md), [08](08-submit-flow.md) |

## Cross-Reference: Stored Procedures → Files

| Stored Procedure | Documented In |
|-----------------|---------------|
| `Nba_Sp_Update_Production` | [11](11-stored-procedures.md), [08](08-submit-flow.md) |
| `Nba_Sp_Insert_Sortie_Materiel` | [11](11-stored-procedures.md), [07](07-sm-transaction.md) |
| `Nba_Sp_Sortie_Materiel` | [11](11-stored-procedures.md), [07](07-sm-transaction.md) |
| `Nba_ReporteUnTransac` | [11](11-stored-procedures.md), [07](07-sm-transaction.md), [08](08-submit-flow.md) |
| `Nba_Insert_Det_Trans_Avec_Contenant` | [11](11-stored-procedures.md), [07](07-sm-transaction.md) |
| `Nba_Corrige_Quantite_Transaction` | [11](11-stored-procedures.md), [09](09-cancel-correction.md) |
| `Nba_Insert_Transfer_Entrepot_*` | [11](11-stored-procedures.md), [08](08-submit-flow.md) |
| `FctCalculTempsDeProduction` | [11](11-stored-procedures.md), [08](08-submit-flow.md) |
| `AUTOFAB_FctSelectVarCompo` | [11](11-stored-procedures.md), [05](05-steps-and-drawings.md) |
