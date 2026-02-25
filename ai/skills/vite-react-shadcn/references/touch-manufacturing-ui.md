# Touch Manufacturing UI Guidelines

WebUIProd runs on touchscreens in a manufacturing facility. Workers use it with bare or gloved 
hands, often quickly between production tasks. Every design decision should favor speed, 
clarity, and error prevention.

## Minimum Sizes

| Element | Min Height | Min Width | Reasoning |
|---------|-----------|-----------|-----------|
| Buttons | `48px` | `48px` | WCAG 2.5.8 target size, comfortable for fingers |
| Table rows | `56px` | — | Needs to be tappable without selecting wrong row |
| Input fields | `48px` | `120px` | Room for text + finger tap |
| Spacing between tappables | `12px` (`gap-3`) | — | Prevents accidental adjacent taps |
| Icon buttons | `48px` | `48px` | Even icon-only buttons need full target |

## Tailwind Utility Classes for Touch Defaults

Apply these as baseline classes for all interactive elements:

```tsx
// Buttons (always use size="lg" for primary actions)
<Button size="lg" className="min-h-[48px] text-lg">
  Save
</Button>

// Table rows
<TableRow className="h-[56px] cursor-pointer select-none">

// Inputs
<Input className="h-[48px] text-lg" inputMode="numeric" />

// Spacing between groups of buttons
<div className="flex gap-3">
  <Button>Cancel</Button>
  <Button>Submit</Button>
</div>
```

## Text Sizing

Workers glance at screens — text must be immediately readable.

| Context | Class | Size |
|---------|-------|------|
| Page titles | `text-2xl font-bold` | 24px |
| Section headers | `text-xl font-semibold` | 20px |
| Table header text | `text-base font-medium` | 16px |
| Table body text | `text-base` | 16px |
| Input text | `text-lg` | 18px |
| Button text | `text-lg` | 18px |
| Status badges | `text-sm` | 14px |
| Validation errors | `text-sm text-destructive` | 14px |

## Numeric Input

Production workers primarily enter numbers (quantities, counts). Always use:

```tsx
<Input
  type="number"
  inputMode="numeric"    // triggers numeric keyboard on touch
  pattern="[0-9]*"       // iOS numeric keyboard hint
  className="h-[48px] text-lg text-center"
  min={0}
/>
```

For quantity entry, consider a dedicated large number pad component instead of relying 
on the system keyboard, especially if devices run in kiosk mode.

## Confirmation Dialogs

Any action that modifies data should have a confirmation step:
- Submitting quantities → "Submit X units for WO Y?"
- Deleting/canceling → "Are you sure?"
- Status changes → "Mark WO as complete?"

Use shadcn's `AlertDialog` (not `Dialog`) because it blocks interaction with the page 
behind it, preventing accidental double-taps.

Dialog buttons should be:
- Large: `min-h-[48px]`
- Full width or equal width: `flex-1`
- Spaced: `gap-3`
- Clear labels: "Confirm" / "Cancel", never just "OK" / "No"

## Visual Feedback

Workers need instant feedback that their tap registered:

- **Active states**: Tailwind's `active:` modifier for press feedback
  ```tsx
  <Button className="active:scale-95 transition-transform">
  ```
- **Loading states**: Show spinner or "Saving..." text during API calls
- **Success feedback**: Brief toast notification after submission
- **Selected state**: Clear background color change for selected rows

## Layout Principles

1. **No horizontal scrolling** — everything fits in viewport width
2. **Minimal vertical scrolling** — most-used content above the fold
3. **Fixed header/footer** — navigation and primary actions always visible
4. **Single-column on narrow screens** — no complex multi-panel layouts unless screen is wide
5. **High contrast** — avoid light gray on white; use distinct foreground/background

## Accessibility Notes

- All interactive elements must be reachable via keyboard (for accessibility compliance)
- Color should never be the only indicator — pair with text or icons
- `aria-label` on icon-only buttons
- Focus rings visible but not obtrusive: `focus-visible:ring-2 focus-visible:ring-ring`

## Anti-Patterns to Avoid

- `size="sm"` on any primary action button
- Hover-dependent interactions (no hover on touchscreen)
- Small close "×" buttons — make them at least 48px
- Double-tap to activate anything — single tap for all actions
- Tooltips as the only way to convey information
- Swipe gestures for critical actions (too easy to trigger accidentally)
