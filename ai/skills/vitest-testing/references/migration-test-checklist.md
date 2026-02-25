# Migration Test Checklist

When migrating a feature from the old `.cfm` codebase to the new React frontend, 
these are the areas that must be tested to verify feature parity.

## Checklist Per Feature

For every feature code (e.g., `S001-02-F001`), verify:

### Data Accuracy
- [ ] Component displays the same data fields as the old screen
- [ ] Numeric values are formatted consistently (decimals, thousands separators)
- [ ] Dates are formatted correctly
- [ ] Null/empty values are handled (no "undefined" or "null" displayed)
- [ ] Data is sorted in the same default order as the old screen

### User Interactions
- [ ] Clickable elements trigger the correct actions
- [ ] Selection state works (single-select rows, checkboxes, etc.)
- [ ] Form inputs accept the expected data types
- [ ] Submit/save actions call the correct API endpoint
- [ ] Navigation between screens/sections works

### Validation Rules
- [ ] Required fields are enforced
- [ ] Numeric ranges are checked (min/max values)
- [ ] Text length limits are applied
- [ ] Validation error messages are clear and visible
- [ ] Invalid submissions are prevented (form doesn't submit)

### API Integration
- [ ] Correct `.cfm` endpoint is called
- [ ] Request payload matches expected format
- [ ] Response is parsed correctly
- [ ] Success response updates the UI appropriately
- [ ] Error response shows an error message

### UI States
- [ ] Loading state shows while data is being fetched
- [ ] Error state shows when API call fails
- [ ] Empty state shows when no data exists
- [ ] Disabled state applied when actions aren't available

### Touch / Accessibility
- [ ] Interactive elements have minimum 48px touch targets
- [ ] Table rows have minimum 56px height
- [ ] Confirmation dialogs appear for data-modifying actions
- [ ] Focus management works correctly (focus moves to appropriate element)

## Writing the Tests

Each checklist item maps to one or more test cases. Group them logically:

```typescript
describe("S001-02-F001 Work Order Table", () => {
  describe("Data Accuracy", () => {
    it("displays all columns from the old screen");
    it("sorts by WO number ascending by default");
    it("handles empty product names gracefully");
  });

  describe("User Interactions", () => {
    it("selects a row on click");
    it("deselects when clicking a different row");
  });

  describe("API Integration", () => {
    it("calls getWorkOrders.cfm on mount");
    it("shows loading state while fetching");
    it("displays error when API fails");
  });

  describe("Touch Targets", () => {
    it("rows are at least 56px tall");
  });
});
```

## Comparing Old vs New Behavior

When in doubt about expected behavior, refer to:
1. The feature doc in `docs/SOURCE_FEATURES/` — the documented behavior
2. Inline comments (`<!-- NOTE: -->`) — may note deviations or improvements
3. The old `.cfm` source code — the actual implementation

If the new implementation intentionally differs from the old (e.g., improved validation, 
better UX), document the difference as a note in the test:

```typescript
it("rejects negative quantities (improvement over old system)", async () => {
  // NOTE: Old .cfm allowed negative quantities via SQL. New version validates client-side.
  // ...
});
```

## Test Result Summary Format

When presenting test results for approval, use this format:

```
Feature: S001-02-F001 Work Order Table
Tests: 8 passed, 0 failed

✅ Data Accuracy
  ✅ displays all columns from the old screen
  ✅ sorts by WO number ascending by default
  ✅ handles empty product names gracefully

✅ User Interactions
  ✅ selects a row on click
  ✅ deselects when clicking a different row

✅ API Integration
  ✅ calls getWorkOrders.cfm on mount
  ✅ shows loading state while fetching
  ✅ displays error when API fails

Status: Testing Passed - Awaiting Approval
```
