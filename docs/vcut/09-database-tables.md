# Database Tables Reference

> **Files:** `server/api.cjs`
> **Depends on:** none
> **Used by:** [04-pf-transaction](04-pf-transaction.md), [06-sm-transaction](06-sm-transaction.md), [07-submit-flow](07-submit-flow.md)

## Summary

Seven core tables are involved in VCUT operations. TEMPSPROD is the central hub linking to both SM (material output) and EPF (finished product) transactions via their transaction numbers.

---

## TEMPSPROD (Production Time Entry)

| Field | Type | Description |
|-------|------|-------------|
| `TJSEQ` | INT (PK) | Auto-increment sequence |
| `TRANSAC` | INT (FK) | Work order TRANSAC |
| `CNOMENCOP` | INT (FK) | Operation sequence (NOPSEQ) |
| `cNomencOp_Machine` | INT | Machine assignment |
| `MODEPROD_MPCODE` | VARCHAR | Mode: PROD, STOP, COMP |
| `MODEPROD` | INT | Mode code: 8 = STOP |
| `TJQTEPROD` | FLOAT | Good quantity produced |
| `TJQTEDEFECT` | FLOAT | Defective quantity |
| `SMNOTRANS` | CHAR(9) | FK to SM transaction number |
| `ENTRERPRODFINI_PFNOTRANS` | VARCHAR | FK to EPF transaction number |
| `CNOMENCLATURE` | INT | BOM item reference |
| `INVENTAIRE_C` | INT | Product inventory sequence |
| `EMPLOYE` | INT | Employee sequence |
| `OPERATION` | INT | Operation sequence |
| `MACHINE` | INT | Machine sequence |
| `TJDEBUTDATE` | DATETIME | Start date/time |
| `TJFINDATE` | DATETIME | End date/time |
| `TJNOTE` | VARCHAR(7500) | Note (contains "Ecran de production pour Temps prod") |
| `TJPROD_TERMINE` | BIT | Production complete flag |
| `TJVALIDE` | BIT | Validated flag |
| `TJVALEUR_MATIERE` | FLOAT | Material cost value |
| `TJSYSTEMPSHOMME` | FLOAT | System man-hours |
| `TJTEMPSHOMME` | FLOAT | Man-hours |
| `TJEMCOUT` | FLOAT | Employee cost |
| `TJOPCOUT` | FLOAT | Operation cost |
| `TJMACOUT` | FLOAT | Machine cost |

## ENTRERPRODFINI (EPF / Finished Product Header)

| Field | Type | Description |
|-------|------|-------------|
| `PFSEQ` | INT (PK) | Auto-increment sequence |
| `PFNOTRANS` | VARCHAR | EPF transaction number (links to TRANSAC.TRNO) |
| `PFPOSTER` | BIT | Posted flag (0 = not posted, 1 = posted) |

## DET_TRANS (Transaction Detail Lines)

| Field | Type | Description |
|-------|------|-------------|
| `DTRSEQ` | INT (PK) | Detail sequence |
| `TRANSAC` | INT (FK) | Transaction TRSEQ |
| `TRANSAC_TRNO` | VARCHAR | Transaction number |
| `DTRQTE` | FLOAT | Quantity (transaction unit) |
| `DTRQTEUNINV` | FLOAT | Quantity (inventory unit) |
| `CONTENANT` | INT | Container sequence |
| `CONTENANT_CON_NUMERO` | VARCHAR | Container number |
| `ENTREPOT` | INT | Warehouse sequence |
| `INVENTAIRE` | INT | Inventory item |
| `DTRCOUT_UNIT` | FLOAT | Unit cost |
| `DTRCOUT_TRANS` | FLOAT | Transaction cost |

## TRANSAC (Transaction Header)

| Field | Type | Description |
|-------|------|-------------|
| `TRSEQ` | INT (PK) | Transaction sequence |
| `TRNO` | VARCHAR | Transaction number (SMNOTRANS or PFNOTRANS) |
| `TRNO_EQUATE` | INT | Transaction type (7 = BigSheet) |
| `TRANSAC` | INT | Parent TRANSAC (work order) |
| `TRITEM` | INT | Item number |
| `TRNORELACHE` | INT | Release number |
| `TRPOSTER` | BIT | Posted flag |
| `TRQTETRANSAC` | FLOAT | Transaction quantity |
| `TRCOUTTRANS` | FLOAT | Transaction cost |

## cNOMENCLATURE (BOM / Bill of Materials)

| Field | Type | Description |
|-------|------|-------------|
| `NISEQ` | INT (PK) | Nomenclature item sequence |
| `TRANSAC` | INT | Work order TRANSAC |
| `NIQTE` | FLOAT | Quantity per parent (BOM ratio) |
| `INVENTAIRE_M` | INT | Material inventory (child) |
| `INVENTAIRE_M_INNOINV` | VARCHAR | Material code |
| `NISEQ_PERE` | INT | Parent NISEQ (NULL for root components) |
| `NIVALEUR_CHAR1` | VARCHAR | Custom value (order reference) |
| `NILONGUEUR` | FLOAT | Length |
| `NILARGEUR` | FLOAT | Width |

## cNOMENCOP (Operation Definition)

| Field | Type | Description |
|-------|------|-------------|
| `NOPSEQ` | INT (PK) | Operation sequence |
| `TRANSAC` | INT | Work order TRANSAC |
| `INVENTAIRE_P` | INT | Product inventory |
| `CNOMENCLATURE` | INT | BOM root reference |
| `NOPValeurEstime_Unitaire` | FLOAT | Estimated unit value (for EPF cost) |

## CONTENANT (Container)

| Field | Type | Description |
|-------|------|-------------|
| `CON_SEQ` | INT (PK) | Container sequence |
| `CON_NUMERO` | CHAR(10) | Container number (zero-padded) |

---

## SM ↔ PF Relationship Diagram

SM and PF are **two separate transactions** linked through TEMPSPROD:

```
TEMPSPROD
├── SMNOTRANS ────────→ TRANSAC.TRNO (SM transaction)
│                        └── DET_TRANS (material consumption lines)
│
└── ENTRERPRODFINI_PFNOTRANS ─→ TRANSAC.TRNO (EPF transaction)
                                  └── DET_TRANS (finished product lines)
```

- **SM** tracks raw material consumed (BOM ratios applied)
- **EPF/PF** tracks finished product inventory created
- Both use `Nba_ReporteUnTransac` to post (set `TRPOSTER = 1`)
- For VCUT: SM is shared across all components; each component gets its own EPF
