---
name: vite-react-shadcn
description: >
  Best practices for building the WebUIProd frontend with Vite, React, TypeScript, shadcn/ui, and 
  Tailwind CSS (latest stable). This is a touch-first manufacturing UI — large tap targets, clear 
  layouts, and simple interactions are critical. Use this skill whenever the user is building React 
  components, setting up the project, working with shadcn/ui, styling with Tailwind, creating forms 
  or tables, or asking about frontend architecture for the WebUIProd project. Also trigger when 
  the user mentions UI layout, component structure, responsive design, touch interfaces, or 
  accessibility for production floor screens.
---

# Vite + React + shadcn/ui + Tailwind

WebUIProd is a touch-first manufacturing application. Workers interact via touchscreens to view 
work orders and enter production quantities. Every UI decision should prioritize:

1. **Large tap targets** — minimum 48px height for all interactive elements (buttons, inputs, rows)
2. **Clear visual hierarchy** — workers glance at screens between tasks
3. **Simple interactions** — minimal steps to complete an action
4. **Error prevention** — confirmation dialogs for destructive actions, clear validation

## Project Setup

**Read** `references/project-setup-checklist.md` for the full step-by-step initialization 
(Vite scaffolding, TypeScript config, shadcn/ui init, Tailwind CSS-first config, npm packages).

## Folder Structure

**Read** `references/folder-structure.md` for the complete `src/` layout.

Quick summary:
```
src/
├── components/        ← Shared UI components
│   ├── ui/           ← shadcn/ui components (auto-generated)
│   └── shared/       ← Custom shared components
├── features/         ← Feature-based modules (one folder per screen)
│   ├── work-orders/
│   └── production-entry/
├── constants/        ← Width constants, app config
│   └── widths.ts     ← All width definitions (see migration skill)
├── hooks/            ← Custom React hooks
├── lib/              ← Utilities (cn, api client, etc.)
├── types/            ← Shared TypeScript types
└── api/              ← API call functions (fetch wrappers for .cfm endpoints)
```

## Component Patterns

**Read** `references/component-patterns.md` for shadcn/ui composition patterns, form handling 
with react-hook-form + zod, data tables, and dialog patterns.

Key principles:
- Compose shadcn/ui primitives — don't fight the library's patterns
- Forms use `react-hook-form` + `zod` for validation
- All widths come from `src/constants/widths.ts` (see `width-constants-convention.md` in the migration skill)
- Use `cn()` utility from `@/lib/utils` for conditional class merging

## Touch & Manufacturing UI

**Read** `references/touch-manufacturing-ui.md` for the full guide on building for touchscreens 
on the production floor.

Critical rules applied to every component:
- Interactive elements: `min-h-[48px]` and `min-w-[48px]` minimum
- Buttons: use `size="lg"` as default, never `size="sm"` for primary actions
- Table rows: `h-[56px]` minimum for comfortable row tapping
- Input fields: `h-[48px]` with `text-lg` for readability
- Spacing between tap targets: `gap-3` minimum to prevent mis-taps
- Numeric inputs: use `inputMode="numeric"` to trigger numeric keyboard

## Tailwind Conventions

**Read** `references/tailwind-conventions.md` for the CSS variable architecture, `@theme inline` 
config, and custom utility patterns.

Key convention: all column/element widths are centralized in TS constants — 
see `references/width-constants-convention.md` in the migration skill or `src/constants/widths.ts`.
