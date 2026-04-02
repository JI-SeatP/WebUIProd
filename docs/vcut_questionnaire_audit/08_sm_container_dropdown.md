# 08 — SM Container/SKID Dropdown

## Overview

The Sortie Materiel (SM) section in the old software renders a **dropdown** in the CONTENANT column for each material output row. This allows the worker to select which skid/container to use for the material outing when multiple skids are booked for an order. The new software currently displays the container value as **read-only text** with no dropdown.

---

## Flow F — SM Container Selection

**Entrypoint:** `SortieMateriel.afficheListeSortieMaterielQS()` (render) + `SortieMateriel.CorrigeDetailSM()` (write)
**Source:** `SortieMateriel.cfc:209-675` (render), `SortieMateriel.cfc:1467-1512` (write), `sp_js.cfm:1661-1676` (JS handler)

### Step-by-step: Rendering the dropdown

1. **Load SM detail rows** (`SortieMateriel.cfc:428-481`) — queries `DET_TRANS` joined with `TRANSAC`, `INVENTAIRE`, `UNITE`, `ENTREPOT` to build `trouveSortiesMateriel` with all material output rows for the SM.

2. **Per DET_TRANS row: Load VCUT container options** (`SortieMateriel.cfc:553-558`):
   ```sql
   -- Runs against dsClientEXT (the _EXT datasource)
   SELECT v.TRANSAC, v.INVENTAIRE_INNOINV, v.CONTENANT_CON_NUMERO,
          v.DTRQTE, v.ENTREPOT, v.ENTREPOT_ENCODE,
          v.UNITE, v.UNITE_UNCODE, v.SPECIE, v.GRADE,
          v.THICKNESS, v.CUT, v.MARQUE, v.CODE,
          v.COULEUR, v.LONGUEUR, v.LARGEUR,
          e.ENDESC_P, e.ENDESC_S,
          c.CON_SEQ AS CONTENANT
   FROM VSP_BonTravail_VeneerReserve v
   LEFT OUTER JOIN <dbClient>.dbo.ENTREPOT e ON v.ENTREPOT = e.ENSEQ
   LEFT OUTER JOIN <dbClient>.dbo.CONTENANT c ON v.CONTENANT_CON_NUMERO = c.CON_NUMERO
   WHERE TRANSAC = <TRANSAC>
   ```
   - `VSP_BonTravail_VeneerReserve` is a view on the EXT database
   - `CONTENANT.CON_SEQ` (aliased as `CONTENANT`) is the integer PK used as the `<option value>`
   - `CONTENANT_CON_NUMERO` (varchar, e.g. "0000058819") is the visible label

3. **Fallback: Non-VCUT container options** (`SortieMateriel.cfc:560-573`):
   ```sql
   -- Runs against dsClient (main database)
   SELECT DISTINCT DT.CONTENANT, DT.CONTENANT_CON_NUMERO
   FROM TRANSAC T
   LEFT OUTER JOIN cNOMENCLATURE CN ON T.TRSEQ = CN.TRANSAC
   LEFT OUTER JOIN CNOMENCOP CNOP ON CNOP.TRANSAC = CN.TRANSAC
   LEFT OUTER JOIN INVENTAIRE IP ON IP.INSEQ = CNOP.INVENTAIRE_P
   LEFT OUTER JOIN DET_TRANS DT ON DT.TRANSAC = T.TRSEQ
   LEFT OUTER JOIN INVENTAIRE I ON (I.INSEQ = CN.INVENTAIRE_M)
   LEFT OUTER JOIN INVENTAIRE I2 ON I2.INSEQ = CN.INVENTAIRE_M
   OUTER APPLY ( ... DTRQTE_TRANSACTION )
   WHERE T.TRNO IN (
     SELECT SMNOTRANS FROM TEMPSPROD WHERE SMNOTRANS = <SMNOTRANS>
   )
   ```
   Used only when `trouveContenantsVCut.RecordCount = 0`.

