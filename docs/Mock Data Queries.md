## SQL Queries for Mock Data Export

### 1. **Departments List**

```sql
-- Export as: departments.csv
SELECT 
    DESEQ,
    DECODE,
    DEDESCRIPTION_S,
    DEDESCRIPTION_P
FROM Autofab_DEPARTEMENT
WHERE DEVOIRDANSUSINE = 1
ORDER BY DEDESCRIPTION_S
```

---

### 2. **Machines List**

```sql
-- Export as: machines.csv
SELECT 
    MA.MASEQ,
    MA.MACODE,
    MA.FMDESCRIPTION_P,
    MA.FMDESCRIPTION_S,
    MA.DEPARTEMENT,
    MA.FAMILLEMACHINE,
    FM.FMCODE,
    FM.FMDESC_P,
    FM.FMDESC_S
FROM Autofab_MACHINE MA
INNER JOIN Autofab_FAMILLEMACHINE FM ON MA.FAMILLEMACHINE = FM.FMSEQ
WHERE FM.FMVOIRDANSUSINE = 1
ORDER BY MA.DEPARTEMENT, MA.MADESC_S
```

---

### 3. **Employees (Sample - for authentication mock)**

```sql
-- Export as: employees.csv
-- Limit to 20-30 active employees for mock data
SELECT TOP 30
    em.EMSEQ,
    em.EMNO,
    em.EMNOM,
    em.EMACTIF,
    em.EMNOIDENT,
    em.MACHINE,
    em.EMEMAIL,
    em.EQUIPE,
    e.EQDESC_P AS NOMEQUIPE_P,
    e.EQDESC_S AS NOMEQUIPE_S,
    e.EQDEBUTQUART,
    e.EQFINQUART,
    m.DEPARTEMENT,
    m.ENTREPOT,
    m.POSTE,
    f.EFCTDESC_P AS Fonction_P,
    f.EFCTDESC_S AS Fonction_S,
    f.EFCTCODE AS CodeFonction
FROM Autofab_EMPLOYE em
LEFT JOIN Autofab_EQUIPE e ON em.EQUIPE = e.EQSEQ
LEFT JOIN Autofab_MACHINE m ON em.MACHINE = m.MASEQ
LEFT JOIN Autofab_EMP_FCT f ON em.EMP_FCT = f.EFCTSEQ
WHERE em.EMACTIF = 1
ORDER BY em.EMNOM
```

---

### 4. **Work Orders / Operations List (Main Screen Data)**

```sql
-- Export as: work_orders.csv
-- This uses the vEcransProduction view - get a sample of recent work orders
```sql
SELECT TOP 100
    v.TRANSAC,
    v.COPMACHINE,
    v.NOPSEQ,
    v.TJSEQ,
    v.NO_PROD,
    v.NOM_CLIENT,
    v.CODE_CLIENT,
    v.CONOPO,
    v.OPERATION,
    v.OPERATION_P,
    v.OPERATION_S,
    v.OPERATION_SEQ,
    v.MACHINE,
    v.MACODE,
    v.MACHINE_P,
    v.MACHINE_S,
    v.DEPARTEMENT,
    v.DESEQ,
    v.DECODE,
    v.DeDescription_P,
    v.DeDescription_S,
    v.FAMILLEMACHINE,
    v.FMCODE,
    v.NO_INVENTAIRE,
    v.INVENTAIRE_SEQ,
    v.INVENTAIRE_P,
    v.INVENTAIRE_S,
    v.PRODUIT_CODE,
    v.PRODUIT_SEQ,
    v.PRODUIT_P,
    v.PRODUIT_S,
    v.MATERIEL_CODE,
    v.MATERIEL_SEQ,
    v.MATERIEL_P,
    v.MATERIEL_S,
    v.Panneau,
    v.MOULE_CODE,
    v.GROUPE,
    v.REVISION,
    v.DATE_DEBUT_PREVU,
    v.DATE_FIN_PREVU,
    v.TJFINDATE,
    v.PR_DEBUTE,
    v.PR_TERMINE,
    v.TERMINE,
    v.QTE_A_FAB,
    v.QTE_PRODUITE,
    v.QTE_RESTANTE,
    v.QTE_FORCEE,
    v.QTY_REQ,
    v.STATUT_CODE,
    v.STATUT_P,
    v.STATUT_S,
    v.DCPRIORITE,
    v.ESTKIT,
    v.ENTREPOT,
    v.ENTREPOT_CODE,
    v.ENTREPOT_P,
    v.ENTREPOT_S
FROM vEcransProduction v
WHERE v.OPERATION <> 'FINSH'
ORDER BY v.DATE_DEBUT_PREVU DESC
```
```

---

### 5. **Work Order Details (Extended Info)**

```sql
-- Export as: work_order_details.csv
-- Join with VSP_BonTravail_Entete for complete details
SELECT TOP 100
    v.TRANSAC,
    v.COPMACHINE,
    v.NOPSEQ,
    v.NO_PROD,
    VBE.DCQTE_A_FAB,
    VBE.DCQTE_A_PRESSER,
    VBE.DCQTE_PRESSED,
    VBE.DCQTE_PENDING_TO_PRESS,
    VBE.DCQTE_PENDING_TO_MACHINE,
    VBE.DCQTE_FINISHED,
    VBE.DCQTE_REJET,
    VBE.PCS_PER_PANEL,
    VBE.CONOPO,
    VBE.SHARE_PRESSING,
    VBE.PAGE_COMPO,
    VBE.Panel_NiSeq
FROM vEcransProduction v
LEFT OUTER JOIN dbo.VSP_BonTravail_Entete AS VBE 
    ON VBE.TRANSAC = v.TRANSAC
WHERE v.OPERATION <> 'FINSH'
ORDER BY v.DATE_DEBUT_PREVU DESC
```

---

### 6. **Warehouses/Entrepots (for inventory screens)**

```sql
-- Export as: warehouses.csv
SELECT 
    ENSEQ,
    ENCODE,
    ENDESC_P,
    ENDESC_S
FROM ENTREPOT
WHERE ENACTIF = 1
ORDER BY ENCODE
```

---

### 8. **Employee Functions/Roles**

```sql
-- Export as: employee_functions.csv
SELECT 
    EFCTSEQ,
    EFCTCODE,
    EFCTDESC_P,
    EFCTDESC_S
FROM Autofab_EMP_FCT
ORDER BY EFCTCODE
```

---

### 9. **Teams/Shifts**

```sql
-- Export as: teams.csv
SELECT 
    EQSEQ,
    EQCODE,
    EQDESC_P,
    EQDESC_S,
    EQDEBUTQUART,
    EQFINQUART
FROM EQUIPE
ORDER BY EQCODE
```

---

## Priority Order for Mock Data

| Priority | File                     | Purpose                   | Status     |
| -------- | ------------------------ | ------------------------- | ---------- |
| 1        | `departments.csv`        | Navigation/filtering      | ok         |
| 2        | `machines.csv`           | Navigation/filtering      | ok         |
| 3        | `employees.csv`          | Authentication mock       | ok         |
| 4        | `work_orders.csv`        | Main list screen          | ok         |
| 5        | `work_order_details.csv` | Operation detail screen   | ok         |
| 6        | `warehouses.csv`         | Inventory features        | ok         |
| 7        | `dictionary.csv`         | i18n (if not using Excel) | uses excel |
| 8        | `employee_functions.csv` | Role-based UI             | ok         |
| 9        | `teams.csv`              | Shift display             | ok         |

---

Run these queries and export as CSV or Excel. Once you provide the files, I'll create TypeScript interfaces and mock data loaders that match the exact column structure from your database.