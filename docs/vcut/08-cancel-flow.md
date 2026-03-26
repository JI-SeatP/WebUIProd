# Cancel Flow

> **Files:** `src/features/questionnaire/QuestionnairePage.tsx`
> **Depends on:** [03-questionnaire-layout](03-questionnaire-layout.md)
> **Used by:** none

## Summary

When the user clicks "Cancel", the frontend sends the current SM transaction info to `cancelQuestionnaire.cfm` for cleanup, then navigates back to the operation page.

## Frontend: `handleCancel()` (QuestionnairePage.tsx:248-257)

```typescript
const handleCancel = useCallback(async () => {
  await apiPost("cancelQuestionnaire.cfm", {
    transac: Number(transac),
    nopseq,
    smnotrans,
    smseq,
  });
  navigate(`/orders/${transac}/operation/${copmachine}`);
}, [transac, copmachine, smnotrans, smseq, navigate, operation]);
```

**Input:**

| Field | Type | Description |
|-------|------|-------------|
| `transac` | number | Work order TRANSAC |
| `nopseq` | number | Operation NOPSEQ |
| `smnotrans` | string | SM transaction number (may be empty if SM wasn't created) |
| `smseq` | number | SM sequence (may be null) |

**Behavior:**
- The cancel endpoint undoes any write-as-you-go changes (SM creation, defect records)
- Navigates back to `/orders/{transac}/operation/{copmachine}` regardless of success/failure
