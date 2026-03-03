---
name: diagram
description: "Generate professional Draw.io (.drawio) diagram files with a modern shadcn/Tailwind-inspired visual style. Use this skill whenever the user asks for diagrams, flowcharts, decision trees, database schemas, ERDs, UML diagrams (class, sequence, activity, state, component), architecture diagrams, system design visuals, or any technical/feature documentation that benefits from a visual diagram. Also trigger when the user says 'draw', 'diagram', 'flowchart', 'schema', 'ERD', 'UML', 'sequence diagram', 'decision flow', 'architecture diagram', 'data model', or asks to visualize code logic, explain a feature visually, or document system relationships. Produces .drawio XML files that open directly in draw.io, diagrams.net, or VS Code with the Draw.io extension."
---

# Draw.io Diagram Generator — shadcn Modern Style

Generate `.drawio` XML files with a cohesive, modern visual style inspired by shadcn/ui and Tailwind CSS design tokens. All diagrams open natively in draw.io, diagrams.net, or VS Code's Draw.io extension.

## Quick Start

1. Identify the diagram type the user needs
2. Read the appropriate reference file for that diagram type (see Diagram Types below)
3. Read `references/style-guide.md` for the shadcn color tokens and style rules
4. Generate the `.drawio` XML file applying the style consistently
5. Save to `/mnt/user-data/outputs/` and present to user

## Diagram Types

| User Request | Reference File | Key Use Cases |
|---|---|---|
| Decision flow, flowchart, logic flow | `references/decision-flow.md` | Feature logic, branching conditions, approval workflows |
| Database schema, ERD, data model | `references/database-schema.md` | Table relationships, entity attributes, foreign keys |
| Class, sequence, activity, state, component | `references/uml-diagrams.md` | Code structure, API interactions, state machines, system components |

**Always read `references/style-guide.md` first** — it contains the foundational color palette, typography, spacing, and style strings shared by all diagram types.

## Core Principles

1. **Consistency** — Every node, edge, and label follows the same design token system
2. **Readability** — Generous padding, clear hierarchy, high contrast text
3. **Professional** — Clean lines, subtle rounded corners, no visual noise
4. **Semantic color** — Use color purposefully: accent for primary flow, muted for secondary, destructive for error paths
 

## File Structure

The generated file is standard Draw.io XML:

```xml
<mxfile host="app.diagrams.net" type="device">
  <diagram id="unique-id" name="Diagram Name">
    <mxGraphModel dx="1200" dy="800" grid="1" gridSize="10"
      guides="1" tooltips="1" connect="1" arrows="1"
      fold="1" page="1" pageScale="1" pageWidth="1169" pageHeight="827">
      <root>
        <mxCell id="0" />
        <mxCell id="1" parent="0" />
        <!-- diagram cells go here -->
      </root>
    </mxGraphModel>
  </diagram>
</mxfile>
```

## Workflow

1. **Understand scope** — Ask clarifying questions if the user's request is ambiguous. Determine how many entities, what relationships, and what level of detail.
2. **Plan layout** — Sketch the topology mentally: top-to-bottom for flows, left-to-right for sequences, grid for ERDs.
3. **Read references** — Load `style-guide.md` + the relevant diagram-type reference.
4. **Generate XML** — Build the `.drawio` file with proper cell IDs, parent references, and geometry.
5. **Deliver** — Save as `.drawio`, present to user with a brief description of what's in the diagram.

## Layout Guidelines

- **Vertical flows**: 80px vertical gap between rows, center-aligned
- **Horizontal sequences**: 60px horizontal gap between participants
- **ERD grids**: 40px gap between tables, group related entities
- **Cell IDs**: Use descriptive IDs when possible (e.g., `node_start`, `decision_auth`, `table_users`)
- **Edge routing**: Use `edgeStyle=orthogonalEdgeStyle` for clean right-angle connectors
- **Grouping**: In order to keep diagrams simple, add detailed logic on separate groups that arre connected to the nodes you want to detail. For example, if a process "PROC A" is simple but has one element that should be detailed, create a group titled "PROC A - Detail" on the side that shows the detail view and connect this group to "PROC A" node.
## Important Notes

- All `.drawio` files must be valid XML — escape special characters in labels (`&amp;`, `&lt;`, `&gt;`)
- Use `<br>` for line breaks inside labels, and HTML formatting for rich text in cells
- Keep font sizes consistent: 14px for headings/titles, 12-13px for body, 11px for annotations
- Always include a title cell or comment indicating what the diagram represents
