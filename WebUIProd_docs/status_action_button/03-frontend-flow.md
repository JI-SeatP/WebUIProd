# Status Action Buttons — Frontend Flow

## Old ColdFusion Frontend

### Source: `src/old/EcransSeatPly/prive/multilangue/sp_js.cfm` lines 1024-1067

### Step-by-Step Flow

```
User clicks button
    │
    ▼
changeStatut(Type, Statut, TRANSAC, COPMACHINE, NOPSEQ, DEPARTEMENT, MASEQ)
    │  Note: 7 args received, but only 5 sent to server (Type, DEPARTEMENT, MASEQ are frontend-only)
    │
    ├─ 1. Show loading modal: $('#modalAttente').modal('show')
    │
    ├─ 2. AJAX GET request:
    │     URL: {CheminCFC}QuestionnaireSortie.cfc
    │          ?method=ajouteModifieStatut
    │          &Statut={Statut}
    │          &TRANSAC={TRANSAC}
    │          &COPMACHINE={COPMACHINE}
    │          &NOPSEQ={NOPSEQ}
    │          &Langue={Langue}
    │     (Type, DEPARTEMENT, MASEQ are NOT sent — used only for frontend navigation)
    │
    ├─ 3. Parse response:
    │     Try JSON.parse(result) → extract LeTJSEQ and MODEPROD_MPCODE
    │     If parse fails → LeTJSEQ = raw result string
    │
    ├─ 4. Branch on Statut:
    │
    │     IF Statut == 'STOP' or 'COMP':
    │         → afficheDiv('DivQuestionnaire', TRANSAC, Type, COPMACHINE,
    │                       NOPSEQ, MASEQ, Def_Prochain, LeTJSEQ, PourDepartement)
    │         → Hide loading modal
    │
    │     ELSE IF Statut == 'PROD' AND modeProdRetour == 'SETUP':
    │         → Hide loading modal
    │         → confirmeSetUp(
    │             YES callback: afficheDiv('DivQuestionnaireSetUp', ...)
    │             NO callback:  afficheDiv('DivOperation', ...)
    │           )
    │
    │     ELSE (SETUP, PROD, PAUSE without SETUP→PROD):
    │         → afficheDiv('DivOperation', ...)
    │         → Hide loading modal
    │
    └─ END
```

### confirmeSetUp Dialog (`sp_js.cfm:987-1022`)

Shown when the user clicks PROD and the **previous** status was SETUP. Asks: "Do you want to fill the Setup Questionnaire?"

- **Yes** → navigates to `DivQuestionnaireSetUp` (Setup questionnaire screen)
- **No** → navigates to `DivOperation` (stays on operation screen)
- Modal is static (cannot dismiss by clicking outside or pressing Escape)

### Key Variables

| Variable          | Source                    | Description                              |
|-------------------|---------------------------|------------------------------------------|
| `CheminCFC`       | Global JS variable        | Path to CFC directory on server          |
| `Langue`          | Global JS variable        | Current language code (fr/en)            |
| `LeTJSEQ`         | Server response           | Newly created TEMPSPROD row ID           |
| `modeProdRetour`  | Server response           | Previous status MODEPROD_MPCODE          |
| `Def_Prochain`    | Global JS variable        | Default next operation flag              |
| `PourDepartement` | Global JS variable        | Department filter                        |

### Response Format (from server)

```json
{
  "LeTJSEQ": 12345,
  "MODEPROD_MPCODE": "Setup"
}
```

- `LeTJSEQ`: The TJSEQ of the **newly inserted** TEMPSPROD row
- `MODEPROD_MPCODE`: The MPCODE of the **previous** (now-closed) TEMPSPROD row. This is used to detect the SETUP→PROD transition.

> **Response parsing detail:** The code first checks `typeof result === 'string'` (line 1032). If the response is already a parsed object (jQuery may auto-parse JSON), it uses it directly. Otherwise it calls `JSON.parse()`. If parsing fails, the raw string is used as `LeTJSEQ`.

### Error Handling (Old)

