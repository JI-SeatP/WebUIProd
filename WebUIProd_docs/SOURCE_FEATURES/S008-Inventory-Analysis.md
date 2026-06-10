# S008 - Inventory Screen (DivInventaire) Analysis

## Source Files
- `src/old/EcransSeatPly/cfc/operation.cfc` - `afficheTableauInventaire()` (lines 2858-2971)
- `src/old/EcransSeatPly/cfc/operation.cfc` - `afficheDetTRANSAC()` (lines 2973+)

---

## 1. Screen Purpose

The Inventory screen allows workers to:
- Search for inventory transactions by order number or product
- View estimated vs actual quantities
- Update actual inventory counts (inventory taking/cycle count)

Accessed via: **Clipboard/Barcode button** (green) in header menu

---

## 2. Screen Layout

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  FILTRES (Filters)                                                           │
├──────────────────┬──────────────────┬────────────────────────────────────────┤
│  col-3           │  col-3           │  col-4                                 │
│  No Transaction  │  No Produit      │  Contient (Contains)                   │
│  [text input]    │  [text input]    │  [text input]                          │
├──────────────────┴──────────────────┴────────────────────────────────────────┤
│                                                                              │
│  ⚠️ MESSAGE PRISE INVENTAIRE (Inventory Count Message - Warning Alert)       │
│                                                                              │
├──────────────────────────────────────────────────────────────────────────────┤
│  DETAIL QUANTITES (Quantity Details)                                         │
├────────┬──────────┬─────────────┬──────────┬──────────┬────────┬──────┬─────┤
│ Action │ No       │ Description │ Entrepot │ Qte      │ Qte    │ Unite│ Date│
│        │ Produit  │             │          │ Estimee  │ Reelle │      │     │
├────────┼──────────┼─────────────┼──────────┼──────────┼────────┼──────┼─────┤
│ [Edit] │ CODE123  │ Product Desc│ WH-01    │ 100      │ 95     │ PCS  │ Date│
│ [Edit] │ CODE456  │ Another Item│ WH-02    │ 50       │ 50     │ PCS  │ Date│
└────────┴──────────┴─────────────┴──────────┴──────────┴────────┴──────┴─────┘
```

---

## 3. Filter Section

### 3.1 Filter Panel
- Class: `AvecTitre` (styled panel with title)
- Title: `FILTRES`

### 3.2 Filter Fields

| Field | ID | Width | Session Var | Description |
|-------|-----|-------|-------------|-------------|
| Transaction No | Filtre9 | col-3 | session.InfoClient.Filtre9 | Order/transaction number (TRNO) |
| Product No | Filtre10 | col-3 | session.InfoClient.Filtre10 | Inventory item code (INNOINV) |
| Contains | Filtre11 | col-4 | session.InfoClient.Filtre11 | Free text search |

### 3.3 Filter Behavior
Each filter triggers screen refresh on change:
```html
<input type="text" id="Filtre9"
       onChange="afficheDiv('DivInventaire','','','','','',1,'TJSEQ','Departement');">
