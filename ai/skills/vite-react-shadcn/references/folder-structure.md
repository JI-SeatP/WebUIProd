# Folder Structure

The WebUIProd `src/` directory follows a feature-based organization with shared layers.

```
src/
├── api/                          ← API call functions
│   ├── client.ts                 ← Base fetch wrapper (apiGet, apiPost)
│   ├── workOrders.ts             ← Work order API functions
│   └── production.ts             ← Production entry API functions
│
├── components/                   ← Shared components
│   ├── ui/                       ← shadcn/ui auto-generated (do not manually edit)
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   ├── table.tsx
│   │   └── ...
│   └── shared/                   ← Custom shared components
│       ├── PageHeader.tsx         ← Consistent page header
│       ├── LoadingSpinner.tsx     ← Loading state
│       ├── ErrorMessage.tsx       ← Error display
│       └── ConfirmDialog.tsx      ← Reusable confirmation dialog
│
├── constants/                    ← App-wide constants
│   ├── widths.ts                 ← All width definitions (WIDTH blocks)
│   └── config.ts                 ← App config (API base URL, etc.)
│
├── features/                     ← Feature modules (one folder per screen)
│   ├── work-orders/
│   │   ├── WorkOrdersPage.tsx    ← Page component (the screen)
│   │   ├── WorkOrderTable.tsx    ← Table component
│   │   ├── WorkOrderDetail.tsx   ← Detail panel
│   │   ├── useWorkOrders.ts      ← Data hook specific to this feature
│   │   └── types.ts              ← Feature-specific types
│   │
│   └── production-entry/
│       ├── ProductionEntryPage.tsx
│       ├── QuantityEntryForm.tsx
│       ├── useProductionEntry.ts
│       └── types.ts
│
├── hooks/                        ← Shared custom hooks
│   ├── useApi.ts                 ← Generic API hook (loading/error states)
│   └── useConfirm.ts             ← Confirmation dialog state management
│
├── lib/                          ← Utility functions
│   └── utils.ts                  ← cn() and other utilities
│
├── types/                        ← Shared TypeScript types
│   ├── index.ts                  ← Common types (ApiResponse, etc.)
│   └── work-order.ts             ← Shared domain types
│
├── App.tsx                       ← Root component with routing
├── main.tsx                      ← Entry point
└── index.css                     ← Tailwind + shadcn CSS variables
```

## Naming Conventions

| Item | Convention | Example |
|------|-----------|---------|
| Page components | `{Name}Page.tsx` | `WorkOrdersPage.tsx` |
| UI components | `PascalCase.tsx` | `WorkOrderTable.tsx` |
| Hooks | `use{Name}.ts` | `useWorkOrders.ts` |
| API files | `camelCase.ts` | `workOrders.ts` |
| Type files | `camelCase.ts` or `types.ts` | `types.ts` |
| Constants | `camelCase.ts` | `widths.ts` |
| Feature folders | `kebab-case/` | `work-orders/` |

## When to Put Code Where

- **Is it a full page/screen?** → `features/{screen}/` as a `Page` component
- **Is it used by multiple features?** → `components/shared/`
- **Is it a shadcn/ui component?** → `components/ui/` (auto-managed, don't manually edit)
- **Is it a data-fetching hook for one feature?** → inside that feature's folder
- **Is it a generic utility hook?** → `hooks/`
- **Is it an API call?** → `api/`
- **Is it a type used across features?** → `types/`
- **Is it a width or config constant?** → `constants/`
