import { useTranslation } from "react-i18next";
import { W_PQTT_TOOLBAR } from "@/constants/widths";
import { cn } from "@/lib/utils";
import { formatPieceTimer } from "../../hooks/usePieceTimer";

export interface PieceStatsValues {
  /** Current rolling average time per piece, in seconds. null = no data yet. */
  runAvgTimePerPieceSec: number | null;
  /** Current rolling pieces per hour. null = no data yet. */
  runAvgPcsHour: number | null;
  /** Target row from PQTT_OpTargets_Get; null when no target defined. */
  target: {
    /** Seconds */
    TargetTimePerPiece: number;
    /** Seconds */
    PT_Delay: number;
    TargetAvgPcsHour: number | null;
    TargetAvgPcsHour_Min: number | null;
  } | null;
}

interface PieceStatsProps extends PieceStatsValues {}

/**
 * Right container of the PQTT bar: two stat boxes (Minutes/Piece and
 * Pieces/Hour). Each shows a CURRENT value and a TARGET value with
 * conditional background coloring per the rules in the spec.
 *
 * When `target` is null:
 *   - CURRENT values render normally (not dimmed) per the user's clarification.
 *   - TARGET cells show "—" with no coloring applied to CURRENT.
 */
export function PieceStats({
  runAvgTimePerPieceSec,
  runAvgPcsHour,
  target,
}: PieceStatsProps) {
  const { t } = useTranslation();

  // ── Time per piece colour rule ──
  // White by default. If target exists and we have data:
  //   target < avg < target+delay → #F8CECC (light red, warning)
  //   avg > target+delay          → #FF3D11 (bright red, critical)
  const timePerPieceColor = (() => {
    if (!target || runAvgTimePerPieceSec === null) return "#FFFFFF";
    const tgt = target.TargetTimePerPiece;
    const delay = target.PT_Delay;
    if (runAvgTimePerPieceSec > tgt + delay) return "#FF3D11";
    if (runAvgTimePerPieceSec > tgt) return "#F8CECC";
    return "#FFFFFF";
  })();

  // ── Pieces / hour colour rule (corrected formula from user) ──
  //   TargetAvgPcsHour_Min < current < TargetAvgPcsHour → #F8CECC
  //   current < TargetAvgPcsHour_Min                   → #FF3D11
  const pcsHourColor = (() => {
    if (!target || runAvgPcsHour === null) return "#FFFFFF";
    const tgt = target.TargetAvgPcsHour;
    const tgtMin = target.TargetAvgPcsHour_Min;
    if (tgt === null || tgtMin === null) return "#FFFFFF";
    if (runAvgPcsHour < tgtMin) return "#FF3D11";
    if (runAvgPcsHour < tgt) return "#F8CECC";
    return "#FFFFFF";
  })();

  const fmtMinPerPc = (sec: number | null) =>
    sec === null || sec < 0 ? "—" : formatPieceTimer(sec);

  const fmtPcsHour = (v: number | null) =>
    v === null || !Number.isFinite(v) ? "—" : v.toFixed(0);

  return (
    <div
      className="rounded-2xl px-3 py-2 backdrop-blur border border-white/20 flex items-center gap-3"
      style={{
        backgroundColor: "rgba(64, 75, 79, 0.65)",
        boxShadow: "0 8px 10px rgba(0,0,0,0.5)",
        height: W_PQTT_TOOLBAR.heightPx,
      }}
    >
      <StatBox
        title={t("pqtt.minutesPerPiece")}
        currentLabel={t("pqtt.current")}
        targetLabel={t("pqtt.target")}
        currentValue={fmtMinPerPc(runAvgTimePerPieceSec)}
        targetValue={target ? fmtMinPerPc(target.TargetTimePerPiece) : "—"}
        currentBg={timePerPieceColor}
        targetBg="#D3F6D2"
        testPrefix="pqtt-tpp"
      />
      <StatBox
        title={t("pqtt.piecesPerHour")}
        currentLabel={t("pqtt.current")}
        targetLabel={t("pqtt.target")}
        currentValue={fmtPcsHour(runAvgPcsHour)}
        targetValue={fmtPcsHour(target?.TargetAvgPcsHour ?? null)}
        currentBg={pcsHourColor}
        targetBg="#D3F6D2"
        testPrefix="pqtt-pph"
      />
    </div>
  );
}

function StatBox({
  title,
  currentLabel,
  targetLabel,
  currentValue,
  targetValue,
  currentBg,
  targetBg,
  testPrefix,
}: {
  title: string;
  currentLabel: string;
  targetLabel: string;
  currentValue: string;
  targetValue: string;
  currentBg: string;
  targetBg: string;
  testPrefix: string;
}) {
  return (
    <div
      className={cn(
        W_PQTT_TOOLBAR.pieceStats.container,
        "rounded-md border border-black overflow-hidden flex flex-col",
      )}
      style={{
        backgroundColor: "#030D1B",
        height: W_PQTT_TOOLBAR.heightPx - 8,
      }}
    >
      <div
        className="text-center font-semibold uppercase tracking-wide"
        style={{
          color: "#E2E2E2",
          fontSize: 12,
          height: W_PQTT_TOOLBAR.pieceStats.titleHeightPx,
          lineHeight: `${W_PQTT_TOOLBAR.pieceStats.titleHeightPx}px`,
        }}
      >
        {title}
      </div>
      <div className="flex gap-1 px-1 pb-1">
        <ValueCell
          label={currentLabel}
          value={currentValue}
          background={currentBg}
          testRole={`${testPrefix}-current`}
        />
        <ValueCell
          label={targetLabel}
          value={targetValue}
          background={targetBg}
          testRole={`${testPrefix}-target`}
        />
      </div>
    </div>
  );
}

function ValueCell({
  label,
  value,
  background,
  testRole,
}: {
  label: string;
  value: string;
  background: string;
  testRole?: string;
}) {
  return (
    <div
      data-testid={testRole}
      className={cn(
        W_PQTT_TOOLBAR.pieceStats.valueBox,
        "rounded-sm border border-black flex flex-col items-center justify-between py-1",
      )}
      style={{
        backgroundColor: background,
        color: "#000",
        height: W_PQTT_TOOLBAR.pieceStats.valueHeightPx,
      }}
    >
      <div className="text-[10px] font-semibold tracking-wide">{label}</div>
      <div className="font-bold tabular-nums leading-none" style={{ fontSize: 28 }}>
        {value}
      </div>
    </div>
  );
}
