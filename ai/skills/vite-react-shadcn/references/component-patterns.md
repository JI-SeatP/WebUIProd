# Component Patterns

shadcn/ui composition patterns, form handling, tables, and dialogs for WebUIProd.

## Form Pattern: react-hook-form + zod

Every form uses this stack: `react-hook-form` for state management, `zod` for validation, 
and shadcn's `<Form>` components for rendering.

```tsx
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

const quantitySchema = z.object({
  quantity: z
    .number({ required_error: "Quantity is required" })
    .min(1, "Must be at least 1")
    .max(9999, "Cannot exceed 9999"),
});

type QuantityFormValues = z.infer<typeof quantitySchema>;

interface QuantityEntryFormProps {
  maxQuantity: number;
  onSubmit: (values: QuantityFormValues) => void;
}

export function QuantityEntryForm({ maxQuantity, onSubmit }: QuantityEntryFormProps) {
  const form = useForm<QuantityFormValues>({
    resolver: zodResolver(quantitySchema),
    defaultValues: { quantity: 0 },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="quantity"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-lg">Quantity Produced</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  inputMode="numeric"
                  className="h-[48px] text-lg"
                  max={maxQuantity}
                  {...field}
                  onChange={(e) => field.onChange(Number(e.target.value))}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" size="lg" className="w-full min-h-[48px] text-lg">
          Submit
        </Button>
      </form>
    </Form>
  );
}
```

Key points:
- `inputMode="numeric"` triggers the numeric keyboard on touch devices
- `h-[48px]` on inputs for touch targets
- `size="lg"` on buttons as default
- Zod schema defines validation — the single source of truth for form rules
- `FormMessage` shows validation errors automatically

## Data Table Pattern

Tables use shadcn's `<Table>` components with width constants from `@/constants/widths.ts`.

```tsx
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { W_WORK_ORDERS } from "@/constants/widths";
import { Badge } from "@/components/ui/badge";

interface WorkOrder {
  id: string;
  woNumber: string;
  product: string;
  qtyRequired: number;
  qtyProduced: number;
  status: "open" | "in-progress" | "completed";
}

interface WorkOrderTableProps {
  orders: WorkOrder[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function WorkOrderTable({ orders, selectedId, onSelect }: WorkOrderTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className={W_WORK_ORDERS.woNumber}>WO #</TableHead>
          <TableHead className={W_WORK_ORDERS.product}>Product</TableHead>
          <TableHead className={cn(W_WORK_ORDERS.qtyRequired, "text-right")}>Required</TableHead>
          <TableHead className={cn(W_WORK_ORDERS.qtyProduced, "text-right")}>Produced</TableHead>
          <TableHead className={W_WORK_ORDERS.status}>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {orders.map((order) => (
          <TableRow
            key={order.id}
            className={cn(
              "h-[56px] cursor-pointer select-none",
              selectedId === order.id && "bg-accent"
            )}
            onClick={() => onSelect(order.id)}
          >
            <TableCell className={W_WORK_ORDERS.woNumber}>{order.woNumber}</TableCell>
            <TableCell className={W_WORK_ORDERS.product}>{order.product}</TableCell>
            <TableCell className={cn(W_WORK_ORDERS.qtyRequired, "text-right")}>
              {order.qtyRequired}
            </TableCell>
            <TableCell className={cn(W_WORK_ORDERS.qtyProduced, "text-right")}>
              {order.qtyProduced}
            </TableCell>
            <TableCell className={W_WORK_ORDERS.status}>
              <StatusBadge status={order.status} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function StatusBadge({ status }: { status: WorkOrder["status"] }) {
  const variants: Record<WorkOrder["status"], "default" | "secondary" | "outline"> = {
    open: "outline",
    "in-progress": "secondary",
    completed: "default",
  };
  return <Badge variant={variants[status]}>{status}</Badge>;
}
```

Key points:
- Row height `h-[56px]` for touch
- `cursor-pointer select-none` prevents text selection on tap
- Selection state managed via `selectedId` prop
- Width constants from centralized file
- `cn()` merges width classes with alignment classes

## Confirmation Dialog Pattern

Destructive or important actions require confirmation — critical for a manufacturing environment.

```tsx
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

interface ConfirmSubmitProps {
  quantity: number;
  woNumber: string;
  onConfirm: () => void;
}

export function ConfirmSubmitDialog({ quantity, woNumber, onConfirm }: ConfirmSubmitProps) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button size="lg" className="w-full min-h-[48px] text-lg">
          Submit Quantity
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-xl">Confirm Submission</AlertDialogTitle>
          <AlertDialogDescription className="text-lg">
            Submit <strong>{quantity}</strong> units for WO <strong>{woNumber}</strong>?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex gap-3">
          <AlertDialogCancel className="min-h-[48px] text-lg flex-1">
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            className="min-h-[48px] text-lg flex-1"
            onClick={onConfirm}
          >
            Confirm
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
```

Key points:
- `asChild` on trigger to compose with Button
- Large text (`text-lg`, `text-xl`) for readability
- Full-width footer buttons with `flex-1` for equal sizing
- `gap-3` between Cancel/Confirm to prevent mis-taps

## Custom Hook Pattern: Data Fetching

```tsx
// src/hooks/useWorkOrders.ts
import { useState, useEffect } from "react";
import { apiGet } from "@/api/client";

interface WorkOrder {
  id: string;
  woNumber: string;
  product: string;
  qtyRequired: number;
  qtyProduced: number;
  status: string;
}

export function useWorkOrders() {
  const [orders, setOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiGet<WorkOrder[]>("getWorkOrders.cfm")
      .then((res) => {
        if (res.success) setOrders(res.data);
        else setError(res.error ?? "Failed to load");
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return { orders, loading, error, refetch: () => setLoading(true) };
}
```