4. **Dropdown rendering** (`SortieMateriel.cfc:593-605`):
   - Priority: VCUT path (`trouveContenantsVCut`) first, fallback (`trouveContenants`) second
   - Each `<option>` has `value="#CONTENANT[i]#"` (integer CON_SEQ)
   - Display text: `#CONTENANT_CON_NUMERO[i]#` (e.g., "0000058819")
   - Currently selected: where `CONTENANT[i] EQ trouveSortiesMateriel.CONTENANT[CurrentRow]`
   - Element: `<select id="CONTENANT_SM_<DTRSEQ>" name="CONTENANT_SM_<DTRSEQ>">`
   - `onChange` fires: `CorrigeDetailSM('<TRANSAC>','<COPMACHINE>','<NOPSEQ>','<Langue>','<Statut>','<TJSEQ>','<DTRSEQ>','<TRANSAC_TRNO>','Contenant')`

### Step-by-step: Container selection change

5. **JS handler** (`sp_js.cfm:1661-1676`):
   ```javascript
   function CorrigeDetailSM(TRANSAC,COPMACHINE,NOPSEQ,Langue,Statut,TJSEQ,DTRSEQ,TRANSAC_TRNO,Type) {
     LeContenantSM = document.getElementById('CONTENANT_SM_'+DTRSEQ).value;  // integer CON_SEQ
     LeEntrepotSM = document.getElementById('ENTREPOT_SM_'+DTRSEQ).value;
     $.ajax({
       url: CheminCFC + 'SortieMateriel.cfc?method=CorrigeDetailSM'
         + '&TRANSAC=' + TRANSAC + '&COPMACHINE=' + COPMACHINE
         + '&NOPSEQ=' + NOPSEQ + '&DTRSEQ=' + DTRSEQ
         + '&ContenantSM=' + LeContenantSM + '&EntrepotSM=' + LeEntrepotSM
         + '&Type=Contenant',
       success: function(result) {
         afficheListeSortieMaterielQS(...);  // refresh SM table
         setTimeout(() => verifieStatutSortie(...), 500);
       }
     });
   }
   ```

6. **CFC write handler** (`SortieMateriel.cfc:1467-1512`):
   - **Step 1 — Read current DET_TRANS row** (line 1481):
     ```sql
     SELECT DTRSEQ, DTRQTE, ENTREPOT, CONTENANT, TRANSAC, TRANSAC_TRNO
     FROM DET_TRANS
     WHERE DTRSEQ = <DTRSEQ>
     ```
   - **Step 2 — Find parent DET_TRANS for the selected container** (line 1487):
     ```sql
     SELECT DTRSEQ, ENTREPOT, ENTREPOT_ENCODE, ENTREPOT_ENDESC_P,
            ENTREPOT_ENDESC_S, CONTENANT_CON_NUMERO
     FROM DET_TRANS
     WHERE CONTENANT = <ContenantSM>        -- integer CON_SEQ from dropdown
       AND TRANSAC IN (SELECT TRSEQ FROM TRANSAC WHERE TRANSAC = <TRANSAC>)
       AND DTRSEQ_PERE IS NULL
       AND TRANSAC_TRNO_EQUATE = 15         -- SM transaction type
     ```
   - **Step 3 — Update DET_TRANS** (line 1499):
     ```sql
     UPDATE DET_TRANS
     SET CONTENANT            = <ContenantSM>,
         CONTENANT_CON_NUMERO = <trouveContenantPere.CONTENANT_CON_NUMERO>,
         DTRSEQ_PERE          = <trouveContenantPere.DTRSEQ>,
         ENTREPOT             = <trouveContenantPere.ENTREPOT>,
         ENTREPOT_ENCODE      = <trouveContenantPere.ENTREPOT_ENCODE>,
         ENTREPOT_ENDESC_P    = <trouveContenantPere.ENTREPOT_ENDESC_P>,
         ENTREPOT_ENDESC_S    = <trouveContenantPere.ENTREPOT_ENDESC_S>
     WHERE DTRSEQ = <DTRSEQ>
     ```
   - **Only `DET_TRANS` is written.** No update to `SORTIEMATERIEL`, `TEMPSPROD`, or `CONTENANT` tables.

