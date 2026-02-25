---
name: vitest-testing
description: >
  Vitest testing patterns for the WebUIProd project (Vite + React + TypeScript + shadcn/ui). 
  Covers component testing with React Testing Library, mocking ColdFusion API endpoints, 
  and the migration-specific test-then-approve workflow. Use this skill when writing tests, 
  setting up Vitest, running test suites, debugging test failures, mocking API calls to .cfm 
  endpoints, or when a migrated feature needs to be tested before approval. Also trigger when 
  the user mentions test coverage, test failures, assertions, mocking, or anything related 
  to verifying that migrated features work correctly.
---

# Vitest Testing for WebUIProd

Every migrated feature must pass Vitest tests before it can be approved. This skill covers 
setup, patterns, and the migration-specific test workflow.

## Setup & Config

**Read** `references/setup-and-config.md` for the full `vitest.config.ts`, React Testing Library 
integration, and test environment setup.

Quick summary: tests live alongside components as `{ComponentName}.test.tsx` files within 
each feature folder.

## Test-Then-Approve Workflow

This is the cycle for every migrated feature:

1. **Develop** the React component (using the `vite-react-shadcn` skill)
2. **Write tests** that verify feature parity with the old `.cfm` behavior
3. **Run tests** with `npm test` or `npx vitest run`
4. **If tests pass** → mark the migration TODO as `Testing Passed - Awaiting Approval`
5. **Present results** to the user with a summary of what was tested
6. **If user approves** → mark as `Completed`
7. **If tests fail** → mark as `Test Not Passed`, create a bug issue in the TODO

The test summary presented to the user should include:
- Feature code (e.g., `S001-02-F001`)
- What was tested (list of test cases)
- Pass/fail status for each test
- Any warnings or edge cases

## What to Test for Migrated Features

**Read** `references/migration-test-checklist.md` for the full checklist.

Core areas for every migrated feature:
- **Data accuracy**: Does the component display the same data as the old screen?
- **User interactions**: Do buttons, inputs, and selections work correctly?
- **Validation**: Are the same rules enforced (required fields, ranges, formats)?
- **API integration**: Does the component call the correct `.cfm` endpoint?
- **Error states**: Are loading, error, and empty states handled?

## Component Testing Patterns

**Read** `references/component-testing-patterns.md` for full examples covering:
- Rendering and snapshot patterns
- User interaction with touch events
- Form submission testing
- Async data loading
- Testing with mocked API responses

Quick pattern — the AAA structure every test should follow:

```typescript
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

describe("WorkOrderTable", () => {
  it("highlights selected row on click", async () => {
    // Arrange
    const user = userEvent.setup();
    const mockOrders = [{ id: "1", woNumber: "WO-001", /* ... */ }];
    render(<WorkOrderTable orders={mockOrders} selectedId={null} onSelect={vi.fn()} />);

    // Act
    await user.click(screen.getByText("WO-001"));

    // Assert
    expect(onSelect).toHaveBeenCalledWith("1");
  });
});
```

## Mocking ColdFusion Endpoints

**Read** `references/mocking-patterns.md` for detailed patterns on mocking `fetch` calls 
to `.cfm` endpoints, using `vi.mock`, `vi.spyOn`, and MSW for more complex scenarios.

Quick pattern:

```typescript
import { vi } from "vitest";

// Mock the API client
vi.mock("@/api/client", () => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
}));
```
