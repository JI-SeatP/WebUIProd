# SM (Sortie de Materiel) Transaction Flow — CNC

> **Files:** `src/features/questionnaire/QuestionnairePage.tsx`, `server/api.cjs` (ajouteSM + submitQuestionnaire SM section)
> **Depends on:** [06-questionnaire-layout](06-questionnaire-layout.md), [10-database-tables](10-database-tables.md)
> **Used by:** [08-submit-flow](08-submit-flow.md)

## Summary

CNC uses the **standard SM flow** (same as PRESS and other non-VCUT operations). SM is created/updated via `ajouteSM.cfm` during write-as-you-go, then posted during final submission. Unlike VCUT, there is no batch logic — SM is tied to a single TJSEQ.

## Frontend: `handleGoodQtyOk()` (QuestionnairePage.tsx:90-117)

```typescript
const res = await apiPost("ajouteSM.cfm", {
  transac, copmachine, nopseq,
  qteBonne: Number(goodQty) || 0,
  smnotrans,   // existing SM (empty on first call)
  // No isVcut or listeTjseq for CNC
});
```

**Response:** `{ smnotrans, smseq, materials: MaterialRow[] }`

## SM Recalculation Triggers (Same as Standard)

| # | Trigger | How |
|---|---------|-----|
| 1 | Good qty OK button | Direct `handleGoodQtyOk()` call |
| 2 | Defect added | `handleAddDefect()` → `handleGoodQtyOk()` |
| 3 | Defect removed | `handleRemoveDefect()` → `handleGoodQtyOk()` |

Note: Trigger #4 (VCUT item added) does not apply to CNC.

## Backend SM in submitQuestionnaire (Lines 1920-2084)

### Key Difference from VCUT

**SM existence check** (lines 1953-1964):
- **CNC (non-VCUT):** Checks only the current `TJSEQ` for `SMNOTRANS`
- **VCUT:** Checks ALL TEMPSPROD rows for this TRANSAC

**BOM ratio calculation** (lines 2024-2057):
For each `DET_TRANS` material line: `nouvelleQte = ABS(totalQte * NIQTE)`
- `totalQte = qteBonne + qteDefect`
- `NIQTE` from `cNOMENCLATURE` via `cNOMENCOP` matching the material's `INVENTAIRE_M`

### SM Flow Steps

1. **Check condition:** `totalQte > 0` (line 1926)
2. **Get supporting data:** `TRITEM`, `CONOTRANS` from `TRANSAC`+`COMMANDE`; `NISTR_NIVEAU`, `UtiliseInventaire` from `VOperationParTransac`
3. **Only proceed if** `UtiliseInventaire === 1`
4. **Check SM exists** on current TJSEQ
5. **Create SM if needed** via `Nba_Sp_Insert_Sortie_Materiel`
6. **Process SM details** via `Nba_Sp_Sortie_Materiel`
7. **Recalculate DET_TRANS** quantities using BOM ratios + `Nba_Insert_Det_Trans_Avec_Contenant`
8. **Link SM to TEMPSPROD:** `UPDATE TEMPSPROD SET SMNOTRANS = @smnotrans WHERE TJSEQ = @tjseq`
9. **Post SM** via `Nba_ReporteUnTransac`

See [11-stored-procedures](11-stored-procedures.md) for SP parameter details.
