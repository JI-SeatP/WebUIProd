# Project Setup Checklist

Step-by-step initialization of the WebUIProd project from scratch.

## 1. Scaffold with Vite

```bash
npm create vite@latest webui-prod -- --template react-ts
cd webui-prod
npm install
```

## 2. Install Core Dependencies

```bash
# Tailwind CSS v4 (CSS-first, no config file)
npm install tailwindcss @tailwindcss/vite

# shadcn/ui CLI
npx shadcn@latest init

# During init, select:
#   - TypeScript: Yes
#   - Style: New York
#   - Base color: Neutral (or your preference)
#   - CSS variables: Yes
#   - Tailwind CSS: Yes (v4)
#   - Components directory: src/components/ui
#   - Utility functions: src/lib/utils

# Form handling
npm install react-hook-form @hookform/resolvers zod

# Animation library (v4 compatible)
npm install -D tw-animate-css
```

## 3. Configure Vite

```typescript
// vite.config.ts
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
  server: {
    // Proxy API calls to ColdFusion server during development
    proxy: {
      "/api": {
        target: "http://localhost:8500", // ColdFusion server
        changeOrigin: true,
      },
    },
  },
});
```

## 4. Configure TypeScript

```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src"]
}
```

## 5. Configure CSS Entry Point

```css
/* src/index.css */
@import "tailwindcss";
@import "tw-animate-css";

/* shadcn/ui CSS variables will be added here by the init command */

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);
  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
}
```

## 6. Install Commonly Needed shadcn Components

```bash
npx shadcn@latest add button
npx shadcn@latest add input
npx shadcn@latest add table
npx shadcn@latest add form
npx shadcn@latest add dialog
npx shadcn@latest add alert-dialog
npx shadcn@latest add card
npx shadcn@latest add badge
npx shadcn@latest add label
npx shadcn@latest add select
npx shadcn@latest add toast
npx shadcn@latest add sonner
```

## 7. Create Initial Directory Structure

```bash
mkdir -p src/{features,constants,hooks,types,api,components/shared}
touch src/constants/widths.ts
touch src/types/index.ts
touch src/api/client.ts
```

## 8. Create API Client

```typescript
// src/api/client.ts

const API_BASE = "/api";

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
}

export async function apiGet<T>(endpoint: string): Promise<ApiResponse<T>> {
  const response = await fetch(`${API_BASE}/${endpoint}`);
  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }
  return response.json();
}

export async function apiPost<T>(
  endpoint: string,
  body: Record<string, unknown>
): Promise<ApiResponse<T>> {
  const response = await fetch(`${API_BASE}/${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }
  return response.json();
}
```

## 9. Verify Setup

```bash
npm run dev
# Should open the app with Tailwind and shadcn/ui working
```
