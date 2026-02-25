# Width Constants Convention

All element and column widths are defined in centralized TypeScript constant blocks rather than 
scattered inline across components. This makes layout fine-tuning fast — change one value, 
every usage updates.

## Pattern

For every table, grid, or layout with multiple columns/elements that need width control, 
create a constants block:

```typescript
// src/constants/widths.ts

// ───────────────────────────────────────
// WIDTH - WORK_ORDERS_TABLE
// ───────────────────────────────────────
export const W_WORK_ORDERS = {
  woNumber:    "w-[180px]",
  product:     "w-[250px]",
  qtyRequired: "w-[120px]",
  qtyProduced: "w-[120px]",
  status:      "w-[140px]",
} as const;

// ───────────────────────────────────────
// WIDTH - PRODUCTION_ENTRY_FORM
// ───────────────────────────────────────
export const W_PRODUCTION_ENTRY = {
  label:       "w-[160px]",
  input:       "w-[200px]",
  button:      "w-[140px]",
} as const;

// ───────────────────────────────────────
// WIDTH - INVENTORY_TABLE
// ───────────────────────────────────────
export const W_INVENTORY = {
  partNumber:  "w-[200px]",
  description: "w-[300px]",
  location:    "w-[150px]",
  quantity:    "w-[100px]",
} as const;
```

## Usage in Components

```tsx
import { W_WORK_ORDERS } from "@/constants/widths";

function WorkOrderTable({ orders }: Props) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className={W_WORK_ORDERS.woNumber}>WO #</TableHead>
          <TableHead className={W_WORK_ORDERS.product}>Product</TableHead>
          <TableHead className={W_WORK_ORDERS.qtyRequired}>Required</TableHead>
          <TableHead className={W_WORK_ORDERS.qtyProduced}>Produced</TableHead>
          <TableHead className={W_WORK_ORDERS.status}>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {orders.map((order) => (
          <TableRow key={order.id}>
            <TableCell className={W_WORK_ORDERS.woNumber}>{order.woNumber}</TableCell>
            <TableCell className={W_WORK_ORDERS.product}>{order.product}</TableCell>
            <TableCell className={W_WORK_ORDERS.qtyRequired}>{order.qtyRequired}</TableCell>
            <TableCell className={W_WORK_ORDERS.qtyProduced}>{order.qtyProduced}</TableCell>
            <TableCell className={W_WORK_ORDERS.status}>{order.status}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
```

## Rules

1. **One file** — all width constants live in `src/constants/widths.ts`
2. **Block comments** — each table/layout gets a clearly labeled block with separator lines
3. **Naming** — `W_` prefix + `SCREAMING_SNAKE_CASE` for the constant, `camelCase` for properties
4. **`as const`** — always use `as const` for type safety and autocompletion
5. **Header + Body consistency** — use the same width constant for both `TableHead` and `TableCell`
6. **No inline widths** — never put `w-[Xpx]` directly in JSX; always reference the constant
7. **Combine with other classes** — use template literals or `cn()` when combining:

```tsx
import { cn } from "@/lib/utils";

<TableCell className={cn(W_WORK_ORDERS.status, "text-center font-bold")}>
  {order.status}
</TableCell>
```