The old `changeStatut()` function has **no error handling** for AJAX failures. If the request fails:
- The `#modalAttente` loading modal stays visible indefinitely (never hidden)
- No error message is shown to the user
- The `success` callback is never called, so no screen navigation occurs

### `afficheDiv()` — Screen Navigation (`sp_js.cfm:324-430`)

Called after every successful status change. This jQuery function:
1. Hides all screen containers (operation, questionnaire, etc.)
2. Updates session filter variables (department, next operation)
3. Makes an AJAX GET call to `operation.cfc?method=afficheDiv` with the target div name and operation params
4. Injects the returned HTML into the target container

---

## New React Frontend

### Source: `src/features/operation/hooks/useStatusChange.ts` + `src/features/operation/components/StatusActionBar.tsx`

### Step-by-Step Flow

```
User opens dropdown menu (StatusActionBar)
    │
    ▼
User clicks an active action item
    │
    ├─ 1. requestChange(action) → sets confirmAction state
    │     Shows ConfirmDialog with localized message:
    │       "{action} {operationLabel} on {machineLabel}?"
    │       "Order {orderNumber}"
    │
    ├─ 2. User confirms → executeChange()
    │
    │     ├─ 2a. setLoading(true)
    │     │
    │     ├─ 2b. POST /changeStatus.cfm
    │     │       Body: {
    │     │         transac: number,
    │     │         copmachine: number | null,
    │     │         newStatus: "SETUP" | "PROD" | "PAUSE" | "STOP" | "COMP" | "ON_HOLD",
    │     │         employeeCode: number (EMSEQ from session)
    │     │       }
    │     │
    │     ├─ 2c. On success (res.success === true):
    │     │       │
    │     │       ├─ Call onStatusChanged(confirmAction)
    │     │       │   → Updates localStatus in OperationDetailsPage
    │     │       │   → StatusActionBar re-renders with new active buttons
    │     │       │
    │     │       ├─ IF confirmAction == "STOP" or "COMP":
    │     │       │   Navigate to: /orders/{transac}/questionnaire/{stop|comp}
    │     │       │                ?copmachine={copValue}&fromStatus={encodeURIComponent(currentStatus)}
    │     │       │   (useStatusChange.ts:47-49)
    │     │       │
    │     │       └─ ELSE IF confirmAction == "PROD" AND currentStatus == "SETUP":
    │     │           setShowSetupPrompt(true)
    │     │           → Shows second ConfirmDialog:
    │     │             "Do you want to fill the Setup Questionnaire?"
    │     │             YES → navigate to /orders/{transac}/questionnaire/setup?copmachine={copValue}
    │     │             NO  → close dialog, stay on operation screen
    │     │
    │     └─ 2d. Finally: setLoading(false), setConfirmAction(null)
    │
    └─ User cancels → cancelChange() → setConfirmAction(null)
```

### Response Format (from Express server)

```json
{
  "success": true,
  "data": {
    "transac": 1068112,
    "copmachine": 213768,
    "newStatus": "PROD",
    "tjseq": 98765
  },
  "message": "Status changed to PROD"
}
```

### Error Handling (New)

The `useStatusChange` hook (`useStatusChange.ts:29-59`):
- Checks `res.success` after the API call — if `false`, no navigation occurs and no error is shown to the user (silent failure)
- There IS a `try/finally` block (`useStatusChange.ts:33-59`) but **no `catch`** — on network error or non-2xx HTTP response, the promise rejection propagates unhandled
- The `finally` block always runs: `setLoading(false)` and `setConfirmAction(null)` — the UI returns to its idle state
- No error toast or notification is displayed to the worker on failure

### Key Differences from Old Frontend

| Aspect                    | Old (ColdFusion)                         | New (React)                              |
|---------------------------|------------------------------------------|------------------------------------------|
| HTTP Method               | GET                                      | POST                                     |
| Confirmation              | None (immediate AJAX call)               | ConfirmDialog before API call            |
| Employee source           | Server-side session (`session.InfoClient.EMSEQ`) | Client-side session context (`state.employee.EMSEQ`) |
| SETUP→PROD detection      | Server returns `MODEPROD_MPCODE`         | Client checks `currentStatus === "SETUP"` |
| Screen navigation         | `afficheDiv()` (jQuery DOM swap)         | React Router `navigate()`                |
| Loading indicator         | Bootstrap modal (`#modalAttente`)        | `loading` state disables trigger button  |
| Parameters sent           | Statut, TRANSAC, COPMACHINE, NOPSEQ, Langue | transac, copmachine, newStatus, employeeCode |
| DEPARTEMENT/MASEQ         | Sent to JS but only DEPARTEMENT used     | Not sent (not needed by Express endpoint)|

