# UML Diagrams

Reference for generating class diagrams, sequence diagrams, activity diagrams, state machine diagrams, and component/architecture diagrams.

## Table of Contents

1. [Diagram Type Selection](#diagram-type-selection)
2. [Class Diagram](#class-diagram)
3. [Sequence Diagram](#sequence-diagram)
4. [Activity Diagram](#activity-diagram)
5. [State Machine Diagram](#state-machine-diagram)
6. [Component / Architecture Diagram](#component--architecture-diagram)
7. [Tips](#tips)

---

## Diagram Type Selection

| User Intent | Diagram Type |
|---|---|
| "Show me the classes/models and their relationships" | Class Diagram |
| "How do these services/components talk to each other?" | Sequence Diagram |
| "What's the workflow/process?" | Activity Diagram |
| "What states can this entity be in?" | State Machine |
| "Show me the system architecture / how modules connect" | Component Diagram |

---

## Class Diagram

### Structure

Each class is a vertical stack:
1. **Header** — Class name (slate-900 bg, white text, bold)
2. **Attributes section** — Properties with types
3. **Methods section** — Functions with return types

Separator lines between sections use slate-200 (`#e2e8f0`).

### Node Styles

**Class Container:**
```
shape=table;startSize=0;container=1;collapsible=0;childLayout=tableLayout;fixedRows=1;rowLines=1;fontStyle=0;strokeColor=#e2e8f0;fillColor=#ffffff;rounded=1;arcSize=8;overflow=hidden;shadow=0;
```

**Class Header Row:**
```
shape=tableRow;horizontal=0;startSize=0;swimlaneHead=0;swimlaneBody=0;fillColor=#0f172a;collapsible=0;dropTarget=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;fontSize=14;fontStyle=1;strokeColor=#0f172a;fontColor=#ffffff;fontFamily=Inter;
```

**Attribute Row:**
```
shape=tableRow;horizontal=0;startSize=0;swimlaneHead=0;swimlaneBody=0;fillColor=#ffffff;collapsible=0;dropTarget=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;fontSize=12;strokeColor=#e2e8f0;fontFamily=Inter;
```

**Method Row (italic for abstract):**
```
shape=tableRow;horizontal=0;startSize=0;swimlaneHead=0;swimlaneBody=0;fillColor=#f8fafc;collapsible=0;dropTarget=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;fontSize=12;strokeColor=#e2e8f0;fontFamily=Inter;
```

### Relationship Edges

| Relationship | Arrow Style | Description |
|---|---|---|
| Inheritance | `endArrow=block;endFill=0;strokeColor=#0f172a;strokeWidth=1.5;` | Open triangle arrow |
| Implementation | `endArrow=block;endFill=0;dashed=1;dashPattern=8 4;strokeColor=#94a3b8;strokeWidth=1.5;` | Dashed + open triangle |
| Composition | `endArrow=diamond;endFill=1;strokeColor=#0f172a;strokeWidth=1.5;` | Filled diamond |
| Aggregation | `endArrow=diamond;endFill=0;strokeColor=#94a3b8;strokeWidth=1.5;` | Open diamond |
| Association | `endArrow=open;endFill=0;strokeColor=#94a3b8;strokeWidth=1.5;` | Open arrow |
| Dependency | `endArrow=open;endFill=0;dashed=1;dashPattern=8 4;strokeColor=#cbd5e1;strokeWidth=1.5;` | Dashed open arrow |

### Visibility Notation

Use text prefixes in attribute/method names:
- `+` public
- `-` private
- `#` protected
- `~` package

### Template Snippet: Single Class

```xml
<!-- Class: UserService (width=240, 3 attrs + 2 methods = header(32) + 3(26) + separator line implicit + 2(26) = 162) -->
<mxCell id="class_userservice" value="" style="shape=table;startSize=0;container=1;collapsible=0;childLayout=tableLayout;fixedRows=1;rowLines=1;fontStyle=0;strokeColor=#e2e8f0;fillColor=#ffffff;rounded=1;arcSize=8;overflow=hidden;shadow=0;" vertex="1" parent="1">
  <mxGeometry x="100" y="100" width="240" height="162" as="geometry" />
</mxCell>

<!-- Header: UserService -->
<mxCell id="class_us_header" value="" style="shape=tableRow;horizontal=0;startSize=0;swimlaneHead=0;swimlaneBody=0;fillColor=#0f172a;collapsible=0;dropTarget=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;fontSize=14;fontStyle=1;strokeColor=#0f172a;fontColor=#ffffff;fontFamily=Inter;" vertex="1" parent="class_userservice">
  <mxGeometry width="240" height="32" as="geometry" />
</mxCell>
<mxCell id="class_us_header_c1" value="UserService" style="shape=partialRectangle;connectable=0;fillColor=#0f172a;top=0;left=0;bottom=0;right=0;fontStyle=1;overflow=hidden;whiteSpace=wrap;html=1;fontFamily=Inter;fontSize=14;fontColor=#ffffff;strokeColor=#0f172a;align=center;" vertex="1" parent="class_us_header">
  <mxGeometry width="240" height="32" as="geometry" />
</mxCell>

<!-- Attribute rows... (follow ERD row pattern with left col = name, right col = type) -->
<!-- Method rows use fillColor=#f8fafc to differentiate -->
```

---

## Sequence Diagram

### Structure

Sequence diagrams have:
1. **Participants** — Rectangles at the top representing actors/services
2. **Lifelines** — Dashed vertical lines extending down from each participant
3. **Messages** — Horizontal arrows between lifelines (solid = call, dashed = return)
4. **Activation bars** — Narrow rectangles on lifelines showing active processing

### Participant Style

```
rounded=1;whiteSpace=wrap;html=1;arcSize=20;fillColor=#f1f5f9;strokeColor=#e2e8f0;fontColor=#0f172a;fontFamily=Inter;fontSize=13;fontStyle=1;align=center;verticalAlign=middle;spacingTop=4;spacingBottom=4;spacingLeft=8;spacingRight=8;
```

### Lifeline Style

```
html=1;points=[];perimeter=orthogonalPerimeter;strokeColor=#cbd5e1;strokeWidth=1;dashed=1;dashPattern=8 4;
```

Draw lifelines as edges from participant bottom to an invisible endpoint below.

### Activation Bar Style

```
fillColor=#dbeafe;strokeColor=#93c5fd;rounded=0;
```

Width: 16px. Position centered on the lifeline x-coordinate.

### Message Styles

**Synchronous call:**
```
html=1;strokeColor=#94a3b8;strokeWidth=1.5;fontFamily=Inter;fontSize=11;fontColor=#0f172a;endArrow=blockThin;endFill=1;rounded=0;
```

**Return / Response:**
```
html=1;strokeColor=#cbd5e1;strokeWidth=1.5;dashed=1;dashPattern=8 4;fontFamily=Inter;fontSize=11;fontColor=#64748b;endArrow=blockThin;endFill=1;rounded=0;
```

**Async message:**
```
html=1;strokeColor=#94a3b8;strokeWidth=1.5;fontFamily=Inter;fontSize=11;fontColor=#0f172a;endArrow=open;endFill=0;rounded=0;
```

### Layout

- Participants: y=40, spaced 160px apart horizontally
- First message: y=120
- Subsequent messages: y increments by 50–60px
- Activation bars: start at message y, height = processing duration

### Template Snippet: Two Participants

```xml
<!-- Participant: Client -->
<mxCell id="participant_client" value="Client" style="rounded=1;whiteSpace=wrap;html=1;arcSize=20;fillColor=#f1f5f9;strokeColor=#e2e8f0;fontColor=#0f172a;fontFamily=Inter;fontSize=13;fontStyle=1;align=center;verticalAlign=middle;" vertex="1" parent="1">
  <mxGeometry x="100" y="40" width="120" height="50" as="geometry" />
</mxCell>

<!-- Participant: API Server -->
<mxCell id="participant_api" value="API Server" style="rounded=1;whiteSpace=wrap;html=1;arcSize=20;fillColor=#0f172a;strokeColor=#0f172a;fontColor=#ffffff;fontFamily=Inter;fontSize=13;fontStyle=1;align=center;verticalAlign=middle;" vertex="1" parent="1">
  <mxGeometry x="340" y="40" width="120" height="50" as="geometry" />
</mxCell>

<!-- Lifeline: Client (dashed vertical line) -->
<mxCell id="lifeline_client" style="html=1;points=[];perimeter=orthogonalPerimeter;strokeColor=#cbd5e1;strokeWidth=1;dashed=1;dashPattern=8 4;" edge="1" parent="1">
  <mxGeometry relative="1" as="geometry">
    <mxPoint x="160" y="90" as="sourcePoint" />
    <mxPoint x="160" y="400" as="targetPoint" />
  </mxGeometry>
</mxCell>

<!-- Lifeline: API -->
<mxCell id="lifeline_api" style="html=1;points=[];perimeter=orthogonalPerimeter;strokeColor=#cbd5e1;strokeWidth=1;dashed=1;dashPattern=8 4;" edge="1" parent="1">
  <mxGeometry relative="1" as="geometry">
    <mxPoint x="400" y="90" as="sourcePoint" />
    <mxPoint x="400" y="400" as="targetPoint" />
  </mxGeometry>
</mxCell>

<!-- Message: POST /login -->
<mxCell id="msg_login" value="POST /login" style="html=1;strokeColor=#94a3b8;strokeWidth=1.5;fontFamily=Inter;fontSize=11;fontColor=#0f172a;endArrow=blockThin;endFill=1;rounded=0;" edge="1" parent="1">
  <mxGeometry relative="1" as="geometry">
    <mxPoint x="160" y="130" as="sourcePoint" />
    <mxPoint x="400" y="130" as="targetPoint" />
  </mxGeometry>
</mxCell>

<!-- Return: 200 OK + token -->
<mxCell id="msg_login_return" value="200 OK + token" style="html=1;strokeColor=#cbd5e1;strokeWidth=1.5;dashed=1;dashPattern=8 4;fontFamily=Inter;fontSize=11;fontColor=#64748b;endArrow=blockThin;endFill=1;rounded=0;" edge="1" parent="1">
  <mxGeometry relative="1" as="geometry">
    <mxPoint x="400" y="180" as="sourcePoint" />
    <mxPoint x="160" y="180" as="targetPoint" />
  </mxGeometry>
</mxCell>
```

---

## Activity Diagram

Activity diagrams are essentially enhanced flowcharts. Use the same patterns from `decision-flow.md` with these additions:

### Extra Elements

| Element | Shape | Style |
|---|---|---|
| **Initial node** (filled circle) | `shape=ellipse;fillColor=#0f172a;strokeColor=#0f172a;` | Size: 24×24 |
| **Final node** (bullseye) | `shape=doubleCircle;fillColor=#0f172a;strokeColor=#0f172a;` | Size: 28×28 |
| **Fork/Join bar** | `fillColor=#0f172a;strokeColor=#0f172a;rounded=0;` | Size: 200×6 (horizontal) or 6×200 (vertical) |
| **Swimlanes** | Use Group/Container style from style-guide | Label with actor/role name |
| **Action node** | Same as Process node from decision-flow | Rounded rectangle |
| **Decision/Merge** | Same as Decision diamond | Use for both split and rejoin |

### Parallel Flow (Fork/Join)

```xml
<!-- Fork Bar -->
<mxCell id="fork_bar" value="" style="fillColor=#0f172a;strokeColor=#0f172a;rounded=0;" vertex="1" parent="1">
  <mxGeometry x="200" y="200" width="200" height="6" as="geometry" />
</mxCell>
```

After the fork bar, draw parallel paths downward from different x-positions, then converge at a join bar with the same style.

---

## State Machine Diagram

### Structure

- **States** as rounded rectangles with state name
- **Transitions** as labeled arrows between states
- **Initial state** as filled circle (same as activity initial)
- **Final state** as bullseye (same as activity final)

### State Node Style

```
rounded=1;whiteSpace=wrap;html=1;arcSize=20;fillColor=#f1f5f9;strokeColor=#e2e8f0;fontColor=#0f172a;fontFamily=Inter;fontSize=12;fontStyle=1;align=center;verticalAlign=top;spacingTop=8;spacingBottom=4;spacingLeft=8;spacingRight=8;
```

For states with internal actions, use HTML in the value:

```xml
<mxCell id="state_processing" value="&lt;b&gt;Processing&lt;/b&gt;&lt;br&gt;&lt;hr size='1' style='border:none;border-top:1px solid #e2e8f0;margin:4px 0;'&gt;&lt;font color='#64748b' style='font-size:11px'&gt;entry / startTimer()&lt;br&gt;do / processQueue()&lt;br&gt;exit / stopTimer()&lt;/font&gt;" ... />
```

### Transition Edge Style

Same as Standard Connector from style-guide, with the guard condition as the edge label:

```
value="[condition] / action()"
```

### Active / Current State (Accent)

Use Accent Node style to highlight the current or key state:
```
rounded=1;whiteSpace=wrap;html=1;arcSize=20;fillColor=#2563eb;strokeColor=#1d4ed8;fontColor=#ffffff;fontFamily=Inter;fontSize=12;fontStyle=1;...
```

---

## Component / Architecture Diagram

### Structure

High-level system view showing:
- **Components** as larger rounded rectangles (or with the UML component icon)
- **Interfaces** as small circles or lollipop notation
- **Dependencies** as dashed arrows
- **Containers/Boundaries** as swimlanes grouping components by deployment context

### Component Style

```
rounded=1;whiteSpace=wrap;html=1;arcSize=12;fillColor=#f1f5f9;strokeColor=#e2e8f0;fontColor=#0f172a;fontFamily=Inter;fontSize=13;fontStyle=1;align=center;verticalAlign=middle;spacingTop=8;spacingBottom=8;spacingLeft=12;spacingRight=12;shadow=0;
```

For the UML component icon (tab notation):
```
shape=component;align=left;spacingLeft=36;rounded=1;arcSize=12;fillColor=#f1f5f9;strokeColor=#e2e8f0;fontColor=#0f172a;fontFamily=Inter;fontSize=13;fontStyle=1;
```

### Boundary / Deployment Container

```
swimlane;whiteSpace=wrap;html=1;startSize=36;fillColor=#f8fafc;swimlaneLine=1;strokeColor=#e2e8f0;fontColor=#0f172a;fontFamily=Inter;fontSize=14;fontStyle=1;rounded=1;arcSize=6;collapsible=0;dashed=1;dashPattern=8 4;
```

Use dashed borders for deployment boundaries (e.g., "Cloud", "On-Prem", "Browser").

### External System Style (Muted)

```
rounded=1;whiteSpace=wrap;html=1;arcSize=12;fillColor=#f8fafc;strokeColor=#cbd5e1;fontColor=#64748b;fontFamily=Inter;fontSize=12;fontStyle=2;align=center;verticalAlign=middle;dashed=1;dashPattern=8 4;
```

---

## Tips

1. **Consistent ID naming** — Prefix IDs by diagram type: `class_`, `seq_`, `state_`, `comp_`
2. **Interface vs Implementation** — For class diagrams, use `«interface»` as a stereotype label above the class name in the header
3. **Sequence diagram — keep it focused** — Show one scenario per diagram rather than trying to capture every edge case
4. **State machines — guard conditions** — Always label transitions with `[guard] / action` format
5. **Component diagrams — label protocols** — Annotate edges with the protocol or API type (REST, gRPC, WebSocket, SQL)
6. **Don't overload** — If a diagram has more than ~15 nodes, consider splitting into multiple focused diagrams
7. **Legend** — For complex diagrams, add a small legend in the corner using Note/Annotation nodes explaining the color/shape semantics
