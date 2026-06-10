import { useTranslation } from "react-i18next";
import { W_PQTT_TOOLBAR } from "@/constants/widths";
import { cn } from "@/lib/utils";
import { FinishPieceButton } from "./FinishPieceButton";

interface PieceCounterProps {
  totalGood: number;
  totalDef: number;
  /** Formatted timer string (e.g. "4:53" or "1:02:14"). */
  timerDisplay: string;
  finishDisabled?: boolean;
  onFinish: (kind: "GOOD" | "DEF") => void;
}

/**
 * Left container of the PQTT bar: GOOD / DEF totals, piece timer, finish button.
 * Background and chrome match the StatusActionBar dark-glass aesthetic.
 */
export function PieceCounter({
  totalGood,
  totalDef,
  timerDisplay,
  finishDisabled,
  onFinish,
}: PieceCounterProps) {
  const { t } = useTranslation();

  return (
    <div
      className="rounded-2xl px-3 py-2 backdrop-blur border border-white/20 flex items-center gap-3"
      style={{
        backgroundColor: "rgba(64, 75, 79, 0.65)",
        boxShadow: "0 8px 10px rgba(0,0,0,0.5)",
        height: W_PQTT_TOOLBAR.heightPx,
      }}
    >
      {/* Totals (GOOD / DEF) — dark inner panel */}
      <div
        className="flex items-stretch rounded-md overflow-hidden border border-white/15"
        style={{ height: W_PQTT_TOOLBAR.rowHeightPx, backgroundColor: "#030D1B" }}
      >
        <TotalCell
          label={t("pqtt.totalGood")}
          value={totalGood}
          color="#75EE82"
        />
        <div className="w-px bg-white/15" />
        <TotalCell
          label={t("pqtt.totalDef")}
          value={totalDef}
          color="#FF6666"
        />
      </div>

      {/* Yellow piece timer */}
      <div
        className={cn(
          W_PQTT_TOOLBAR.pieceCounter.timer,
          "rounded-md border-2 flex items-center justify-center font-bold tabular-nums",
        )}
        style={{
          height: W_PQTT_TOOLBAR.rowHeightPx,
          backgroundColor: "#FFFF00",
          borderColor: "#000",
          color: "#000",
          fontSize: 32,
        }}
      >
        {timerDisplay}
      </div>

      {/* Finish piece button + popover */}
      <FinishPieceButton disabled={finishDisabled} onFinish={onFinish} />
    </div>
  );
}

function TotalCell({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div
      className={cn(
        W_PQTT_TOOLBAR.pieceCounter.totalCol,
        "flex flex-col items-center justify-between py-1",
      )}
    >
      <div className="text-[10px] font-semibold tracking-wide" style={{ color: "#E2E2E2" }}>
        {label}
      </div>
      <div
        className="font-bold tabular-nums leading-none"
        style={{ color, fontSize: 28 }}
      >
        {value}
      </div>
    </div>
  );
}
