# Database Schema & ERD Diagrams

Reference for generating entity-relationship diagrams, data models, and database schema visualizations.

## Table of Contents

1. [When to Use](#when-to-use)
2. [Table Structure in Draw.io](#table-structure-in-drawio)
3. [Relationship Notation](#relationship-notation)
4. [Layout Strategy](#layout-strategy)
5. [Template: Single Table](#template-single-table)
6. [Template: Two Tables with Relationship](#template-two-tables-with-relationship)
7. [Pattern: Many-to-Many with Junction Table](#pattern-many-to-many)
8. [Tips](#tips)

---

## When to Use

- Database design documentation
- Feature specs that define data models
- API response structure visualization
- Migration planning (before/after schemas)
- Onboarding docs showing system data architecture

---

## Table Structure in Draw.io

Each table is built using Draw.io's `shape=table` or manually stacked cells. The manual approach gives more styling control and is preferred for the shadcn look.

### Manual Table Construction

A table consists of:
1. **Header cell** — Table name, dark fill (slate-900), white text, bold
2. **Row cells** — One per column/field, stacked vertically below the header
3. **Container** — A parent cell that groups header + rows

Each row shows: `icon  column_name    data_type`

Use HTML formatting inside cell values for column details:

```
<b>id</b>  <font color="#64748b">UUID PK</font>
```

### Column Notation Conventions

| Symbol | Meaning |
|---|---|
| 🔑 or **PK** | Primary Key |
| 🔗 or **FK** | Foreign Key |
| ⚡ or **IDX** | Indexed |
| ❗ or **NN** | Not Null |
| `?` suffix | Nullable |

For clean rendering in Draw.io, use text labels rather than emoji:

```
PK  id          UUID
FK  user_id     UUID
    name        VARCHAR(255)
    created_at  TIMESTAMP
```

---

## Relationship Notation

### Crow's Foot (Recommended)

Draw.io supports ERD arrows natively:

| Cardinality | startArrow | endArrow |
|---|---|---|
| One-to-One | `ERone` | `ERone` |
| One-to-Many | `ERone` | `ERmany` |
| Many-to-One | `ERmany` | `ERone` |
| Many-to-Many | `ERmany` | `ERmany` |
| One (mandatory) | `ERmandOne` | — |
| Zero or One | `ERzeroToOne` | — |
| Zero or Many | `ERzeroToMany` | — |
| One or Many | `ERoneToMany` | — |

### Relationship Edge Style

```
edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#94a3b8;strokeWidth=1.5;fontFamily=Inter;fontSize=11;fontColor=#64748b;endArrow=ERmany;endFill=0;startArrow=ERone;startFill=0;
```

Adjust `startArrow` and `endArrow` per cardinality.

---

## Layout Strategy

### Grid Layout (Default)

- Arrange tables in a grid pattern
- Place heavily-related tables adjacent
- Main/central entity in the center
- Supporting/lookup tables on the periphery
- 60px gap between tables minimum

### Hierarchical Layout

For tree-like schemas (user → orders → items):
- Parent tables at top, children below
- FK relationships flow top-to-bottom
- Junction tables between the entities they connect

---

## Template: Single Table

A single database table with header and field rows:

```xml
<mxfile host="app.diagrams.net" type="device">
  <diagram id="erd-single" name="Users Table">
    <mxGraphModel dx="1200" dy="800" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="1169" pageHeight="827">
      <root>
        <mxCell id="0" />
        <mxCell id="1" parent="0" />

        <!-- Table Container -->
        <mxCell id="table_users" value="" style="shape=table;startSize=0;container=1;collapsible=0;childLayout=tableLayout;fixedRows=1;rowLines=1;fontStyle=0;strokeColor=#e2e8f0;fillColor=#ffffff;rounded=1;arcSize=8;overflow=hidden;whiteSpace=wrap;html=1;shadow=0;" vertex="1" parent="1">
          <mxGeometry x="100" y="100" width="240" height="188" as="geometry" />
        </mxCell>

        <!-- Header Row -->
        <mxCell id="users_header" value="" style="shape=tableRow;horizontal=0;startSize=0;swimlaneHead=0;swimlaneBody=0;fillColor=#0f172a;collapsible=0;dropTarget=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;fontSize=13;fontStyle=1;strokeColor=#0f172a;fontColor=#ffffff;" vertex="1" parent="table_users">
          <mxGeometry width="240" height="32" as="geometry" />
        </mxCell>
        <mxCell id="users_header_c1" value="users" style="shape=partialRectangle;connectable=0;fillColor=#0f172a;top=0;left=0;bottom=0;right=0;fontStyle=1;overflow=hidden;whiteSpace=wrap;html=1;fontFamily=Inter;fontSize=13;fontColor=#ffffff;strokeColor=#0f172a;align=left;spacingLeft=10;" vertex="1" parent="users_header">
          <mxGeometry width="240" height="32" as="geometry"><mxPoint y="0" as="offset" /></mxGeometry>
        </mxCell>

        <!-- Row: id -->
        <mxCell id="users_row_id" value="" style="shape=tableRow;horizontal=0;startSize=0;swimlaneHead=0;swimlaneBody=0;fillColor=#f1f5f9;collapsible=0;dropTarget=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;fontSize=12;strokeColor=#e2e8f0;" vertex="1" parent="table_users">
          <mxGeometry y="32" width="240" height="26" as="geometry" />
        </mxCell>
        <mxCell id="users_row_id_c1" value="&lt;b&gt;PK&lt;/b&gt;  id" style="shape=partialRectangle;connectable=0;fillColor=#f1f5f9;top=0;left=0;bottom=0;right=0;overflow=hidden;whiteSpace=wrap;html=1;fontFamily=Inter;fontSize=12;fontColor=#0f172a;strokeColor=#e2e8f0;align=left;spacingLeft=10;" vertex="1" parent="users_row_id">
          <mxGeometry width="140" height="26" as="geometry"><mxPoint y="0" as="offset" /></mxGeometry>
        </mxCell>
        <mxCell id="users_row_id_c2" value="UUID" style="shape=partialRectangle;connectable=0;fillColor=#f1f5f9;top=0;left=0;bottom=0;right=0;overflow=hidden;whiteSpace=wrap;html=1;fontFamily=Inter;fontSize=11;fontColor=#64748b;strokeColor=#e2e8f0;align=right;spacingRight=10;" vertex="1" parent="users_row_id">
          <mxGeometry x="140" width="100" height="26" as="geometry"><mxPoint y="0" as="offset" /></mxGeometry>
        </mxCell>

        <!-- Row: email -->
        <mxCell id="users_row_email" value="" style="shape=tableRow;horizontal=0;startSize=0;swimlaneHead=0;swimlaneBody=0;fillColor=#ffffff;collapsible=0;dropTarget=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;fontSize=12;strokeColor=#e2e8f0;" vertex="1" parent="table_users">
          <mxGeometry y="58" width="240" height="26" as="geometry" />
        </mxCell>
        <mxCell id="users_row_email_c1" value="    email" style="shape=partialRectangle;connectable=0;fillColor=#ffffff;top=0;left=0;bottom=0;right=0;overflow=hidden;whiteSpace=wrap;html=1;fontFamily=Inter;fontSize=12;fontColor=#0f172a;strokeColor=#e2e8f0;align=left;spacingLeft=10;" vertex="1" parent="users_row_email">
          <mxGeometry width="140" height="26" as="geometry"><mxPoint y="0" as="offset" /></mxGeometry>
        </mxCell>
        <mxCell id="users_row_email_c2" value="VARCHAR" style="shape=partialRectangle;connectable=0;fillColor=#ffffff;top=0;left=0;bottom=0;right=0;overflow=hidden;whiteSpace=wrap;html=1;fontFamily=Inter;fontSize=11;fontColor=#64748b;strokeColor=#e2e8f0;align=right;spacingRight=10;" vertex="1" parent="users_row_email">
          <mxGeometry x="140" width="100" height="26" as="geometry"><mxPoint y="0" as="offset" /></mxGeometry>
        </mxCell>

        <!-- Row: name -->
        <mxCell id="users_row_name" value="" style="shape=tableRow;horizontal=0;startSize=0;swimlaneHead=0;swimlaneBody=0;fillColor=#ffffff;collapsible=0;dropTarget=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;fontSize=12;strokeColor=#e2e8f0;" vertex="1" parent="table_users">
          <mxGeometry y="84" width="240" height="26" as="geometry" />
        </mxCell>
        <mxCell id="users_row_name_c1" value="    name" style="shape=partialRectangle;connectable=0;fillColor=#ffffff;top=0;left=0;bottom=0;right=0;overflow=hidden;whiteSpace=wrap;html=1;fontFamily=Inter;fontSize=12;fontColor=#0f172a;strokeColor=#e2e8f0;align=left;spacingLeft=10;" vertex="1" parent="users_row_name">
          <mxGeometry width="140" height="26" as="geometry"><mxPoint y="0" as="offset" /></mxGeometry>
        </mxCell>
        <mxCell id="users_row_name_c2" value="VARCHAR" style="shape=partialRectangle;connectable=0;fillColor=#ffffff;top=0;left=0;bottom=0;right=0;overflow=hidden;whiteSpace=wrap;html=1;fontFamily=Inter;fontSize=11;fontColor=#64748b;strokeColor=#e2e8f0;align=right;spacingRight=10;" vertex="1" parent="users_row_name">
          <mxGeometry x="140" width="100" height="26" as="geometry"><mxPoint y="0" as="offset" /></mxGeometry>
        </mxCell>

        <!-- Row: created_at -->
        <mxCell id="users_row_created" value="" style="shape=tableRow;horizontal=0;startSize=0;swimlaneHead=0;swimlaneBody=0;fillColor=#ffffff;collapsible=0;dropTarget=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;fontSize=12;strokeColor=#e2e8f0;" vertex="1" parent="table_users">
          <mxGeometry y="110" width="240" height="26" as="geometry" />
        </mxCell>
        <mxCell id="users_row_created_c1" value="    created_at" style="shape=partialRectangle;connectable=0;fillColor=#ffffff;top=0;left=0;bottom=0;right=0;overflow=hidden;whiteSpace=wrap;html=1;fontFamily=Inter;fontSize=12;fontColor=#0f172a;strokeColor=#e2e8f0;align=left;spacingLeft=10;" vertex="1" parent="users_row_created">
          <mxGeometry width="140" height="26" as="geometry"><mxPoint y="0" as="offset" /></mxGeometry>
        </mxCell>
        <mxCell id="users_row_created_c2" value="TIMESTAMP" style="shape=partialRectangle;connectable=0;fillColor=#ffffff;top=0;left=0;bottom=0;right=0;overflow=hidden;whiteSpace=wrap;html=1;fontFamily=Inter;fontSize=11;fontColor=#64748b;strokeColor=#e2e8f0;align=right;spacingRight=10;" vertex="1" parent="users_row_created">
          <mxGeometry x="140" width="100" height="26" as="geometry"><mxPoint y="0" as="offset" /></mxGeometry>
        </mxCell>

        <!-- Row: updated_at -->
        <mxCell id="users_row_updated" value="" style="shape=tableRow;horizontal=0;startSize=0;swimlaneHead=0;swimlaneBody=0;fillColor=#ffffff;collapsible=0;dropTarget=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;fontSize=12;strokeColor=#e2e8f0;" vertex="1" parent="table_users">
          <mxGeometry y="136" width="240" height="26" as="geometry" />
        </mxCell>
        <mxCell id="users_row_updated_c1" value="    updated_at" style="shape=partialRectangle;connectable=0;fillColor=#ffffff;top=0;left=0;bottom=0;right=0;overflow=hidden;whiteSpace=wrap;html=1;fontFamily=Inter;fontSize=12;fontColor=#0f172a;strokeColor=#e2e8f0;align=left;spacingLeft=10;" vertex="1" parent="users_row_updated">
          <mxGeometry width="140" height="26" as="geometry"><mxPoint y="0" as="offset" /></mxGeometry>
        </mxCell>
        <mxCell id="users_row_updated_c2" value="TIMESTAMP" style="shape=partialRectangle;connectable=0;fillColor=#ffffff;top=0;left=0;bottom=0;right=0;overflow=hidden;whiteSpace=wrap;html=1;fontFamily=Inter;fontSize=11;fontColor=#64748b;strokeColor=#e2e8f0;align=right;spacingRight=10;" vertex="1" parent="users_row_updated">
          <mxGeometry x="140" width="100" height="26" as="geometry"><mxPoint y="0" as="offset" /></mxGeometry>
        </mxCell>

      </root>
    </mxGraphModel>
  </diagram>
</mxfile>
```

---

## Template: Two Tables with Relationship

To add a relationship edge between tables, connect to the **row cells** (which have `portConstraint=eastwest` and connection points):

```xml
<!-- Relationship: users.id -> orders.user_id (One-to-Many) -->
<mxCell id="rel_users_orders" value=""
  style="edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#94a3b8;strokeWidth=1.5;fontFamily=Inter;fontSize=11;fontColor=#64748b;endArrow=ERmany;endFill=0;startArrow=ERone;startFill=0;exitX=1;exitY=0.5;exitDx=0;exitDy=0;entryX=0;entryY=0.5;entryDx=0;entryDy=0;"
  edge="1" source="users_row_id" target="orders_row_userid" parent="1" />
```

**Key**: The `source` and `target` must reference the **row** `mxCell` IDs, not the table container — this ensures the edge connects at the correct field.

---

## Pattern: Many-to-Many

Use a junction/pivot table between the two entities:

```
[users] 1──<  >──N [user_roles] N──<  >──1 [roles]
```

- The junction table sits between the two main tables
- It has FK columns referencing both parent tables
- Use `ERone` → `ERmany` on each side

---

## Tips

1. **PK rows get a distinct background** — Use slate-100 (`#f1f5f9`) to visually separate primary keys
2. **FK columns reference with color** — Use blue-600 text for FK column names to indicate they point elsewhere
3. **Group related tables** — Use a light container/swimlane to group tables by domain (e.g., "Auth", "Billing", "Content")
4. **Show indexes** — Add a small `IDX` badge next to indexed columns
5. **Table height formula** — `header(32) + rows(N × 26)` — pre-calculate to avoid overlap
6. **Alternate row colors** — For tables with many rows, alternate between `#ffffff` and `#f8fafc` for readability
