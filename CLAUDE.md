# WebUIProd

## Project Overview
This is a migration project. We are rebuilding legacy ColdFusion (.cfm) server-rendered pages 
into a modern touch-first manufacturing UI using Vite + React + TypeScript + shadcn/ui + Tailwind.

Workers use touchscreens on a production floor to view work orders and enter production quantities. 
Every UI element must be large enough for finger/glove taps (min 48px interactive targets).

## Tech Stack
- **Frontend:** Vite + React + TypeScript + shadcn/ui + Tailwind CSS (latest stable)
- **Backend:** Adobe ColdFusion — simple .cfm files returning JSON (no formal API framework)
- **Testing:** Vitest + React Testing Library
- **Package Manager:** npm

## Project Structure
```
project-root/
├── ai/skills/              ← AI skills (auto-discovered, DO NOT MODIFY)
├── docs/                   ← Obsidian vault: feature docs + migration TODO
│   ├── SOURCE_FEATURES/
│   └── MIGRATION_TODO.md
├── queries/                ← New .cfm endpoints (deployed manually to CF server)
├── src/
│   ├── old/                ← Legacy .cfm files (READ-ONLY reference)
│   ├── api/                ← Fetch wrappers for .cfm endpoints
│   ├── components/
│   │   ├── ui/             ← shadcn/ui (auto-generated, do not manually edit)
│   │   └── shared/         ← Custom shared components
│   ├── constants/
│   │   └── widths.ts       ← ALL width definitions (never use inline w-[Xpx])
│   ├── features/           ← One folder per screen (feature-based organization)
│   ├── hooks/              ← Shared custom hooks
│   ├── lib/                ← Utilities (cn, etc.)
│   ├── test/               ← Test setup, mocks, utilities
│   └── types/              ← Shared TypeScript types
├── package.json
├── tsconfig.json
├── vite.config.ts
└── vitest.config.ts
```

## Skills
Always read the relevant skill from `ai/skills/` BEFORE doing work:
- **webui-feature-migration** — migration workflow (document → plan → execute → test → approve)
- **vite-react-shadcn** — frontend component patterns, touch UI, Tailwind conventions
- **vitest-testing** — test patterns and migration test-then-approve workflow
- **coldfusion-api** — .cfm endpoint patterns (JSON, CORS, stored procedures)

## Critical Conventions
1. **Width constants** — ALL column/element widths go in `src/constants/widths.ts`. Never put `w-[Xpx]` inline in JSX.
2. **Touch targets** — minimum 48px height for buttons/inputs, 56px for table rows, gap-3 between tappables.
3. **ColdFusion endpoints** — always return `{ success, data, message/error }`, always include CORS headers, use stored procedures not inline SQL.
4. **Feature codes** — every feature is identified as `SXXX-XX-FXXX` (screen-section-feature).
5. **Git commits** — use `feat(S001-02-F001): description` format. One commit per feature. One branch per screen.
6. **Testing** — every migrated feature must pass Vitest tests before it can be approved.

## Browser Testing
- **Do NOT** use Playwright MCP or BrowserTools MCP unless the user explicitly asks you to open the browser.
- The user will test UI changes themselves. Only use browser tools when the user requests it.

## ColdFusion Notes
- The CF server is shared with the existing WebUI project
- .cfm endpoint files go in `queries/` and are manually deployed
- Use bracket notation for struct keys to preserve JSON casing: `response["success"]` not `response.success`
- Always wrap logic in try/catch to prevent HTML error pages leaking into JSON responses
