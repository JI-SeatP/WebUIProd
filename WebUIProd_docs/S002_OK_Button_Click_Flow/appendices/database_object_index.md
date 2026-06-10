# Database Object Index

## Views

| View | Datasource | Used By | Notes |
|------|-----------|---------|-------|
| `vEcransProduction` | EXT (old) / Primary (new, WRONG) | Operation lookup | Uses OUTER APPLY for TEMPSPROD — returns NULL status for unstarted orders |
| `VSP_BonTravail_Entete` | EXT | Both old and new | Work ticket header, cross-DB join |
| `VCeduleMachine` | EXT | Old code only | Machine schedule details |

## Tables

| Table | Datasource | Role | COPMACHINE Guard? |
|-------|-----------|------|-------------------|
| `TEMPSPROD` | Primary | Production time records | Yes — `Val(COPMACHINE) NEQ 0` in old code; INNER JOIN in new (BUG) |
| `CNOMENCOP` | Primary | Operation definitions | No (always joined by NOPSEQ) |
| `PL_RESULTAT` | Primary | Schedule/planning results | No |
| `COMMANDE` | Primary | Order header | No |
| `TRANSAC` | Primary | Transaction header | No |
| `DET_COMM` | Primary | Transaction details | No |
| `MACHINE` | Primary | Machine definitions | No |
| `FAMILLEMACHINE` | Primary | Machine family | No |
| `OPERATION` | Primary | Operation type definitions | No |
| `INVENTAIRE` | Primary | Inventory items | No |
| `CNOMENCLATURE` | Primary | Product nomenclature | No |
| `TRANSFENTREP` | Primary | Transfer records | COPMACHINE guard varies (NEQ "" in old) |

## Key Column: TEMPSPROD.TJSEQ

- Sequential ID of production time records
- NULL when no production has started (via OUTER APPLY in view)
- `Val(NULL) = 0` in ColdFusion
- The new code's `getOperation.cfm:48` incorrectly treats TJSEQ=0 as "not found"
