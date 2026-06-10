import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { PQTTToolbar, type PQTTOperationKey } from "../PQTTToolbar";

const startMock = vi.fn();
const finishMock = vi.fn();
const closeMock = vi.fn();
const targetsMock = vi.fn();
const statsMock = vi.fn();

vi.mock("@/api/pqtt", () => ({
  startProductionRun: (...a: unknown[]) => startMock(...a),
  finishPiece: (...a: unknown[]) => finishMock(...a),
  closeProductionRun: (...a: unknown[]) => closeMock(...a),
  getOpTargets: (...a: unknown[]) => targetsMock(...a),
  getStats: (...a: unknown[]) => statsMock(...a),
  closeProductionRunBeacon: vi.fn(() => true),
}));

const opKey: PQTTOperationKey = {
  TRANSAC: 1001,
  OPSEQ: 5,
  OPCODE: "PRESS",
  NOPSEQ: 2,
  MASEQ: 42,
  MACODE: "P-01",
  FMCODE: "PRESS-MAIN", // includes "PRESS" → 5min heartbeat (won't fire during the short tests)
  TJSEQ: 999,
  INSEQ: 77,
  NISEQ: null,
};

describe("PQTTToolbar", () => {
  beforeEach(() => {
    startMock.mockReset();
    finishMock.mockReset();
    closeMock.mockReset();
    targetsMock.mockReset();
    statsMock.mockReset();

    startMock.mockResolvedValue({
      success: true,
      data: {
        PRSEQ: 100,
        PRDETSEQ: 200,
        PR_Start: "2026-05-12T08:00:00",
        PR_DetStart: "2026-05-12T08:00:00",
      },
    });
    targetsMock.mockResolvedValue({
      success: true,
      data: {
        MACODE: "P-01",
        OPSEQ: 5,
        NISEQ: null,
        TRANSAC: 1001,
        INSEQ: 77,
        TargetTimePerPiece: 240,
        PT_Delay: 30,
        TargetAvgPcsHour: 13.33,
        TargetAvgPcsHour_Min: 15.0,
      },
    });
    statsMock.mockResolvedValue({
      success: true,
      data: { sumGood: 0, sumDef: 0, totalSeconds: 0 },
    });
    finishMock.mockResolvedValue({
      success: true,
      data: {
        nextPRDETSEQ: 201,
        PR_DetStart: "2026-05-12T08:05:00",
        TotalGood: 1,
        TotalDef: 0,
        TotalSeconds: 60,
        stats: { sumGood: 1, sumDef: 0, totalSeconds: 60 },
      },
    });
    closeMock.mockResolvedValue({ success: true, data: "" });
  });

  it("calls startProductionRun once with the full op key + EMP_NUM on mount", async () => {
    render(
      <PQTTToolbar
        opKey={opKey}
        empNum="12345"
        shiftStartHms="07:00:00"
        shiftEndHms="15:30:00"
      />,
    );

    await waitFor(() => expect(startMock).toHaveBeenCalledTimes(1));
    expect(startMock).toHaveBeenCalledWith(
      expect.objectContaining({
        TRANSAC: 1001,
        OPSEQ: 5,
        OPCODE: "PRESS",
        NOPSEQ: 2,
        MASEQ: 42,
        INSEQ: 77,
        NISEQ: null,
        TJSEQ: 999,
        EMP_NUM: "12345",
      }),
    );
  });

  it("Good click bumps TotalGood and posts finishPiece kind=GOOD", async () => {
    render(
      <PQTTToolbar
        opKey={opKey}
        empNum="12345"
        shiftStartHms="07:00:00"
        shiftEndHms="15:30:00"
      />,
    );

    await waitFor(() => expect(startMock).toHaveBeenCalled());

    // Open the FinishPiece popover
    fireEvent.click(screen.getByText(/FINISH PIECE|TERMINER/i));
    // Click "Good"/"Bon"
    const goodBtn = await screen.findByRole("button", { name: /Good|Bon/i });
    fireEvent.click(goodBtn);

    await waitFor(() => expect(finishMock).toHaveBeenCalledTimes(1));
    expect(finishMock).toHaveBeenCalledWith(
      expect.objectContaining({
        PRSEQ: 100,
        PRDETSEQ: 200,
        kind: "GOOD",
      }),
    );
  });

  it("Defective click posts finishPiece kind=DEF", async () => {
    render(
      <PQTTToolbar
        opKey={opKey}
        empNum="12345"
        shiftStartHms="07:00:00"
        shiftEndHms="15:30:00"
      />,
    );
    await waitFor(() => expect(startMock).toHaveBeenCalled());

    fireEvent.click(screen.getByText(/FINISH PIECE|TERMINER/i));
    const defBtn = await screen.findByRole("button", { name: /Defective|Défectueuse/i });
    fireEvent.click(defBtn);

    await waitFor(() => expect(finishMock).toHaveBeenCalledTimes(1));
    expect(finishMock).toHaveBeenCalledWith(expect.objectContaining({ kind: "DEF" }));
  });

  it("calls closeProductionRun on unmount", async () => {
    const { unmount } = render(
      <PQTTToolbar
        opKey={opKey}
        empNum="12345"
        shiftStartHms="07:00:00"
        shiftEndHms="15:30:00"
      />,
    );
    await waitFor(() => expect(startMock).toHaveBeenCalled());
    unmount();
    await waitFor(() =>
      expect(closeMock).toHaveBeenCalledWith({ PRSEQ: 100, PRDETSEQ: 200 }),
    );
  });

  it("rolls back via onStartFailed when StartRun fails", async () => {
    startMock.mockResolvedValueOnce({ success: false, data: null, error: "boom" });
    const onStartFailed = vi.fn();
    render(
      <PQTTToolbar
        opKey={opKey}
        empNum="12345"
        shiftStartHms="07:00:00"
        shiftEndHms="15:30:00"
        onStartFailed={onStartFailed}
      />,
    );
    await waitFor(() => expect(onStartFailed).toHaveBeenCalled());
  });
});
