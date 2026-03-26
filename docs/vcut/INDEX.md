# VCUT Operation — Reference Index

A **VCUT operation** is a table-saw / veneer cutting step where a parent "big sheet" is cut into multiple child components. Each component gets its own EPF (finished product) transaction and TEMPSPROD row. SM (material output) is calculated as a batch across all components.

---

## Quick Reference: Question → File

| Question | File |
|----------|------|
| How is a VCUT operation detected? | [01-overview.md](01-overview.md) |
| What does the Operation Details page show for VCUT? | [02-operation-details.md](02-operation-details.md) |
| How is the questionnaire laid out for VCUT? | [03-questionnaire-layout.md](03-questionnaire-layout.md) |
| How does PF/EPF creation work when user clicks "+"? | [04-pf-transaction.md](04-pf-transaction.md) |
| What does the produced items table show? | [05-produced-items.md](05-produced-items.md) |
| How does SM (material output) work? | [06-sm-transaction.md](06-sm-transaction.md) |
| What happens when the user clicks Submit? | [07-submit-flow.md](07-submit-flow.md) |
| What happens when the user cancels? | [08-cancel-flow.md](08-cancel-flow.md) |
| What database tables are involved? | [09-database-tables.md](09-database-tables.md) |
| What stored procedures are called? | [10-stored-procedures.md](10-stored-procedures.md) |
| What TypeScript types are used? | [11-type-definitions.md](11-type-definitions.md) |
| What i18n keys exist for VCUT? | [12-translation-keys.md](12-translation-keys.md) |

---

## High-Level Flow

```
OPERATION DETAILS PAGE (read-only)
  └→ User clicks Complete/Stop
      └→ QUESTIONNAIRE PAGE
           ├─ Employee entry
           ├─ VcutQuantitySection: per-component qty input
           │    └─ "+" button → POST /addVcutQty.cfm → creates EPF (PF) transaction
           │         └─ onItemAdded → refresh ProducedItemsTable + recalc SM
           ├─ ProducedItemsTable: read-only display of submitted items
           ├─ MaterialOutputSection: SM transaction materials
           └─ Submit → POST /submitQuestionnaire.cfm
                ├─ Update TEMPSPROD quantities
                ├─ Create/post SM (Sortie de Materiel)
                ├─ Post all EPF transactions (Nba_ReporteUnTransac)
                ├─ Close PROD row (Nba_Sp_Update_Production)
                └─ Recalculate costs (FctCalculTempsDeProduction)
```

---

## File Index

| File | Description |
|------|-------------|
| [01-overview.md](01-overview.md) | VCUT detection logic (3 conditions), what makes VCUT different |
| [02-operation-details.md](02-operation-details.md) | Operation page: useVcutData hook, getVcutData.cfm queries, VcutInfoSection |
| [03-questionnaire-layout.md](03-questionnaire-layout.md) | Questionnaire state variables, stacked layout, defects hidden |
| [04-pf-transaction.md](04-pf-transaction.md) | VcutQuantitySection + addVcutQty.cfm: EPF creation (6 steps) |
| [05-produced-items.md](05-produced-items.md) | ProducedItemsTable display + onItemAdded callback chain |
| [06-sm-transaction.md](06-sm-transaction.md) | SM creation: ajouteSM.cfm, 4 recalc triggers, Nba_Sp_Insert_Sortie_Materiel |
| [07-submit-flow.md](07-submit-flow.md) | handleSubmit + submitQuestionnaire.cfm (11 backend steps) |
| [08-cancel-flow.md](08-cancel-flow.md) | handleCancel + cancelQuestionnaire.cfm cleanup |
| [09-database-tables.md](09-database-tables.md) | 7 table schemas + SM↔PF relationship diagram |
| [10-stored-procedures.md](10-stored-procedures.md) | 8 stored procedures + AutoFab SOAP calls with parameters |
| [11-type-definitions.md](11-type-definitions.md) | 6 TypeScript interfaces (VcutData, ProducedItem, MaterialRow, etc.) |
| [12-translation-keys.md](12-translation-keys.md) | 11 VCUT namespace keys + related questionnaire keys (en/fr) |

---

## Cross-Reference: Functions → Files

| Function / Hook | Source File | Documented In |
|----------------|-------------|---------------|
| `useVcutData()` | `src/features/operation/hooks/useVcutData.ts` | [02](02-operation-details.md) |
| `fetchComponents()` | `VcutQuantitySection.tsx:79` | [04](04-pf-transaction.md) |
| `handleRowAdd()` | `VcutQuantitySection.tsx:113` | [04](04-pf-transaction.md) |
| `onItemAdded()` | `QuestionnairePage.tsx:356` | [05](05-produced-items.md) |
| `handleGoodQtyOk()` | `QuestionnairePage.tsx:90` | [06](06-sm-transaction.md) |
| `handleSubmit()` | `QuestionnairePage.tsx:154` | [07](07-submit-flow.md) |
| `useQuestionnaireSubmit()` | `useQuestionnaireSubmit.ts` | [07](07-submit-flow.md) |
| `handleCancel()` | `QuestionnairePage.tsx:248` | [08](08-cancel-flow.md) |

## Cross-Reference: Database Tables → Files

| Table | Documented In |
|-------|---------------|
| `TEMPSPROD` | [09](09-database-tables.md), [04](04-pf-transaction.md), [07](07-submit-flow.md) |
| `ENTRERPRODFINI` | [09](09-database-tables.md), [04](04-pf-transaction.md), [07](07-submit-flow.md) |
| `DET_TRANS` | [09](09-database-tables.md), [04](04-pf-transaction.md), [06](06-sm-transaction.md) |
| `TRANSAC` | [09](09-database-tables.md), [06](06-sm-transaction.md), [07](07-submit-flow.md) |
| `cNOMENCLATURE` | [09](09-database-tables.md), [02](02-operation-details.md) |
| `cNOMENCOP` | [09](09-database-tables.md), [07](07-submit-flow.md) |
| `CONTENANT` | [09](09-database-tables.md), [04](04-pf-transaction.md) |

## Cross-Reference: Stored Procedures → Files

| Stored Procedure | Documented In |
|-----------------|---------------|
| `Nba_Sp_Insert_Production` | [10](10-stored-procedures.md), [04](04-pf-transaction.md) |
| `Nba_Sp_Update_Production` | [10](10-stored-procedures.md), [07](07-submit-flow.md) |
| `Nba_Sp_Insert_Sortie_Materiel` | [10](10-stored-procedures.md), [06](06-sm-transaction.md) |
| `Nba_Sp_Sortie_Materiel` | [10](10-stored-procedures.md), [06](06-sm-transaction.md) |
| `Nba_ReporteUnTransac` | [10](10-stored-procedures.md), [06](06-sm-transaction.md), [07](07-submit-flow.md) |
| `Nba_Insert_Contenant` | [10](10-stored-procedures.md), [04](04-pf-transaction.md) |
| `Nba_Insert_Det_Trans_Avec_Contenant` | [10](10-stored-procedures.md), [06](06-sm-transaction.md) |
| `FctCalculTempsDeProduction` | [10](10-stored-procedures.md), [07](07-submit-flow.md) |
| AutoFab SOAP `EPF/INS` | [10](10-stored-procedures.md), [04](04-pf-transaction.md) |
| AutoFab SOAP `EPFDETAIL/INS` | [10](10-stored-procedures.md), [04](04-pf-transaction.md) |
