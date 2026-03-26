# Database Tables Reference — CNC

> **Files:** `server/api.cjs`, `queries/getCorrection.cfm`, `queries/submitCorrection.cfm`
> **Depends on:** none
> **Used by:** [07-sm-transaction](07-sm-transaction.md), [08-submit-flow](08-submit-flow.md), [09-cancel-correction](09-cancel-correction.md)

## Summary

CNC operations share most tables with PRESS/VCUT (TEMPSPROD, ENTRERPRODFINI, DET_TRANS, TRANSAC). CNC-specific tables include: RAISON (scrap types filtered by FMCODE), DET_DEFECT (defect tracking), INSTRUCTION/METHODE (operation steps), and TRANSFENTREP (forklift transfers).

---

## TEMPSPROD (Production Time Entry)

Same schema as documented in `docs/vcut/09-database-tables.md`. Key CNC-relevant fields:

| Field | CNC Usage |
|-------|-----------|
| `TJSEQ` | PK, used to find PROD row |
| `MODEPROD_MPCODE` | 'PROD' for production, 'STOP' for stop |
| `TJQTEPROD` / `TJQTEDEFECT` | Good and defect quantities |
| `SMNOTRANS` | Links to SM transaction |
| `ENTRERPRODFINI_PFNOTRANS` | Links to EPF transaction |
| `TJPROD_TERMINE` | Set to 1 on COMP (CNC does set this, unlike VCUT) |

## DET_DEFECT (Defect Tracking)

| Field | Type | Description |
|-------|------|-------------|
| `DDSEQ` | INT (PK) | Defect detail sequence |
| `DDQTEUNINV` | FLOAT | Quantity in inventory unit |
| `RAISON` | INT (FK) | Defect type (links to RAISON.RRSEQ) |
| `TEMPSPROD` | INT (FK) | Links to TEMPSPROD.TJSEQ |
| `DDVALEUR` | FLOAT | Cost valuation |

## RAISON (Defect/Scrap Types)

| Field | Type | Description |
|-------|------|-------------|
| `RRSEQ` | INT (PK) | Reason sequence |
| `RRCODE` | VARCHAR | Code (e.g., `SCRAP-CNC-001`) |
| `RRDESC_P` | VARCHAR | French description |
| `RRDESC_S` | VARCHAR | English description |
| `RRTYPE` | VARCHAR | Reason type grouping |

**CNC scrap code filter:** `RRCODE LIKE 'SCRAP-CNC%'` OR `RRDESC_P LIKE 'Usinage%'`
**SAND scrap code filter:** `RRCODE LIKE 'SCRAP-SND%'`

## INSTRUCTION / METHODE (Operation Steps)

| Field | Type | Description |
|-------|------|-------------|
| `METSEQ` | INT (PK) | Method/step sequence |
| `METNUMERO` | INT | Step number |
| `METDESC_P` | VARCHAR | French step description |
| `METDESC_S` | VARCHAR | English step description |
| `METFICHIER_PDF_P` | VARCHAR | French PDF file path |
| `METFICHIER_PDF_S` | VARCHAR | English PDF file path |
| `METVIDEO_P` | VARCHAR | French video file path |
| `METVIDEO_S` | VARCHAR | English video file path |
| `METRTF_P` | TEXT | French RTF/HTML instructions |
| `METRTF_S` | TEXT | English RTF/HTML instructions |
| `IMAGE_COUNT` | INT | Number of attached images |

Steps are fetched as part of the operation data and displayed in CncInfoSection.

## TRANSFENTREP (Forklift Transfer Tasks)

| Field | Type | Description |
|-------|------|-------------|
| `TRESEQ` | INT (PK) | Transfer sequence |
| `COPMACHINE` | INT | Operation machine |
| `CNOMENCOP` | INT | Operation NOPSEQ |
| `DEPARTEMENT` | INT | Department sequence |
| `ENTREPOT_SOURCE` | INT | Source warehouse |
| `ENTREPOT_DEST` | INT | Destination warehouse |

Created by `InsertTacheCariste` when current and next operations use different warehouses.

## ENTRERPRODFINI, DET_TRANS, TRANSAC

Same schema as documented in `docs/vcut/09-database-tables.md`. CNC uses the non-VCUT EPF posting path (queries unposted records from DB rather than iterating over a frontend list).

## MOULE Fields (from VSP_BonTravail_Entete)

Available in operation data but currently display-only for CNC:

| Field | Source | Description |
|-------|--------|-------------|
| `MOULE_CODE` | `VBE.Mold` | Mold code |
| `MOULE_CAVITE` | `VBE.OPENING` | Number of cavities |
| `MOULE_ECART` | `VBE.[ACTUAL GAP]` | Mold gap |
| `MOULE_TYPE` | `AUTOFAB_FctSelectVarCompo(..., '@MOLD_TYPE@')` | Mold type |