---

## Database objects

### Tables read

| Table/View | Fields | Source | Purpose |
|-----------|--------|--------|---------|
| `VSP_BonTravail_VeneerReserve` (view, EXT ds) | `TRANSAC`, `CONTENANT_CON_NUMERO`, `ENTREPOT`, `ENTREPOT_ENCODE`, `DTRQTE`, inventory fields | `SortieMateriel.cfc:553` | VCUT container options (available skids) |
| `CONTENANT` | `CON_SEQ`, `CON_NUMERO` | Joined via `VSP_BonTravail_VeneerReserve` | Integer PK for dropdown value |
| `ENTREPOT` | `ENSEQ`, `ENDESC_P`, `ENDESC_S` | Joined via queries | Warehouse description |
| `DET_TRANS` | `DTRSEQ`, `CONTENANT`, `CONTENANT_CON_NUMERO`, `ENTREPOT`, `DTRSEQ_PERE`, `TRANSAC_TRNO_EQUATE` | `SortieMateriel.cfc:560,1481,1487` | Fallback container list + parent lookup |

### Tables written

| Table | Fields written | Source | When |
|-------|---------------|--------|------|
| `DET_TRANS` | `CONTENANT`, `CONTENANT_CON_NUMERO`, `DTRSEQ_PERE`, `ENTREPOT`, `ENTREPOT_ENCODE`, `ENTREPOT_ENDESC_P`, `ENTREPOT_ENDESC_S` | `SortieMateriel.cfc:1499` | Container dropdown change |

---

## Current new software state

The new software (`MaterialOutputSection.tsx`) displays the container value as **read-only text** in the SKID column. There is:
- No container dropdown
- No `CorrigeDetailSM` equivalent API endpoint
- No query to `VSP_BonTravail_VeneerReserve` for available containers
- The `container` field is returned as empty string from `queries/ajouteSM.cfm` (line 341) and as `CONTENANT_CON_NUMERO` from `server/api.cjs` (line 3174)

---

## Porting requirements

### I13 — SM container dropdown with VCUT priority

The SM material output section must render a dropdown per DET_TRANS row showing available containers/skids. The dropdown options come from:

1. **VCUT path (priority):** `VSP_BonTravail_VeneerReserve` on the EXT datasource, filtered by `TRANSAC`. The `CON_SEQ` from `CONTENANT` table (via cross-DB join) is the dropdown value.
2. **Fallback:** `DET_TRANS` rows for the SM transaction, extracting `DISTINCT CONTENANT, CONTENANT_CON_NUMERO`.

**Evidence:** `SortieMateriel.cfc:553-605` (rendering), `SortieMateriel.cfc:1467-1512` (write handler)

**Why:** Workers need to select which physical skid the cut material goes to. Multiple skids may be reserved for the same order.

### I14 — Container change updates DET_TRANS only

When the user selects a different container from the dropdown, the system must:
1. Find the "parent" DET_TRANS row matching the selected CON_SEQ (`WHERE CONTENANT = ? AND DTRSEQ_PERE IS NULL AND TRANSAC_TRNO_EQUATE = 15`)
2. Update the current DET_TRANS row with: `CONTENANT`, `CONTENANT_CON_NUMERO`, `DTRSEQ_PERE`, `ENTREPOT`, `ENTREPOT_ENCODE`, `ENTREPOT_ENDESC_P`, `ENTREPOT_ENDESC_S`
3. No other tables are modified (SORTIEMATERIEL, TEMPSPROD, CONTENANT are untouched)

**Evidence:** `SortieMateriel.cfc:1487-1509`

---

## Edge cases

1. **No VCUT containers found:** Falls back to non-VCUT container query from `DET_TRANS` directly.
2. **No parent DET_TRANS for selected container:** The UPDATE at line 1499 still runs with potentially blank/zero values for ENTREPOT fields — no guard clause exists.
3. **VCUT container query re-executes per row:** The `trouveContenantsVCut` query runs inside the per-row loop (line 553), re-executing the EXT view query for every DET_TRANS row. Performance concern but literal behavior.
