# Tailwind Conventions

CSS variable architecture, Tailwind v4 patterns, and project-specific conventions for WebUIProd.

## Tailwind v4 Key Differences

Tailwind v4 uses CSS-first configuration — no `tailwind.config.ts` file.

- Configuration lives in `src/index.css` using `@theme inline { ... }`
- The Vite plugin (`@tailwindcss/vite`) handles processing — no PostCSS config needed
- Animation library is `tw-animate-css` (not `tailwindcss-animate` which was v3 only)
- `@apply` works inside `@layer base` or `@layer components` but use `@utility` for new utilities

## CSS Variable Architecture

shadcn/ui defines design tokens as CSS variables. The `@theme inline` block maps them to 
Tailwind utility classes:

```css
/* src/index.css */
@import "tailwindcss";
@import "tw-animate-css";

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 0 0% 3.9%;
    --primary: 0 0% 9%;
    --primary-foreground: 0 0% 98%;
    /* ... */
    --radius: 0.5rem;
  }

  .dark {
    --background: 0 0% 3.9%;
    --foreground: 0 0% 98%;
    /* ... */
  }
}

@theme inline {
  --color-background: hsl(var(--background));
  --color-foreground: hsl(var(--foreground));
  --color-primary: hsl(var(--primary));
  --color-primary-foreground: hsl(var(--primary-foreground));
  /* ... map all shadcn variables ... */
}
```

This lets you use `bg-primary`, `text-foreground`, etc. natively in Tailwind v4.

## The cn() Utility

Always use `cn()` for conditional/merged classes:

```typescript
// src/lib/utils.ts
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

Usage:
```tsx
import { cn } from "@/lib/utils";

<div className={cn(
  "p-4 rounded-lg",
  isSelected && "bg-accent",
  isDisabled && "opacity-50 pointer-events-none"
)}>
```

## Width Constants

All column and element widths are centralized in `src/constants/widths.ts`. 
See the `width-constants-convention.md` reference in the migration skill for the full pattern.

The rule: **never put `w-[Xpx]` inline in JSX** — always import from the constants file.

## Custom Utility Classes

If you need a reusable utility that doesn't exist in Tailwind, define it with `@utility`:

```css
/* src/index.css */
@utility touch-target {
  min-height: 48px;
  min-width: 48px;
}

@utility no-select {
  user-select: none;
  -webkit-user-select: none;
}
```

Then use in JSX: `className="touch-target no-select"`

## Conventions Summary

1. **No inline pixel widths** — use `src/constants/widths.ts`
2. **`cn()` for all conditional classes** — never string concatenation
3. **CSS variables for theming** — never hardcode colors
4. **`@theme inline` for config** — no `tailwind.config.ts`
5. **`tw-animate-css`** — not `tailwindcss-animate`
6. **`@utility` for custom utilities** — not `@apply` in components
7. **Vite plugin** — not PostCSS for Tailwind processing
