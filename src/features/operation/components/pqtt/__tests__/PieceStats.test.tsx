import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { PieceStats } from "../PieceStats";

const bg = (el: HTMLElement) => el.style.backgroundColor.replace(/\s+/g, "").toLowerCase();

const TARGET = {
  TargetTimePerPiece: 240,      // 4 min/piece in seconds
  PT_Delay: 30,                 // 30 s delay
  TargetAvgPcsHour: 13.33,      // with delay
  TargetAvgPcsHour_Min: 15.0,   // without delay (higher)
};

describe("PieceStats — conditional coloring", () => {
  it("white when no target row, regardless of values", () => {
    render(
      <PieceStats
        runAvgTimePerPieceSec={300}
        runAvgPcsHour={12}
        target={null}
      />,
    );
    expect(bg(screen.getByTestId("pqtt-tpp-current"))).toBe("rgb(255,255,255)");
    expect(bg(screen.getByTestId("pqtt-pph-current"))).toBe("rgb(255,255,255)");
  });

  it("white when avg is at or better than target (time/piece)", () => {
    render(
      <PieceStats
        runAvgTimePerPieceSec={200}   // < 240
        runAvgPcsHour={16}            // > 15 → better than target_min
        target={TARGET}
      />,
    );
    expect(bg(screen.getByTestId("pqtt-tpp-current"))).toBe("rgb(255,255,255)");
    expect(bg(screen.getByTestId("pqtt-pph-current"))).toBe("rgb(255,255,255)");
  });

  it("light-red (#F8CECC) when target < avg <= target+delay (time/piece)", () => {
    render(
      <PieceStats
        runAvgTimePerPieceSec={250}   // 240 < 250 <= 270
        runAvgPcsHour={16}
        target={TARGET}
      />,
    );
    expect(bg(screen.getByTestId("pqtt-tpp-current"))).toBe("rgb(248,206,204)"); // #F8CECC
  });

  it("bright-red (#FF3D11) when avg > target+delay (time/piece)", () => {
    render(
      <PieceStats
        runAvgTimePerPieceSec={300}   // > 270
        runAvgPcsHour={10}
        target={TARGET}
      />,
    );
    expect(bg(screen.getByTestId("pqtt-tpp-current"))).toBe("rgb(255,61,17)"); // #FF3D11
  });

  it("bright-red (#FF3D11) when current < TargetAvgPcsHour_Min (pcs/hour)", () => {
    render(
      <PieceStats
        runAvgTimePerPieceSec={200}
        runAvgPcsHour={10}            // < 13.33 < 15 → FF3D11
        target={TARGET}
      />,
    );
    expect(bg(screen.getByTestId("pqtt-pph-current"))).toBe("rgb(255,61,17)");
  });

  it("white when '—' (no data yet)", () => {
    render(
      <PieceStats
        runAvgTimePerPieceSec={null}
        runAvgPcsHour={null}
        target={TARGET}
      />,
    );
    expect(bg(screen.getByTestId("pqtt-tpp-current"))).toBe("rgb(255,255,255)");
    expect(bg(screen.getByTestId("pqtt-pph-current"))).toBe("rgb(255,255,255)");
  });
});
