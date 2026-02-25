# Decision Flow & Flowchart Diagrams

Reference for generating decision flows, process flowcharts, approval workflows, and branching logic diagrams.

## Table of Contents

1. [When to Use](#when-to-use)
2. [Node Mapping](#node-mapping)
3. [Layout Strategy](#layout-strategy)
4. [Template: Basic Decision Flow](#template-basic-decision-flow)
5. [Pattern: Multi-Branch Decision](#pattern-multi-branch-decision)
6. [Pattern: Loop / Retry](#pattern-loop--retry)
7. [Tips](#tips)

---

## When to Use

- Feature logic documentation ("if user is authenticated, then…")
- Approval or review workflows
- Error handling flows
- Onboarding / signup funnels
- Algorithm step-by-step visualization
- Business rule documentation

---

## Node Mapping

Map user concepts to visual elements:

| Concept | Shape | Style Reference (from style-guide.md) |
|---|---|---|
| Start / End | Terminal (pill) | Primary Node or Terminal/Pill |
| Process / Action | Rounded rectangle | Process / Action Node (Secondary) |
| Decision / Condition | Diamond | Decision / Diamond |
| Key / Important step | Rounded rectangle | Accent Node |
| Success outcome | Rounded rectangle | Success State |
| Error / Failure outcome | Rounded rectangle | Error / Destructive State |
| Warning / Caution | Rounded rectangle | Warning State |
| Note / Comment | Note shape | Note / Annotation |
| Grouped steps | Swimlane container | Group / Container |

| Connection | Style Reference |
|---|---|
| Normal flow | Standard Connector |
| Main / happy path | Primary / Emphasized Connector |
| Yes / true branch | Success Path |
| No / false branch | Error Path |
| Optional / fallback | Dashed / Optional Connector |

---

## Layout Strategy

### Top-to-Bottom (Default)

Best for sequential flows with branching:

```
        [Start]
           |
      <Decision?>
       /       \
    [Yes]     [No]
      |         |
   [Action]  [Action]
      \       /
       [Merge]
          |
        [End]
```

- Center the main (happy) path vertically
- Branch decisions left (Yes/success) and right (No/error), or use the convention that makes most sense
- Rejoin branches when they converge
- x-coordinates: center at 400, left branch at 200, right branch at 600
- y-coordinates: increment by 100–120 per row

### Left-to-Right

Better for timeline-oriented or pipeline flows:

- Participants/stages flow left → right
- Decisions branch up (Yes) and down (No)
- x-coordinates: increment by 220 per column
- y-coordinates: center at 300, up branch at 150, down branch at 450

---

## Template: Basic Decision Flow

A complete, minimal decision flow. Copy and adapt.

```xml
<mxfile host="app.diagrams.net" type="device">
  <diagram id="decision-flow-1" name="Decision Flow">
    <mxGraphModel dx="1200" dy="800" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="1169" pageHeight="827">
      <root>
        <mxCell id="0" />
        <mxCell id="1" parent="0" />

        <!-- Start -->
        <mxCell id="node_start" value="Start" style="shape=mxgraph.flowchart.terminator;whiteSpace=wrap;html=1;fillColor=#0f172a;strokeColor=#0f172a;fontColor=#ffffff;fontFamily=Inter;fontSize=13;fontStyle=1;align=center;verticalAlign=middle;" vertex="1" parent="1">
          <mxGeometry x="330" y="40" width="140" height="40" as="geometry" />
        </mxCell>

        <!-- Process Step -->
        <mxCell id="node_process1" value="Process Input" style="rounded=1;whiteSpace=wrap;html=1;arcSize=20;fillColor=#f1f5f9;strokeColor=#e2e8f0;fontColor=#0f172a;fontFamily=Inter;fontSize=12;fontStyle=0;align=center;verticalAlign=middle;spacingTop=4;spacingBottom=4;spacingLeft=8;spacingRight=8;" vertex="1" parent="1">
          <mxGeometry x="310" y="120" width="180" height="50" as="geometry" />
        </mxCell>

        <!-- Decision -->
        <mxCell id="decision_valid" value="Is Valid?" style="rhombus;whiteSpace=wrap;html=1;fillColor=#dbeafe;strokeColor=#93c5fd;fontColor=#1e40af;fontFamily=Inter;fontSize=12;fontStyle=0;align=center;verticalAlign=middle;spacingTop=2;spacingBottom=2;spacingLeft=4;spacingRight=4;" vertex="1" parent="1">
          <mxGeometry x="330" y="210" width="140" height="80" as="geometry" />
        </mxCell>

        <!-- Yes Path -->
        <mxCell id="node_success" value="Continue" style="rounded=1;whiteSpace=wrap;html=1;arcSize=20;fillColor=#dcfce7;strokeColor=#86efac;fontColor=#166534;fontFamily=Inter;fontSize=12;fontStyle=0;align=center;verticalAlign=middle;spacingTop=4;spacingBottom=4;spacingLeft=8;spacingRight=8;" vertex="1" parent="1">
          <mxGeometry x="160" y="340" width="180" height="50" as="geometry" />
        </mxCell>

        <!-- No Path -->
        <mxCell id="node_error" value="Show Error" style="rounded=1;whiteSpace=wrap;html=1;arcSize=20;fillColor=#fee2e2;strokeColor=#fca5a5;fontColor=#991b1b;fontFamily=Inter;fontSize=12;fontStyle=0;align=center;verticalAlign=middle;spacingTop=4;spacingBottom=4;spacingLeft=8;spacingRight=8;" vertex="1" parent="1">
          <mxGeometry x="460" y="340" width="180" height="50" as="geometry" />
        </mxCell>

        <!-- End -->
        <mxCell id="node_end" value="End" style="shape=mxgraph.flowchart.terminator;whiteSpace=wrap;html=1;fillColor=#0f172a;strokeColor=#0f172a;fontColor=#ffffff;fontFamily=Inter;fontSize=13;fontStyle=1;align=center;verticalAlign=middle;" vertex="1" parent="1">
          <mxGeometry x="330" y="440" width="140" height="40" as="geometry" />
        </mxCell>

        <!-- Edges -->
        <mxCell id="edge_start_process" style="edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#94a3b8;strokeWidth=1.5;fontFamily=Inter;fontSize=11;fontColor=#64748b;endArrow=blockThin;endFill=1;" edge="1" source="node_start" target="node_process1" parent="1" />

        <mxCell id="edge_process_decision" style="edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#94a3b8;strokeWidth=1.5;fontFamily=Inter;fontSize=11;fontColor=#64748b;endArrow=blockThin;endFill=1;" edge="1" source="node_process1" target="decision_valid" parent="1" />

        <mxCell id="edge_yes" value="Yes" style="edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#22c55e;strokeWidth=1.5;fontFamily=Inter;fontSize=11;fontColor=#166534;endArrow=blockThin;endFill=1;" edge="1" source="decision_valid" target="node_success" parent="1" />

        <mxCell id="edge_no" value="No" style="edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#ef4444;strokeWidth=1.5;fontFamily=Inter;fontSize=11;fontColor=#991b1b;endArrow=blockThin;endFill=1;" edge="1" source="decision_valid" target="node_error" parent="1" />

        <mxCell id="edge_success_end" style="edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#94a3b8;strokeWidth=1.5;fontFamily=Inter;fontSize=11;fontColor=#64748b;endArrow=blockThin;endFill=1;" edge="1" source="node_success" target="node_end" parent="1" />

        <mxCell id="edge_error_end" style="edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#94a3b8;strokeWidth=1.5;fontFamily=Inter;fontSize=11;fontColor=#64748b;endArrow=blockThin;endFill=1;" edge="1" source="node_error" target="node_end" parent="1" />

      </root>
    </mxGraphModel>
  </diagram>
</mxfile>
```

---

## Pattern: Multi-Branch Decision

When a decision has more than 2 outcomes (e.g., switch/case, role-based routing):

- Use a single diamond with multiple outgoing edges
- Spread branches evenly: left, center, right (for 3 paths)
- For 4+ branches, use a horizontal row below the diamond
- Label every edge with the condition value
- Color-code by semantics: success=green, error=red, neutral=default gray

```
         <Role?>
        /   |   \
   [Admin] [User] [Guest]
```

---

## Pattern: Loop / Retry

For retry or iterative logic:

- Show the forward flow normally
- Add a curved-back edge from the retry point back to an earlier node
- Use dashed style for the retry connector
- Label with retry condition (e.g., "Retry (max 3)")
- Add a note annotation showing max retries or timeout

```
   [Attempt Request]
         |
     <Success?>
      /       \
  [Done]    [Wait] ----dashed----> [Attempt Request]
```

Use `exitX`, `exitY`, `entryX`, `entryY` on the mxCell geometry to control where edges connect:

```xml
<mxCell id="edge_retry" value="Retry"
  style="edgeStyle=orthogonalEdgeStyle;rounded=1;...;dashed=1;dashPattern=8 4;strokeColor=#cbd5e1;"
  edge="1" source="node_wait" target="node_attempt" parent="1">
  <mxGeometry relative="1" as="geometry">
    <Array as="points">
      <mxPoint x="700" y="250" />
      <mxPoint x="700" y="120" />
    </Array>
  </mxGeometry>
</mxCell>
```

---

## Tips

1. **Label every decision branch** — Never leave a decision edge unlabeled
2. **Highlight the happy path** — Use the Primary/Emphasized connector for the main success path
3. **Limit width** — Keep diagrams under 1000px wide for readability
4. **Merge before ending** — If multiple branches lead to the same outcome, merge them into a single node before the end terminal
5. **Use notes sparingly** — Add annotation notes for non-obvious business rules or edge cases
6. **Semantic coloring** — Let color tell the story: green paths are good, red paths are failures, blue diamonds are questions
