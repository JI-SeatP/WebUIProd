/**
 * Compute today's shift window for SQL filtering.
 *
 * Inputs:
 *   start, end — "HH:mm:ss" strings (EQDEBUTQUART / EQFINQUART).
 *   now        — current Date, defaults to new Date().
 *
 * Handles night shifts that span midnight (e.g. start="23:00:00", end="07:00:00"):
 *   if now < end → we're in the morning portion → shiftStart = yesterday at "start"
 *   else         → we're in the evening portion → shiftEnd   = tomorrow at "end"
 *
 * Returns null if either time string fails to parse.
 */
export interface ShiftWindow {
  shiftStart: Date;
  shiftEnd: Date;
}

function parseHms(hms: string): { h: number; m: number; s: number } | null {
  const parts = hms.split(":");
  if (parts.length < 2) return null;
  const h = Number(parts[0]);
  const m = Number(parts[1]);
  const s = parts.length > 2 ? Number(parts[2]) : 0;
  if (!Number.isFinite(h) || !Number.isFinite(m) || !Number.isFinite(s)) return null;
  if (h < 0 || h > 23 || m < 0 || m > 59 || s < 0 || s > 59) return null;
  return { h, m, s };
}

export function computeShiftWindow(
  start: string | null | undefined,
  end: string | null | undefined,
  now: Date = new Date(),
): ShiftWindow | null {
  if (!start || !end) return null;
  const s = parseHms(start);
  const e = parseHms(end);
  if (!s || !e) return null;

  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  const shiftStart = new Date(today);
  shiftStart.setHours(s.h, s.m, s.s, 0);
  const shiftEnd = new Date(today);
  shiftEnd.setHours(e.h, e.m, e.s, 0);

  if (shiftEnd.getTime() <= shiftStart.getTime()) {
    // Shift spans midnight (e.g. 23:00 → 07:00).
    if (now.getTime() < shiftEnd.getTime()) {
      // We're in the morning portion of a night shift that started yesterday.
      shiftStart.setDate(shiftStart.getDate() - 1);
    } else {
      // We're in the evening portion; shift ends tomorrow.
      shiftEnd.setDate(shiftEnd.getDate() + 1);
    }
  }

  return { shiftStart, shiftEnd };
}

/** Returns an ISO-style "YYYY-MM-DD HH:mm:ss" string in *local* time (no TZ
 * offset) suitable for SQL Server DATETIME parameters. */
export function toSqlLocalIso(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ` +
    `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
  );
}
