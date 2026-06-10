import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { formatPieceTimer, usePieceTimer } from "../usePieceTimer";

describe("formatPieceTimer", () => {
  it("renders M:SS for under 1 hour", () => {
    expect(formatPieceTimer(0)).toBe("0:00");
    expect(formatPieceTimer(5)).toBe("0:05");
    expect(formatPieceTimer(65)).toBe("1:05");
    expect(formatPieceTimer(3599)).toBe("59:59");
  });
  it("renders H:MM:SS at or above 1 hour", () => {
    expect(formatPieceTimer(3600)).toBe("1:00:00");
    expect(formatPieceTimer(3725)).toBe("1:02:05");
    expect(formatPieceTimer(36000)).toBe("10:00:00");
  });
  it("treats negative as zero", () => {
    expect(formatPieceTimer(-5)).toBe("0:00");
  });
});

describe("usePieceTimer", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("ticks while running and stops on running=false", () => {
    let perfTime = 1000;
    vi.spyOn(performance, "now").mockImplementation(() => perfTime);

    const { result, rerender } = renderHook(
      ({ running }) => usePieceTimer({ running }),
      { initialProps: { running: true } },
    );

    expect(result.current.seconds).toBe(0);

    // Advance 5 seconds.
    act(() => {
      perfTime = 1000 + 5_000;
      vi.advanceTimersByTime(5_000);
    });
    expect(result.current.seconds).toBe(5);
    expect(result.current.format()).toBe("0:05");

    // Pause.
    rerender({ running: false });
    act(() => {
      perfTime = 1000 + 10_000;
      vi.advanceTimersByTime(5_000);
    });
    // Should still be 5 because timer paused.
    expect(result.current.seconds).toBe(5);

    // Resume; the base is preserved.
    rerender({ running: true });
    act(() => {
      perfTime = 1000 + 10_000 + 2_000;
      vi.advanceTimersByTime(2_000);
    });
    expect(result.current.seconds).toBe(7);
  });

  it("reset() returns to 0", () => {
    let perfTime = 0;
    vi.spyOn(performance, "now").mockImplementation(() => perfTime);

    const { result } = renderHook(() => usePieceTimer({ running: true }));

    act(() => {
      perfTime = 10_000;
      vi.advanceTimersByTime(10_000);
    });
    expect(result.current.seconds).toBe(10);

    act(() => {
      result.current.reset();
    });
    expect(result.current.seconds).toBe(0);
  });
});