### OperationDetailsPage Integration (`OperationDetailsPage.tsx`)

The `StatusActionBar` component is rendered at line 416-424:

```tsx
<StatusActionBar
  transac={transac}
  copmachine={copmachine}
  statusCode={localStatus ?? operation.STATUT_CODE}
  orderNumber={operation.TRANSAC_TRNO}
  operationLabel={operationLabel}
  machineLabel={machineLabel}
  onStatusChanged={handleStatusChanged}
/>
```

`handleStatusChanged` (line 55-57) updates `localStatus` state, which causes:
- The StatusActionBar to re-render with new button states
- The OperationHeader to show the new StatusBadge

### STATUT_CODE Data Flow (Critical)

The status displayed in the action bar follows this chain:

```
Database (TEMPSPROD.MODEPROD_MPCODE)
    │
    ▼ (Express getOperation endpoint reads from TEMPSPROD directly)
API Response (operation.STATUT_CODE)
    │
    ▼ (OperationDetailsPage passes to StatusActionBar)
statusCodeToEnum(statusCode)    ← StatusBadge.tsx:56-93
    │  Converts string like "STOP" → OperationStatus enum "STOP"
    │  Uses .toLowerCase() + stringMap lookup
    │  ⚠️ Falls back to "READY" on unknown values!
    ▼
getAllActions(status)            ← StatusActionBar.tsx:46-98
    │  Determines which buttons are active based on enum
    ▼
Button rendering (active/inactive)
```

> **⚠️ CRITICAL LESSON (2026-03-26):** The Express `getOperation` endpoint originally queried the `vEcransProduction` view on the **EXT database** instead of replicating the CFM's RequeteAlternative approach on the **primary database**. The view's STATUT_CODE IS from `TPROD.MODEPROD_MPCODE` (via OUTER APPLY on `AUTOFAB_TEMPSPROD`, view line 118/173), but the OUTER APPLY has restrictive filters (`OPERATION IS NOT NULL`, null-safe NOPSEQ matching) that can miss certain TEMPSPROD rows. This caused operations in STOP/PAUSE/etc. to incorrectly display as READY.
>
> **Fix applied:** The Express endpoint now replicates the CFM's exact 2-step approach: get TJSEQ from the view, then run RequeteAlternative on the **primary database** with `INNER JOIN TEMPSPROD ... WHERE TPROD.TJSEQ = @theTJSEQ`. STATUT_CODE comes directly from the INNER JOIN — no override needed.
>
> **Key takeaway:** Always replicate the old software's exact datasource structure. The CFM uses the **primary database** for direct table joins with cross-DB refs to EXT — don't substitute with the EXT view.

### statusCodeToEnum Mapping

The `statusCodeToEnum()` function (`StatusBadge.tsx:56-93`) must map **both** frontend action names and raw database MPCODE values:

| Database MPCODE | `.toLowerCase()` | stringMap key | Returns |
|----------------|-------------------|---------------|---------|
| `Setup`        | `setup`           | `setup`       | `SETUP` |
| `Prod`         | `prod`            | `prod`        | `PROD`  |
| `PAUSE`        | `pause`           | `pause`       | `PAUSE` |
| `STOP`         | `stop`            | `stop`        | `STOP`  |
| `COMP`         | `comp`            | `comp`        | `COMP`  |
| `HOLD`         | `hold`            | `hold`        | `ON_HOLD` |
| `READY`        | `ready`           | `ready`       | `READY` |

If ANY value is not in the map, it falls back to `"READY"`. This is why missing the `"hold"` entry caused ON_HOLD operations to display as READY.
