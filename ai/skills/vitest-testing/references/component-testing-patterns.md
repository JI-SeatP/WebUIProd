# Component Testing Patterns

Patterns for testing React components in the WebUIProd project using Vitest and 
React Testing Library.

## Rendering a Component

```typescript
import { render, screen } from "@testing-library/react";
import { WorkOrderTable } from "./WorkOrderTable";

const mockOrders = [
  {
    id: "1",
    woNumber: "WO-001",
    product: "Widget A",
    qtyRequired: 100,
    qtyProduced: 45,
    status: "in-progress" as const,
  },
  {
    id: "2",
    woNumber: "WO-002",
    product: "Widget B",
    qtyRequired: 50,
    qtyProduced: 50,
    status: "completed" as const,
  },
];

describe("WorkOrderTable", () => {
  it("renders all work orders", () => {
    render(
      <WorkOrderTable orders={mockOrders} selectedId={null} onSelect={vi.fn()} />
    );

    expect(screen.getByText("WO-001")).toBeInTheDocument();
    expect(screen.getByText("WO-002")).toBeInTheDocument();
    expect(screen.getByText("Widget A")).toBeInTheDocument();
  });

  it("shows empty state when no orders", () => {
    render(
      <WorkOrderTable orders={[]} selectedId={null} onSelect={vi.fn()} />
    );

    expect(screen.getByText(/no work orders/i)).toBeInTheDocument();
  });
});
```

## User Interaction Testing

Use `userEvent` for realistic user interactions — it simulates real browser events 
including focus, blur, keyboard, and pointer events.

```typescript
import userEvent from "@testing-library/user-event";

describe("WorkOrderTable - interactions", () => {
  it("calls onSelect when a row is clicked", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();

    render(
      <WorkOrderTable orders={mockOrders} selectedId={null} onSelect={onSelect} />
    );

    await user.click(screen.getByText("WO-001"));
    expect(onSelect).toHaveBeenCalledWith("1");
  });

  it("highlights the selected row", () => {
    render(
      <WorkOrderTable orders={mockOrders} selectedId="1" onSelect={vi.fn()} />
    );

    const row = screen.getByText("WO-001").closest("tr");
    expect(row).toHaveClass("bg-accent");
  });
});
```

## Form Testing

Test form validation, submission, and error states:

```typescript
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QuantityEntryForm } from "./QuantityEntryForm";

describe("QuantityEntryForm", () => {
  it("submits valid quantity", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(<QuantityEntryForm maxQuantity={100} onSubmit={onSubmit} />);

    const input = screen.getByRole("spinbutton"); // type="number" inputs have spinbutton role
    await user.clear(input);
    await user.type(input, "25");
    await user.click(screen.getByRole("button", { name: /submit/i }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({ quantity: 25 });
    });
  });

  it("shows validation error for zero quantity", async () => {
    const user = userEvent.setup();

    render(<QuantityEntryForm maxQuantity={100} onSubmit={vi.fn()} />);

    const input = screen.getByRole("spinbutton");
    await user.clear(input);
    await user.type(input, "0");
    await user.click(screen.getByRole("button", { name: /submit/i }));

    await waitFor(() => {
      expect(screen.getByText(/must be at least 1/i)).toBeInTheDocument();
    });
  });

  it("does not submit when quantity exceeds max", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(<QuantityEntryForm maxQuantity={100} onSubmit={onSubmit} />);

    const input = screen.getByRole("spinbutton");
    await user.clear(input);
    await user.type(input, "150");
    await user.click(screen.getByRole("button", { name: /submit/i }));

    await waitFor(() => {
      expect(onSubmit).not.toHaveBeenCalled();
    });
  });
});
```

## Async Data Loading

Test components that fetch data on mount:

```typescript
import { render, screen, waitFor } from "@testing-library/react";
import { WorkOrdersPage } from "./WorkOrdersPage";
import { apiGet } from "@/api/client";

vi.mock("@/api/client", () => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
}));

describe("WorkOrdersPage", () => {
  it("shows loading state initially", () => {
    vi.mocked(apiGet).mockImplementation(() => new Promise(() => {})); // never resolves

    render(<WorkOrdersPage />);
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it("renders work orders after loading", async () => {
    vi.mocked(apiGet).mockResolvedValue({
      success: true,
      data: [{ id: "1", woNumber: "WO-001", product: "Widget A" }],
    });

    render(<WorkOrdersPage />);

    await waitFor(() => {
      expect(screen.getByText("WO-001")).toBeInTheDocument();
    });
  });

  it("shows error message on API failure", async () => {
    vi.mocked(apiGet).mockRejectedValue(new Error("Network error"));

    render(<WorkOrdersPage />);

    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeInTheDocument();
    });
  });
});
```

## Query Priority

Prefer queries in this order (most accessible → least):

1. `getByRole` — accessible roles (button, textbox, heading)
2. `getByLabelText` — form inputs with labels
3. `getByPlaceholderText` — inputs with placeholders
4. `getByText` — visible text content
5. `getByTestId` — last resort, use `data-testid` attribute

```typescript
// Prefer
screen.getByRole("button", { name: /submit/i })

// Over
screen.getByText("Submit")

// Over
screen.getByTestId("submit-button")
```

## Testing Touch-Specific Behavior

Since WebUIProd is touch-first, test that elements meet size requirements:

```typescript
it("has minimum touch target size on buttons", () => {
  render(<QuantityEntryForm maxQuantity={100} onSubmit={vi.fn()} />);

  const button = screen.getByRole("button", { name: /submit/i });
  expect(button.className).toMatch(/min-h-\[48px\]/);
});

it("has adequate row height for touch", () => {
  render(
    <WorkOrderTable orders={mockOrders} selectedId={null} onSelect={vi.fn()} />
  );

  const rows = screen.getAllByRole("row").slice(1); // skip header
  rows.forEach((row) => {
    expect(row.className).toMatch(/h-\[56px\]/);
  });
});
```
