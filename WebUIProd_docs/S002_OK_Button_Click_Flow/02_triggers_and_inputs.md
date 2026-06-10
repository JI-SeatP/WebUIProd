# 02 - Triggers & Inputs

## Old Software: OK Button Click

### Trigger
User taps `btnGO_MOYEN` ("OK") on a work order row in DivPrincipal.

### onclick Call
```javascript
afficheDiv('DivOperation', TRANSAC, 'Go', COPMACHINE, NOPSEQ, MACHINE, COMPTEURLIGNE, TJSEQ, DEPARTEMENT)
```
Source: `Tableau_principal.cfm:12`

### JS Function: `afficheDiv` (sp_js.cfm:324)

**Parameters received:**

| # | Name | Example Value | Notes |
|---|------|---------------|-------|
| 1 | LeDiv | `'DivOperation'` | Target div |
| 2 | TRANSAC | `1068109` | Transaction/order ID |
| 3 | Type | `'Go'` | Mode (Go = active, Consulter = read-only) |
| 4 | COPMACHINE | `0` | Can be 0 for unstarted orders |
| 5 | NOPSEQ | `12345` | Operation sequence (always >0) |
| 6 | MASEQ | `67` | Machine ID from PL_RESULTAT |
| 7 | Prochain | `1` | Row counter |
| 8 | TJSEQ | `0` or session value | From `session.InfoClient.TJSEQ` |
| 9 | Departement | `25` | Department ID |

### Pre-processing in JS (sp_js.cfm:369-370)
```javascript
if(NOPSEQ == 'undefined'){NOPSEQ=''}
if(MASEQ == 'undefined'){MASEQ=''}
```
No pre-processing for COPMACHINE — `0` passes through as-is.

### AJAX Call Parameters
Sent to `operation.cfc?method=afficheDiv` via GET (sp_js.cfm:418-419):
- All 9 parameters above + 13 filter values from DOM + Langue, dsClient, Appareil, ENTREPOT, POSTE, ListeMachines

---

## New Software: Go Button Click

### Trigger
User taps "Go" in the `ActionsDropdown` dropdown menu.

### Handler (`ActionsDropdown.tsx:66-70`)
```typescript
const handleGo = () => {
  navigate(`/orders/${order.TRANSAC}/operation/${order.COPMACHINE ?? 0}`);
};
```

### Route Match (`App.tsx:28-30`)
```tsx
<Route path="/orders/:transac/operation/:copmachine" element={<OperationDetailsPage />} />
```

### API Call (`useOperation.ts:17-18`)
```typescript
const res = await apiGet<OperationData>(
  `getOperation.cfm?transac=${transac}&copmachine=${copmachine}`
);
```

### Input Contract Difference

| Parameter | Old Software | New Software | Gap |
|-----------|-------------|-------------|-----|
| TRANSAC | Always present, >0 | Always present, >0 | OK |
| COPMACHINE | Can be 0, handled by guards | Can be 0, **but TJSEQ guard fails** | BUG |
| NOPSEQ | Always passed, used in all queries | **Not passed at all** | BUG |
| MASEQ | Passed, used for machine display | Not passed | Missing context |
| Type | `'Go'` vs `'Consulter'` | Not distinguished | Missing (separate issue) |
| DEPARTEMENT | Passed | Not passed | Missing context |

### Critical Missing Parameter: NOPSEQ

The old software passes NOPSEQ as a key lookup parameter. When COPMACHINE=0, the operation is found by TRANSAC + NOPSEQ.

The new software only passes TRANSAC and COPMACHINE. When COPMACHINE=0, the query cannot uniquely identify the operation (a TRANSAC can have multiple operations).

**This is a fundamental input contract mismatch.**
