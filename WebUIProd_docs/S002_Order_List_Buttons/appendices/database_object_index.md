# Database Object Index

## Views

| View | Used By | Purpose |
|------|---------|---------|
| `vEcransProduction` | Button state computation, Details modal query | Main production view — provides STATUT_CODE, TREPOSTER_TRANSFERT, TJFINDATE, DESEQ, and all order/operation fields |
| `VSP_BonTravail_Entete` | Main query, Details modal query | Work ticket header (external datasource) |
| `VDET_COMM` | Commented-out `trouvePret` query | Would compute `LePret` — currently dead code |

## Tables (Read Only by Button Actions)

| Table | Used By | Columns Referenced |
|-------|---------|-------------------|
| `AUTOFAB_TEMPSPROD` | Via vEcransProduction | `MODEPROD_MPCODE` (→ STATUT_CODE), `TJFINDATE`, `TJSEQ` |
| `AUTOFAB_TRANSFENTREP` | Via vEcransProduction; Transfer modal | `TREPOSTER` (→ TREPOSTER_TRANSFERT), `TRESEQ`, `CNOMENCOP`, `TRNO_EQUATE` |
| `AUTOFAB_DET_TRANS` | VCUT qty computation; Transfer modal | `DTRQTE` |
| `TRANSAC` | All flows via view | `TRANSAC`, `NO_PROD`, `QTE_FORCEE`, `DEPARTEMENT` |
| `CNOMENCOP` | All flows via view | `NOPSEQ`, `COPMACHINE`, `MACHINE` |
| `MACHINE` | Via view | `MASEQ` |
| `FAMILLEMACHINE` | Via view | `FMCODE` (machine family) |
| `DEPARTEMENT` | Via view | `DESEQ` |
| `INVENTAIRE` | Via view | `NO_INVENTAIRE` |
| `cNOMENCLATURE` | Via view | `PRODUIT_CODE` |
| `CONTENANT` | Transfer modal | Container data |
| `ENTREPOT` | Transfer modal | Warehouse/storage location |
| `DET_TRANS` | Transfer modal | Transaction detail lines |
| `EMPLOYE` | Session init | `EMFONCTION` (→ CodeFonction) |

## Tables (Written By Downstream Flows — Out of Scope)

| Table | Written By | Notes |
|-------|-----------|-------|
| `AUTOFAB_TEMPSPROD` | `changeStatut` (Go → footer → status change) | Not directly by button click, but by subsequent action |

## Stored Procedures

No stored procedures are directly invoked by the 4 button click flows. All data access is via inline SQL queries against the view and tables listed above.

## Subqueries in vEcransProduction Relevant to Buttons

### TREPOSTER_TRANSFERT
```sql
OUTER APPLY (
  SELECT TOP 1 TE.TREPOSTER
  FROM AUTOFAB_TRANSFENTREP TE
  WHERE TE.CNOMENCOP = CNOP.NOPSEQ
  ORDER BY TE.TRESEQ DESC
) AS TRANSFERT
```

### STATUT_CODE
```sql
OUTER APPLY (
  SELECT TOP 1 TP.MODEPROD_MPCODE AS STATUT_CODE, TP.TJFINDATE, TP.TJSEQ
  FROM AUTOFAB_TEMPSPROD TP
  WHERE TP.TRANSAC = T.TRANSAC
    AND TP.CNOMENCOP = CNOP.NOPSEQ
  ORDER BY TP.TJSEQ DESC
)
```
