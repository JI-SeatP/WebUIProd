/**
 * Centralized status color definitions.
 * Used across time tracking, operation screens, and anywhere status is displayed.
 *
 * Keys are the MODEPROD_MPCODE string codes from the database.
 */
export const STATUS_COLORS: Record<string, string> = {
  Prod:  "#16a34a",  // Green
  Setup: "#9333ea",  // Purple
  COMP:  "#2563eb",  // Blue
  PAUSE: "#d97706",  // Amber
  STOP:  "#dc2626",  // Red
  READY: "#94a3b8",  // Slate
  HOLD:  "#ea580c",  // Orange
  DONE:  "#059669",  // Emerald
} as const;

/** Fallback color when status code is unknown */
export const STATUS_COLOR_DEFAULT = "#94a3b8"; // Slate
