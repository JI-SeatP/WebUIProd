# Setup and Configuration

Full Vitest setup for the WebUIProd project.

## Install Dependencies

```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
```

## vitest.config.ts

```typescript
/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["src/features/**", "src/components/**"],
      exclude: ["src/components/ui/**"], // Exclude auto-generated shadcn components
    },
  },
});
```

## Setup File

```typescript
// src/test/setup.ts
import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Cleanup after each test
afterEach(() => {
  cleanup();
});
```

## Package.json Scripts

```json
{
  "scripts": {
    "test": "vitest",
    "test:run": "vitest run",
    "test:coverage": "vitest run --coverage",
    "test:ui": "vitest --ui"
  }
}
```

## File Placement Convention

Tests live alongside the component they test:

```
src/features/work-orders/
├── WorkOrderTable.tsx
├── WorkOrderTable.test.tsx      ← Test file right next to component
├── WorkOrderDetail.tsx
├── WorkOrderDetail.test.tsx
└── useWorkOrders.ts
```

Shared test utilities go in `src/test/`:

```
src/test/
├── setup.ts                     ← Global setup
├── test-utils.tsx               ← Custom render, providers
└── mocks/
    └── handlers.ts              ← MSW handlers (if using MSW)
```

## Custom Render with Providers

If your app uses context providers (router, theme, etc.), create a custom render:

```typescript
// src/test/test-utils.tsx
import { render, RenderOptions } from "@testing-library/react";
import { ReactElement } from "react";

// Add providers your app uses
function AllProviders({ children }: { children: React.ReactNode }) {
  return (
    // Wrap with any providers your components need
    <>{children}</>
  );
}

function customRender(ui: ReactElement, options?: Omit<RenderOptions, "wrapper">) {
  return render(ui, { wrapper: AllProviders, ...options });
}

export * from "@testing-library/react";
export { customRender as render };
```

Then import from `@/test/test-utils` instead of `@testing-library/react` in your tests.

## TypeScript Config for Tests

Add to `tsconfig.json` compilerOptions:

```json
{
  "compilerOptions": {
    "types": ["vitest/globals"]
  }
}
```

This enables `describe`, `it`, `expect`, `vi` without explicit imports when `globals: true` 
is set in the vitest config.
