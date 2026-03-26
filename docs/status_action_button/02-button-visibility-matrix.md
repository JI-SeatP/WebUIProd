# Status Action Buttons — Button Visibility Matrix

## Source: Old ColdFusion (`support.cfc:474-669`)

The old software renders 5 buttons in a `btn-group` div. Each button has 3 possible states:
- **Active** — has `onclick` handler, CSS class `Attente`, colored icon
- **Selected** — has `{STATUS}encadre` CSS class, colored icon, NO onclick handler
- **Disabled** — HTML `disabled` attribute, gray icon (#999999)

### Matrix (Old Software)

| Current `STATUT_CODE` | SETUP         | PROD          | PAUSE         | STOP          | COMP          |
|-----------------------|---------------|---------------|---------------|---------------|---------------|
| `""` (empty/ready)    | **Active**    | Disabled      | Disabled      | Disabled      | Disabled      |
| `"SETUP"`             | **Selected**  | **Active**    | Disabled      | Disabled      | Disabled      |
| `"PROD"`              | **Active**    | **Selected**  | **Active**    | **Active**    | **Active**    |
| `"PAUSE"`             | **Active**    | **Active**    | **Selected**  | Disabled      | Disabled      |
| `"STOP"`              | **Active**    | **Active**    | Disabled      | **Selected**  | Disabled      |
| `"COMP"`              | Disabled      | Disabled      | Disabled      | Disabled      | **Selected**  |

### Button onclick Signature (Old Software)

All active buttons call the same function with these 7 arguments:

```javascript
changeStatut(Type, Statut, TRANSAC, COPMACHINE, NOPSEQ, DEPARTEMENT, MASEQ)
```

Example from code (`support.cfc:482`):
```javascript
onClick="changeStatut('Go','SETUP','1068112','0','213768','11','108');"
```

### Visual Styling (Old Software)

| Button | Active Icon Color | CSS Classes (Active)                        | CSS Classes (Selected)                             |
|--------|-------------------|---------------------------------------------|----------------------------------------------------|
| SETUP  | #9900FF (purple)  | `btn btn-outline-setup btn-lg Attente`      | `btn btn-outline-setup btn-lg SETUPencadre Attente`|
| PROD   | #009E0F (green)   | `btn btn-outline-prod btn-lg Attente`       | `btn btn-outline-prod btn-lg PRODencadre`          |
| PAUSE  | #FF9900 (amber)   | `btn btn-outline-pause btn-lg Attente`      | `btn btn-outline-pause btn-lg PAUSEencadre`        |
| STOP   | #CC0000 (red)     | `btn btn-outline-stop btn-lg Attente`       | `btn btn-outline-stop btn-lg STOPencadre`          |
| COMP   | #2B78E4 (blue)    | `btn btn-outline-comp btn-lg Attente`       | `btn btn-outline-comp btn-lg COMPencadre`          |

---

## Source: New React (`StatusActionBar.tsx:46-98`)

The new implementation uses a dropdown menu instead of a horizontal button group. Each action item has an `active` boolean controlling clickability.

### Matrix (New React)

| Current Status | SETUP    | PROD     | PAUSE    | STOP     | ON_HOLD  | COMP     |
|---------------|----------|----------|----------|----------|----------|----------|
| `READY`       | **Active** | ❌     | ❌       | ❌       | ❌       | ❌       |
| `SETUP`       | ❌       | **Active** | ❌     | ❌       | ❌       | ❌       |
| `PROD`        | ❌       | ❌       | **Active** | **Active** | **Active** | **Active** |
| `PAUSE`       | ❌       | **Active** | ❌     | ❌       | ❌       | ❌       |
| `STOP`        | **Active** | **Active** | ❌   | ❌       | ❌       | ❌       |
| `ON_HOLD`     | **Active** | **Active** | ❌   | ❌       | ❌       | ❌       |
| `COMP`        | ❌       | ❌       | ❌       | ❌       | ❌       | ❌       |
| `DONE`        | ❌       | ❌       | ❌       | ❌       | ❌       | ❌       |

> **Note:** `DONE` is a terminal state like `COMP` — all actions are inactive. Unknown/unrecognized status codes default to `READY` via `statusCodeToEnum()` in `StatusBadge.tsx:56-93`.

### Logic in Code (`StatusActionBar.tsx:46-98`)

```typescript
const notStarted = status === "READY";
const inSetup    = status === "SETUP";
const inProd     = status === "PROD";
const paused     = status === "PAUSE";
const stopped    = status === "STOP";
const onHold     = status === "ON_HOLD";

// SETUP active when: notStarted || stopped || onHold               (line 60)
// PROD  active when: inSetup || paused || stopped || onHold        (line 67)
// PAUSE active when: inProd                                        (line 74)
// STOP  active when: inProd                                        (line 81)
// ON_HOLD active when: inProd                                      (line 88)
// COMP  active when: inProd                                        (line 95)
```

> **Note:** `RESET_READY` exists in the `StatusAction` type union (`useStatusChange.ts:6`) and in `confirmLabels` (`StatusActionBar.tsx:142`), but there is NO button for it in `getAllActions`. It is an unused/reserved action.

---

## Discrepancies Between Old and New

| Status  | Button    | Old         | New        | Difference                                    |
|---------|-----------|-------------|------------|-----------------------------------------------|
| SETUP   | SETUP     | Selected    | Inactive   | Old highlights current; new hides it           |
| PROD    | SETUP     | **Active**  | Inactive   | **OLD allows SETUP from PROD; new does NOT**  |
| PROD    | ON_HOLD   | N/A         | **Active** | New status not in old software                 |
| PAUSE   | SETUP     | **Active**  | Inactive   | **OLD allows SETUP from PAUSE; new does NOT**  |
| PAUSE   | STOP      | Disabled    | Inactive   | Both block it — consistent                     |
| PAUSE   | COMP      | Disabled    | Inactive   | Both block it — consistent                     |
| STOP    | STOP      | Selected    | Inactive   | Old highlights current; new hides it           |
| COMP    | All       | Disabled    | Inactive   | Both block all — consistent (terminal state)   |

### Critical Behavioral Differences

1. **PROD → SETUP:** Old allows going back to SETUP from PROD (`support.cfc:546`). New does NOT — `notStarted || stopped || onHold` excludes `inProd` (`StatusActionBar.tsx:60`).
2. **PAUSE → SETUP:** Old allows going to SETUP from PAUSE (`support.cfc:578`). New does NOT — `notStarted || stopped || onHold` excludes `paused` (`StatusActionBar.tsx:60`).
3. **ON_HOLD:** Entirely new status in the React implementation, not present in old.
4. **PAUSE → PROD/SETUP only:** In old, from PAUSE you can go to SETUP or PROD. In new, from PAUSE you can ONLY go to PROD.

> **⚠️ Decision Item:** The PROD→SETUP and PAUSE→SETUP transitions are intentionally removed in the new system or this is a bug? The old software explicitly enables these (see `support.cfc:546` for PROD→SETUP and `support.cfc:578` for PAUSE→SETUP). If this is intentional, document the rationale. If not, the `SETUP` active condition in `StatusActionBar.tsx:60` needs to include `inProd || paused`.
