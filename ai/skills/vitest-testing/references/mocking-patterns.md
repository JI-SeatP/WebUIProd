# Mocking Patterns

Patterns for mocking ColdFusion API endpoints and other dependencies in Vitest.

## Mocking the API Client

The most common pattern — mock the `@/api/client` module so components don't make real 
HTTP requests during tests.

```typescript
import { vi, describe, it, expect, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { apiGet, apiPost } from "@/api/client";
import { WorkOrdersPage } from "./WorkOrdersPage";

// Mock the entire API client module
vi.mock("@/api/client", () => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
}));

describe("WorkOrdersPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches work orders on mount", async () => {
    vi.mocked(apiGet).mockResolvedValue({
      success: true,
      data: [
        { id: "1", woNumber: "WO-001", product: "Widget A", status: "open" },
      ],
    });

    render(<WorkOrdersPage />);

    // Verify the correct endpoint was called
    expect(apiGet).toHaveBeenCalledWith("getWorkOrders.cfm");

    // Verify data renders
    await waitFor(() => {
      expect(screen.getByText("WO-001")).toBeInTheDocument();
    });
  });

  it("handles API error", async () => {
    vi.mocked(apiGet).mockResolvedValue({
      success: false,
      data: null,
      error: "Database connection failed",
    });

    render(<WorkOrdersPage />);

    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeInTheDocument();
    });
  });
});
```

## Mocking with vi.spyOn

When you need to mock a specific method while keeping the rest of the module intact:

```typescript
import * as api from "@/api/client";

it("submits quantity to the correct endpoint", async () => {
  const spy = vi.spyOn(api, "apiPost").mockResolvedValue({
    success: true,
    data: { saved: true },
  });

  // ... render and interact with form ...

  expect(spy).toHaveBeenCalledWith("saveQuantity.cfm", {
    woId: "1",
    quantity: 25,
  });

  spy.mockRestore();
});
```

## Mocking Fetch Directly

For lower-level control or when testing the API client itself:

```typescript
describe("apiGet", () => {
  it("calls the correct URL and returns parsed JSON", async () => {
    const mockResponse = {
      success: true,
      data: [{ id: "1" }],
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    const result = await apiGet("getWorkOrders.cfm");
    expect(fetch).toHaveBeenCalledWith("/api/getWorkOrders.cfm");
    expect(result).toEqual(mockResponse);
  });
});
```

## Mock Factory Pattern

For reusable mock data across multiple test files:

```typescript
// src/test/mocks/workOrders.ts

import type { WorkOrder } from "@/types/work-order";

export function createMockWorkOrder(overrides?: Partial<WorkOrder>): WorkOrder {
  return {
    id: "1",
    woNumber: "WO-001",
    product: "Widget A",
    qtyRequired: 100,
    qtyProduced: 0,
    status: "open",
    ...overrides,
  };
}

export function createMockWorkOrderList(count: number = 3): WorkOrder[] {
  return Array.from({ length: count }, (_, i) =>
    createMockWorkOrder({
      id: String(i + 1),
      woNumber: `WO-${String(i + 1).padStart(3, "0")}`,
      product: `Widget ${String.fromCharCode(65 + i)}`,
    })
  );
}
```

Usage in tests:

```typescript
import { createMockWorkOrder, createMockWorkOrderList } from "@/test/mocks/workOrders";

it("renders 5 work orders", () => {
  const orders = createMockWorkOrderList(5);
  render(<WorkOrderTable orders={orders} selectedId={null} onSelect={vi.fn()} />);
  expect(screen.getAllByRole("row")).toHaveLength(6); // 5 data rows + 1 header
});
```

## Mocking ColdFusion-Specific Response Patterns

ColdFusion endpoints return a consistent JSON structure. Mock it faithfully:

```typescript
// Successful response
vi.mocked(apiGet).mockResolvedValue({
  success: true,
  data: { /* your data */ },
  message: "Records retrieved successfully",
});

// Error response
vi.mocked(apiGet).mockResolvedValue({
  success: false,
  data: null,
  error: "Stored procedure sp_GetWorkOrders failed: timeout",
});

// Network error (fetch itself fails)
vi.mocked(apiGet).mockRejectedValue(new Error("Network error"));
```

## Timer and Debounce Mocking

If components use debounced search or auto-refresh:

```typescript
import { vi, beforeEach, afterEach } from "vitest";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

it("debounces search input", async () => {
  const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

  render(<SearchableTable />);
  await user.type(screen.getByRole("searchbox"), "widget");

  // API not called yet (debounced)
  expect(apiGet).not.toHaveBeenCalled();

  // Advance past debounce delay
  vi.advanceTimersByTime(300);

  expect(apiGet).toHaveBeenCalledWith("search.cfm?q=widget");
});
```
