# Translation Keys — CNC

> **Files:** `src/locales/en.json:56-62`, `src/locales/fr.json:56-62`
> **Depends on:** none
> **Used by:** [04-machine-info](04-machine-info.md), [05-steps-and-drawings](05-steps-and-drawings.md), [06-questionnaire-layout](06-questionnaire-layout.md)

## Summary

CNC uses 5 keys in the `cnc` namespace, 3 mold-related questionnaire keys, 2 accessories keys, and several shared order/operation keys.

---

## CNC Namespace

| Key | English | French | Used In |
|-----|---------|--------|---------|
| `cnc.productType` | Product Type | Type produit | MachineInfoPanel |
| `cnc.transacNote` | Note | Note | (reserved) |
| `cnc.operationSteps` | Operation Steps | Etapes de production | (reserved) |
| `cnc.stepNumber` | # | # | CncInfoSection (column header) |
| `cnc.stepDescription` | Production Steps | Etapes de production | CncInfoSection (column header) |

## Mold Action Keys

| Key | English | French | Used In |
|-----|---------|--------|---------|
| `questionnaire.moldAction` | Mold Action | Action moule | MoldActionSection (header + label) |
| `questionnaire.keepMold` | Keep the mold | Conserver le moule | MoldActionSection (option) |
| `questionnaire.uninstallMold` | Uninstall mold | Desinstaller le moule | MoldActionSection (option) |

## Accessories Keys

| Key | English | French | Used In |
|-----|---------|--------|---------|
| `accessories.qty` | QTE | QTE | AccessoriesTable (column header) |
| `accessories.needed` | ACCESSOIRES NECESSAIRES | ACCESSOIRES NECESSAIRES | AccessoriesTable (column header) |

## Shared Order/Operation Keys Used by CNC

| Key | English | French | Used In |
|-----|---------|--------|---------|
| `order.qtyMachined` | Qty Machined | Qte machinee | OperationHeader (qty label) |
| `operation.nextStep` | Next Step | Prochaine etape | CncInfoSection + inline next-step card |
| `order.group` | Group | Groupe | MachineInfoPanel |
| `production.note` | Note | Note | MachineInfoPanel (TRNOTE row) |

## Press-Related Keys (Shared Infrastructure)

These exist in the `press` namespace but are used by PressInfoSection which renders for CNC too:

| Key | English | French | Used In |
|-----|---------|--------|---------|
| `press.moldCode` | Mold Code | Code moule | PressInfoSection |
| `press.moldType` | Mold Type | Type moule | PressInfoSection |
