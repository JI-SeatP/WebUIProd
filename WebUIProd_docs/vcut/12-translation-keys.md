# Translation Keys

> **Files:** `src/locales/en.json:98-110`, `src/locales/fr.json:98-110`
> **Depends on:** none
> **Used by:** [02-operation-details](02-operation-details.md), [04-pf-transaction](04-pf-transaction.md), [05-produced-items](05-produced-items.md)

## Summary

11 keys under the `vcut` namespace, plus related questionnaire keys used by VCUT components.

---

## VCUT Namespace

| Key | English | French | Used In |
|-----|---------|--------|---------|
| `vcut.qtyUsed` | Qty Used | Qte utilisee | OperationHeader (qty label) |
| `vcut.bigSheet` | Big Sheet | Grande feuille | (Reserved) |
| `vcut.components` | Components | Composantes | VcutInfoSection (card title) |
| `vcut.containers` | Containers | Contenants | VcutInfoSection (card title) |
| `vcut.skidNumber` | SKID # | # SKID | VcutInfoSection (column) |
| `vcut.noContainers` | NO CONTAINERS | AUCUN CONTENANT | VcutInfoSection (alert) |
| `vcut.order` | Order | Commande | VcutInfoSection (column) |
| `vcut.good` | Good | Bonnes | VcutInfoSection (column) |
| `vcut.defect` | Defect | Defaut | VcutInfoSection (column) |
| `vcut.productNo` | Product No. | No. produit | VcutInfoSection (column) |
| `vcut.warehouse` | Warehouse | Entrepot | VcutInfoSection (column) |

## Related Questionnaire Keys Used by VCUT

| Key | English | Used In |
|-----|---------|---------|
| `questionnaire.qtyGood` | Qty Good | VcutQuantitySection (column) |
| `questionnaire.qtyDefective` | Qty Defective | VcutQuantitySection (column) |
| `questionnaire.container` | Container | VcutQuantitySection + ProducedItemsTable |
| `questionnaire.productCode` | Product Code | VcutQuantitySection + ProducedItemsTable |
| `questionnaire.action` | Action | VcutQuantitySection (column) |
| `questionnaire.producedQty` | Produced Qty | ProducedItemsTable (column) |
| `questionnaire.finishedProduct` | Finished Product | ProducedItemsTable (column) |
| `questionnaire.materialOutput` | Material Output | MaterialOutputSection (header) |
| `order.quantity` | Quantity | VcutQuantitySection (section title) |