```

**Query Logic:**
- Filtre9 (Transaction) is **required** - no results if empty
- Filtre10 (Product) is optional additional filter
- Filtre11 (Contains) searches across: Description FR, Description EN, Product Code, Warehouse names

---

## 4. Results Table

### 4.1 Table Structure
- Class: `table table-bordered table-sm`
- Sticky header: `position:sticky;top:0;z-index:100`
- Alternating row colors: #ffffff / #eeeeee

### 4.2 Table Columns

| Column | Field | Description |
|--------|-------|-------------|
| Action | - | Edit button |
| No Produit | INVENTAIRE_INNOINV | Product/item code |
| Description | INVENTAIRE_INDESC1/2 | Product description (FR/EN) |
| Entrepot | ENTREPOT_ENDESC_P/S | Warehouse name (FR/EN) |
| Qte Estimee | TRQTEINV_ESTIME | System estimated quantity |
| Qte Reelle | TRQTEUNINV | Actual counted quantity |
| Unite | UNITE_INV_UNDESC1/2 | Unit of measure (FR/EN) |
| Date Verifie | ITEMFOURNIS_IFDATEMAJ | Last verification date |

### 4.3 Edit Button
```html
<button class="btn btn-outline-modifie btn-xs"
        onClick="AfficheDetTRANSAC('#TRSEQ#');">
    [Pencil Icon - #2B78E4]
</button>
```

---

## 5. Edit Modal (ModalDetTRANSAC)

When user clicks Edit, a modal opens to update quantity.

### 5.1 Modal Structure
```
┌──────────────────────────────────────────────────────────────────────────────┐
│                                                               [X Close]      │
├──────────────────────────────────────────────────────────────────────────────┤
│  MAJ QTE PRODUIT (Update Product Quantity)                                   │
├──────────────────┬───────────────────────────────────────────────────────────┤
│  No Produit      │  CODE123 - Product Description                            │
│  Entrepot        │  WAREHOUSE-01                                             │
│  Qte Estimee     │  100                                                      │
│  Qte Reelle      │  95                                                       │
├──────────────────┴───────────────────────────────────────────────────────────┤
│                                                                              │
│  DETAIL PAR CONTENANT (Detail by Container)                                  │
│  ┌──────────┬──────────┬──────────┬──────────┐                              │
│  │ Contenant│ Qte Est. │ Qte      │ Action   │                              │
│  │ (SKID)   │          │ Reelle   │          │                              │
│  ├──────────┼──────────┼──────────┼──────────┤                              │
│  │ SKID-001 │ 50       │ [input]  │ [OK]     │                              │
│  │ SKID-002 │ 50       │ [input]  │ [OK]     │                              │
│  └──────────┴──────────┴──────────┴──────────┘                              │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 5.2 Modal Fields
- Display-only: Product code, description, warehouse, estimated qty, actual qty
- Editable per container: Actual quantity input

### 5.3 Container Detail Table
From `DET_TRANS` table:
| Field | Description |
|-------|-------------|
| CONTENANT_CON_NUMERO | Container/SKID number |
| DTRQTE_ESTIME | Estimated quantity in container |
| DTRQTE | Actual quantity (editable) |

---

## 6. Database Query

### 6.1 Main Query (TRANSAC)
```sql
SELECT TRSEQ, INVENTAIRE_INNOINV, INVENTAIRE_INDESC2, INVENTAIRE_INDESC1,
       TRQTEINV_ESTIME, TRQTEUNINV, UNITE_INV_UNDESC2, UNITE_INV_UNDESC1,
       ENTREPOT_ENDESC_S, ENTREPOT_ENDESC_P, ITEMFOURNIS_IFDATEMAJ
FROM TRANSAC
WHERE TRNO LIKE :Filtre9
  AND INVENTAIRE_INNOINV LIKE :Filtre10  -- if provided
  AND (description/code LIKE :Filtre11)  -- if provided
```

### 6.2 Detail Query (DET_TRANS)
```sql
SELECT dt.DTRSEQ, dt.TRANSAC, dt.TRANSAC_TRNO, dt.ENTREPOT_ENDESC_S,
       dt.ENTREPOT_ENDESC_P, dt.DTRQTE_ESTIME, dt.DTRQTE,
       dt.CONTENANT_CON_NUMERO, t.INVENTAIRE_INNOINV, ...
FROM DET_TRANS dt
INNER JOIN TRANSAC t ON dt.TRANSAC = t.TRSEQ
WHERE dt.TRANSAC = :TRANSAC
```

---

## 7. Key JavaScript Functions

### 7.1 Display Edit Modal
```javascript
function AfficheDetTRANSAC(TRSEQ) {
    // Calls operation.cfc?method=afficheDetTRANSAC
    // Loads modal content
    // Shows modal
}
```

### 7.2 Update Quantity
```javascript
function ModifieDetTRANSAC(DTRSEQ, QTE) {
    // Calls operation.cfc?method=modifieDetTRANSAC
    // Updates actual quantity
    // Refreshes display
}
```

---

## 8. Warning Message

Yellow alert box displays inventory count instructions:
```html
<div class="alert alert-warning text-center">
    <strong>#LeMessagePriseInventaire#</strong>
</div>
```

Translation key: `LeMessagePriseInventaire`
- FR: Instructions for performing inventory count
- EN: Instructions for performing inventory count

---

## 9. Input Styling

Consistent with app-wide standards:
- Input height: 36px
- Font size: 24px
- Border/text color: #2B78E4 (blue) - not present here, standard form styling

---

## 10. Access Control

- Only visible when `session.InfoClient.VoirTout = 1`
- Button color: Green (#009E0F) - indicates inventory/stock function
