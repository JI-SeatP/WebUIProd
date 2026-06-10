import { useCallback, useEffect, useRef, useState } from "react";

interface UsePieceTimerOptions {
  /** Whether the timer should be counting. When false, the timer pauses
   *  (elapsed value is preserved). */
  running: boolean;
  /** Initial seconds value (allows resuming from a known offset). */
  initialSeconds?: number;
}

/**
 * Piece timer for the PQTT toolbar. Display is updated every second by a
 * setInterval, but the elapsed value is computed from a `performance.now()`
 * delta on each tick so that background-tab throttling does not cause the
 * displayed value to drift.
 *
 * Returns:
 *   seconds  - current elapsed seconds (integer)
 *   reset()  - reset to 0
 *   stop()   - alias for reset() kept for parity with the spec terminology
 *   format() - "M:SS" while < 60min, "H:MM:SS" beyond
 */
export function usePieceTimer({ running, initialSeconds = 0 }: UsePieceTimerOptions) {
  const [seconds, setSeconds] = useState<number>(Math.max(0, Math.floor(initialSeconds)));
  const startedAtRef = useRef<number | null>(null);
  const baseSecondsRef = useRef<number>(Math.max(0, Math.floor(initialSeconds)));
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!running) {
      // Pause: capture the current value into baseSeconds and clear the timer.
      if (intervalRef.current) {
        console.log("[PQTT-timer] pause — clearing interval");
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (startedAtRef.current !== null) {
        const elapsed = (performance.now() - startedAtRef.current) / 1000;
        baseSecondsRef.current = baseSecondsRef.current + elapsed;
        setSeconds(Math.floor(baseSecondsRef.current));
        startedAtRef.current = null;
      }
      return;
    }

    // Start ticking.
    console.log("[PQTT-timer] start — baseSeconds=", baseSecondsRef.current.toFixed(2));
    startedAtRef.current = performance.now();
    intervalRef.current = setInterval(() => {
      const startedAt = startedAtRef.current;
      if (startedAt === null) return;
      const elapsed = (performance.now() - startedAt) / 1000;
      setSeconds(Math.floor(baseSecondsRef.current + elapsed));
    }, 1000);

    return () => {
      if (intervalRef.current) {
        console.log("[PQTT-timer] cleanup — clearing interval");
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [running]);

  /** Reset the timer. Pass a positive `toSeconds` to *resume* from a known
   *  offset (e.g. server-computed elapsed seconds of an open PRDETSEQ). */
  const reset = useCallback((toSeconds: number = 0) => {
    const start = Math.max(0, Math.floor(toSeconds));
    console.log("[PQTT-timer] reset() — running=", running, "toSeconds=", start);
    baseSecondsRef.current = start;
    startedAtRef.current = running ? performance.now() : null;
    setSeconds(start);
  }, [running]);

  const format = useCallback(() => formatPieceTimer(seconds), [seconds]);

  return { seconds, reset, stop: reset, format };
}

/** "M:SS" while < 60min, "H:MM:SS" beyond. */
export function formatPieceTimer(totalSeconds: number): string {
  const total = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h === 0) {
    return `${m}:${String(s).padStart(2, "0")}`;
  }
  return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
