# shadcn/Tailwind Style Guide for Draw.io

This file defines the complete visual language for all Draw.io diagrams. Every diagram type references these tokens.

## Table of Contents

1. [Color Palette](#color-palette)
2. [Typography](#typography)
3. [Node Style Strings](#node-style-strings)
4. [Edge Style Strings](#edge-style-strings)
5. [Spacing & Geometry](#spacing--geometry)
6. [Dark Mode Variant](#dark-mode-variant)

---

## Color Palette

Based on shadcn/ui design tokens mapped to hex values for Draw.io.

### Neutrals (Slate)

| Token | Hex | Usage |
|---|---|---|
| slate-50 | `#f8fafc` | Page background, subtle fills |
| slate-100 | `#f1f5f9` | Secondary card backgrounds |
| slate-200 | `#e2e8f0` | Borders, dividers |
| slate-300 | `#cbd5e1` | Muted borders, disabled states |
| slate-400 | `#94a3b8` | Placeholder text, annotations |
| slate-500 | `#64748b` | Secondary text |
| slate-600 | `#475569` | Body text (on light bg) |
| slate-700 | `#334155` | Strong secondary text |
| slate-800 | `#1e293b` | Dark backgrounds |
| slate-900 | `#0f172a` | Primary text, headings |
| slate-950 | `#020617` | Deepest background |

### Semantic Colors

| Role | Fill | Border | Text | Usage |
|---|---|---|---|---|
| **Primary** | `#0f172a` (slate-900) | `#0f172a` | `#ffffff` | Primary actions, start/end nodes |
| **Secondary** | `#f1f5f9` (slate-100) | `#e2e8f0` (slate-200) | `#0f172a` | Standard process nodes |
| **Accent** | `#2563eb` (blue-600) | `#1d4ed8` (blue-700) | `#ffffff` | Key decision paths, highlights |
| **Accent Light** | `#dbeafe` (blue-100) | `#93c5fd` (blue-300) | `#1e40af` (blue-800) | Soft accent backgrounds |
| **Success** | `#dcfce7` (green-100) | `#86efac` (green-300) | `#166534` (green-800) | Yes/true paths, success states |
| **Destructive** | `#fee2e2` (red-100) | `#fca5a5` (red-300) | `#991b1b` (red-800) | No/false paths, error states |
| **Warning** | `#fef9c3` (yellow-100) | `#fde047` (yellow-300) | `#854d0e` (yellow-800) | Warnings, attention needed |
| **Muted** | `#f8fafc` (slate-50) | `#cbd5e1` (slate-300) | `#64748b` (slate-500) | Annotations, notes, comments |

### Table/ERD Specific

| Role | Fill | Border | Text |
|---|---|---|---|
| **Table Header** | `#0f172a` (slate-900) | `#0f172a` | `#ffffff` |
| **Table Body** | `#ffffff` | `#e2e8f0` (slate-200) | `#0f172a` (slate-900) |
| **PK Column** | `#f1f5f9` (slate-100) | `#e2e8f0` | `#0f172a` |
| **FK Indicator** | — | — | `#2563eb` (blue-600) |

---

## Typography

Draw.io font settings for the shadcn look:

| Element | Font Family | Size | Weight | Color |
|---|---|---|---|---|
| Diagram title | Inter, sans-serif | 18px | Bold | slate-900 `#0f172a` |
| Node heading | Inter, sans-serif | 14px | Bold | Depends on fill |
| Node body text | Inter, sans-serif | 12px | Normal | Depends on fill |
| Edge label | Inter, sans-serif | 11px | Normal | slate-500 `#64748b` |
| Annotation/note | Inter, sans-serif | 11px | Italic | slate-400 `#94a3b8` |
| Table header | Inter, sans-serif | 13px | Bold | `#ffffff` |
| Table row | Inter, sans-serif | 12px | Normal | slate-900 `#0f172a` |

**Draw.io font string**: `fontFamily=Inter;` — If Inter is unavailable in the user's environment, it falls back gracefully to system sans-serif.

---

## Node Style Strings

Copy-paste ready Draw.io style strings. These go in the `style` attribute of `<mxCell>`.

### Process / Action Node (Secondary)

```
rounded=1;whiteSpace=wrap;html=1;arcSize=20;fillColor=#f1f5f9;strokeColor=#e2e8f0;fontColor=#0f172a;fontFamily=Inter;fontSize=12;fontStyle=0;align=center;verticalAlign=middle;spacingTop=4;spacingBottom=4;spacingLeft=8;spacingRight=8;
```

### Primary Node (Start / End / Key Action)

```
rounded=1;whiteSpace=wrap;html=1;arcSize=20;fillColor=#0f172a;strokeColor=#0f172a;fontColor=#ffffff;fontFamily=Inter;fontSize=13;fontStyle=1;align=center;verticalAlign=middle;spacingTop=4;spacingBottom=4;spacingLeft=8;spacingRight=8;
```

### Decision / Diamond

```
rhombus;whiteSpace=wrap;html=1;fillColor=#dbeafe;strokeColor=#93c5fd;fontColor=#1e40af;fontFamily=Inter;fontSize=12;fontStyle=0;align=center;verticalAlign=middle;spacingTop=2;spacingBottom=2;spacingLeft=4;spacingRight=4;
```

### Accent Node (Highlighted Step)

```
rounded=1;whiteSpace=wrap;html=1;arcSize=20;fillColor=#2563eb;strokeColor=#1d4ed8;fontColor=#ffffff;fontFamily=Inter;fontSize=12;fontStyle=1;align=center;verticalAlign=middle;spacingTop=4;spacingBottom=4;spacingLeft=8;spacingRight=8;
```

### Success State

```
rounded=1;whiteSpace=wrap;html=1;arcSize=20;fillColor=#dcfce7;strokeColor=#86efac;fontColor=#166534;fontFamily=Inter;fontSize=12;fontStyle=0;align=center;verticalAlign=middle;spacingTop=4;spacingBottom=4;spacingLeft=8;spacingRight=8;
```

### Error / Destructive State

```
rounded=1;whiteSpace=wrap;html=1;arcSize=20;fillColor=#fee2e2;strokeColor=#fca5a5;fontColor=#991b1b;fontFamily=Inter;fontSize=12;fontStyle=0;align=center;verticalAlign=middle;spacingTop=4;spacingBottom=4;spacingLeft=8;spacingRight=8;
```

### Warning State

```
rounded=1;whiteSpace=wrap;html=1;arcSize=20;fillColor=#fef9c3;strokeColor=#fde047;fontColor=#854d0e;fontFamily=Inter;fontSize=12;fontStyle=0;align=center;verticalAlign=middle;spacingTop=4;spacingBottom=4;spacingLeft=8;spacingRight=8;
```

### Note / Annotation

```
shape=note;whiteSpace=wrap;html=1;size=14;fillColor=#f8fafc;strokeColor=#cbd5e1;fontColor=#94a3b8;fontFamily=Inter;fontSize=11;fontStyle=2;align=left;verticalAlign=top;spacingTop=8;spacingBottom=8;spacingLeft=10;spacingRight=10;strokeWidth=1;dashed=1;dashPattern=8 4;
```

### Group / Container (Swimlane)

```
swimlane;whiteSpace=wrap;html=1;startSize=32;fillColor=#f8fafc;swimlaneLine=1;strokeColor=#e2e8f0;fontColor=#0f172a;fontFamily=Inter;fontSize=13;fontStyle=1;rounded=1;arcSize=8;collapsible=0;
```

### Terminal / Pill (Start/End for Flowcharts)

```
shape=mxgraph.flowchart.terminator;whiteSpace=wrap;html=1;fillColor=#0f172a;strokeColor=#0f172a;fontColor=#ffffff;fontFamily=Inter;fontSize=13;fontStyle=1;align=center;verticalAlign=middle;
```

---

## Edge Style Strings

### Standard Connector

```
edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#94a3b8;strokeWidth=1.5;fontFamily=Inter;fontSize=11;fontColor=#64748b;endArrow=blockThin;endFill=1;
```

### Primary / Emphasized Connector

```
edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#0f172a;strokeWidth=2;fontFamily=Inter;fontSize=11;fontColor=#0f172a;endArrow=blockThin;endFill=1;
```

### Success Path (Yes)

```
edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#22c55e;strokeWidth=1.5;fontFamily=Inter;fontSize=11;fontColor=#166534;endArrow=blockThin;endFill=1;
```

### Error Path (No)

```
edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#ef4444;strokeWidth=1.5;fontFamily=Inter;fontSize=11;fontColor=#991b1b;endArrow=blockThin;endFill=1;
```

### Dashed / Optional Connector

```
edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#cbd5e1;strokeWidth=1.5;dashed=1;dashPattern=8 4;fontFamily=Inter;fontSize=11;fontColor=#94a3b8;endArrow=blockThin;endFill=1;
```

### Association (No Arrow — ERD relationships)

```
edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#94a3b8;strokeWidth=1.5;fontFamily=Inter;fontSize=11;fontColor=#64748b;endArrow=ERone;endFill=0;startArrow=ERmany;startFill=0;
```

### Sequence Diagram Message

```
html=1;strokeColor=#94a3b8;strokeWidth=1.5;fontFamily=Inter;fontSize=11;fontColor=#0f172a;endArrow=blockThin;endFill=1;rounded=0;
```

### Sequence Diagram Return (Dashed)

```
html=1;strokeColor=#cbd5e1;strokeWidth=1.5;dashed=1;dashPattern=8 4;fontFamily=Inter;fontSize=11;fontColor=#64748b;endArrow=blockThin;endFill=1;rounded=0;
```

---

## Spacing & Geometry

### Standard Node Dimensions

| Element | Width | Height |
|---|---|---|
| Process node | 180 | 50 |
| Decision diamond | 140 | 80 |
| Start/End pill | 140 | 40 |
| ERD table | 220 | varies |
| ERD table header row | 220 | 32 |
| ERD table body row | 220 | 26 |
| Sequence participant | 120 | 50 |
| Note/annotation | 200 | 60 |
| Group/container | varies | varies + 32 header |

### Spacing

| Between | Gap |
|---|---|
| Vertical flow nodes | 60–80px |
| Horizontal flow nodes | 80px |
| ERD tables | 40–60px |
| Sequence participants | 160px |
| Swimlane padding | 20px |
| Decision branch labels | offset 10px from edge |

---

## Dark Mode Variant

If the user requests dark mode, swap these tokens:

| Role | Light Fill → Dark Fill | Light Border → Dark Border | Light Text → Dark Text |
|---|---|---|---|
| Page bg | `#ffffff` → `#020617` | — | — |
| Secondary | `#f1f5f9` → `#1e293b` | `#e2e8f0` → `#334155` | `#0f172a` → `#f1f5f9` |
| Primary | `#0f172a` → `#f8fafc` | `#0f172a` → `#f8fafc` | `#ffffff` → `#0f172a` |
| Accent | `#2563eb` → `#3b82f6` | `#1d4ed8` → `#2563eb` | `#ffffff` → `#ffffff` |
| Accent Light | `#dbeafe` → `#1e3a5f` | `#93c5fd` → `#2563eb` | `#1e40af` → `#93c5fd` |
| Edge default | `#94a3b8` | `#475569` | `#64748b` → `#94a3b8` |
| Edge label | — | — | `#64748b` → `#94a3b8` |

Apply by replacing the hex values in the style strings. Keep all other properties identical.
