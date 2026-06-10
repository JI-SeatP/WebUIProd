import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  closeProductionRun,
  finishPiece,
  getOpTargets,
  getStats,
  heartbeat,
  startProductionRun,
  type StartRunInput,
  type TargetRow,
  type StatsData,
  type StartRunResult,
} from "@/api/pqtt";
// useBeforeUnloadClose intentionally NOT imported here: on reload / tab-close
// we want the open PRSEQ to survive so the operator can resume on the next
// mount. The 5-min freshness window on PQTT_StartRun plus the orphan-close
// triggered by any non-PROD status change handle stale runs.
import { formatPieceTimer, usePieceTimer } from "../../hooks/usePieceTimer";
import {
  computeShiftWindow,
  toSqlLocalIso,
} from "../../utils/shiftWindow";
import { PieceCounter } from "./PieceCounter";
import { PieceStats } from "./PieceStats";
import { IdleCheckModal } from "./IdleCheckModal";

/** Heartbeat interval (ms) by machine family. Returns 0 for "no heartbeat". */
function heartbeatIntervalMs(fmcode: string): number {
  const f = (fmcode ?? "").toUpperCase();
  if (f.includes("CNC") || f.includes("SAND")) return 45_000;       // 45s
  if (f.includes("PRESS")) return 5 * 60_000;                       // 5 min
  return 0;
}

export interface PQTTOperationKey {
  TRANSAC: number;
  OPSEQ: number;
  OPCODE: string;
  NOPSEQ: number;
  MASEQ: number;
  MACODE: string;
  /** Machine family code — drives the heartbeat interval. CNC/SAND → 45s,
   *  PRESS → 5 min, everything else → no heartbeat. */
  FMCODE: string;
  TJSEQ: number | null;
  INSEQ: number | null;
  NISEQ: number | null;
}

export interface PQTTToolbarProps {
  /** Stable operation key derived from the operation page. */
  opKey: PQTTOperationKey;
  /** EMP_NUM chosen in the OPConfirmModal. */
  empNum: string;
  /** Logged-in operator's shift window times (EQDEBUTQUART/EQFINQUART). */
  shiftStartHms: string;
  shiftEndHms: string;
  /**
   * Triggered when the toolbar cannot start the run (e.g. DB error). The
   * parent should roll back the status change.
   */
  onStartFailed?: () => void;
  /**
   * Triggered when the operator answers "No" to the idle-check modal.
   * The parent should close the production run and flip the operation
   * status to PAUSE. PQTT will then unmount on its own.
   */
  onIdleStop?: () => void;
  /**
   * Imperative ref for the parent to log a final piece + close the run.
   * Returns the closing promise so the caller can await it before navigating.
   */
  imperativeRef?: React.MutableRefObject<PQTTImperativeApi | null>;
}

export interface PQTTImperativeApi {
  /** Close the current PRSEQ. If `withPiece` is set, log that piece first. */
  closeRun: (withPiece?: "GOOD" | "DEF") => Promise<void>;
  /** Whether an open PRDETSEQ exists (i.e. a piece is in flight). */
  hasOpenPiece: () => boolean;
  /** Snapshot of the current PRSEQ totals + operator. Used by the
   *  questionnaire-handoff flow when the operator changes status to
   *  STOP / ON_HOLD / COMP. */
  getSnapshot: () => {
    PRSEQ: number;
    totalGood: number;
    totalDef: number;
    empNum: string;
  } | null;
}

/**
 * Top-level PQTT bar. Mounted only when status === "PROD" and the operation
 * is not a VENPR/OPSEQ=1 (the parent enforces that).
 *
 * Lifecycle:
 *   mount   → start run (resume open PRSEQ within 5 min if same EMP_NUM,
 *             else defensive close of orphans + insert fresh PRSEQ/PRDETSEQ)
 *   click   → finishPiece (close current PRDETSEQ, bump totals, open new one)
 *   unmount → close run (PR_End + close open PRDETSEQ)
 *   tab close / reload → PRSEQ deliberately stays open so the operator can
 *             resume on next mount. Stale runs are cleaned up by the 5-min
 *             freshness window in StartRun and by PQTT_CloseRunsForKey on
 *             every non-PROD status change.
 */
export function PQTTToolbar({
  opKey,
  empNum,
  shiftStartHms,
  shiftEndHms,
  onStartFailed,
  onIdleStop,
  imperativeRef,
}: PQTTToolbarProps) {
  const { t } = useTranslation();

  const [run, setRun] = useState<StartRunResult | null>(null);
  // Mirror the latest run into a ref so unmount cleanup sees current values.
  const runRef = useRef<StartRunResult | null>(null);
  useEffect(() => {
    runRef.current = run;
  }, [run]);
  const [totalGood, setTotalGood] = useState(0);
  const [totalDef, setTotalDef] = useState(0);
  const [historical, setHistorical] = useState<StatsData>({
    sumGood: 0,
    sumDef: 0,
    totalSeconds: 0,
  });
  const [target, setTarget] = useState<TargetRow | null>(null);
  const [finishing, setFinishing] = useState(false);
  const startedRef = useRef(false);

  // Idle detection: the modal opens at most once per PRDETSEQ. The ref is
  // reset when a Finish click commits and a fresh detail row is opened.
  const [idleModalOpen, setIdleModalOpen] = useState(false);
  const idleAlertedRef = useRef(false);

  // ── Timer ──
  const { seconds: timerSec, reset: resetTimer, format: timerDisplay } = usePieceTimer({
    running: run !== null,
    initialSeconds: 0,
  });

  // (No beforeunload close — see the comment at the top of this file.)

  // ── Heartbeat ──
  // While the toolbar is mounted and a run is active, periodically touch
  // PR_LastUpdate. Interval depends on machine family (CNC=45s, PRESS=5min).
  // Other families skip the heartbeat entirely.
  useEffect(() => {
    if (!run) return;
    const intervalMs = heartbeatIntervalMs(opKey.FMCODE);
    if (intervalMs <= 0) {
      console.log("[PQTT] heartbeat disabled for FMCODE=", opKey.FMCODE);
      return;
    }
    console.log("[PQTT] heartbeat armed every", intervalMs, "ms for FMCODE=", opKey.FMCODE);
    const id = setInterval(() => {
      heartbeat(run.PRSEQ).catch((e) => console.warn("[PQTT] heartbeat failed:", e));
    }, intervalMs);
    return () => clearInterval(id);
  }, [run, opKey.FMCODE]);

  // ── Idle detection ──
  // Open the "Still working?" modal once when the in-flight piece exceeds
  // 2× target time per piece. Skipped entirely when no target is defined.
  useEffect(() => {
    if (!run) return;
    if (idleAlertedRef.current) return;
    if (idleModalOpen) return;
    if (!target || !target.TargetTimePerPiece || target.TargetTimePerPiece <= 0) return;
    const threshold = 2 * target.TargetTimePerPiece;
    if (timerSec >= threshold) {
      console.log("[PQTT] idle detected — timer", timerSec, "≥ 2×target", threshold);
      idleAlertedRef.current = true;
      setIdleModalOpen(true);
    }
  }, [timerSec, target, run, idleModalOpen]);

  // ── Start run on mount ──
  // Note: NO local cancellation flag. Under React 18 StrictMode the cleanup
  // fires between the first mount and the second, which would set cancelled=true
  // before the promise resolves — preventing setRun(...) from ever running.
  // The startedRef.current guard already ensures the fetch chain fires only once.
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    const input: StartRunInput = {
      TRANSAC: opKey.TRANSAC,
      OPSEQ: opKey.OPSEQ,
      OPCODE: opKey.OPCODE,
      NOPSEQ: opKey.NOPSEQ,
      MASEQ: opKey.MASEQ,
      INSEQ: opKey.INSEQ,
      NISEQ: opKey.NISEQ,
      TJSEQ: opKey.TJSEQ,
      EMP_NUM: empNum,
    };
    console.log("[PQTT] mount → opKey:", opKey, "empNum:", empNum, "shift:", shiftStartHms, "→", shiftEndHms);
    console.log("[PQTT] → startProductionRun input:", input);
    const sw0 = computeShiftWindow(shiftStartHms, shiftEndHms);
    console.log("[PQTT] computed shift window:", sw0);

    Promise.all([
      startProductionRun(input),
      getOpTargets({
        MACODE: opKey.MACODE,
        TRANSAC: opKey.TRANSAC,
        INSEQ: opKey.INSEQ ?? 0,
        OPSEQ: opKey.OPSEQ,
        NISEQ: opKey.NISEQ,
      }),
      (() => {
        const sw = computeShiftWindow(shiftStartHms, shiftEndHms);
        if (!sw) {
          return Promise.resolve({
            success: true,
            data: { sumGood: 0, sumDef: 0, totalSeconds: 0 } as StatsData,
          });
        }
        return getStats({
          TRANSAC: opKey.TRANSAC,
          NOPSEQ: opKey.NOPSEQ,
          OPSEQ: opKey.OPSEQ,
          MASEQ: opKey.MASEQ,
          INSEQ: opKey.INSEQ,
          NISEQ: opKey.NISEQ,
          EMP_NUM: empNum,
          shiftStart: toSqlLocalIso(sw.shiftStart),
          shiftEnd: toSqlLocalIso(sw.shiftEnd),
        });
      })(),
    ])
      .then(([startRes, targetRes, statsRes]) => {
        console.log("[PQTT] ← startProductionRun:", startRes);
        console.log("[PQTT] ← getOpTargets:", targetRes);
        console.log("[PQTT] ← getStats:", statsRes);
        if (!startRes.success || !startRes.data) {
          console.warn("[PQTT] StartRun failed:", startRes.error);
          toast.error(t("pqtt.errors.startFailed"));
          onStartFailed?.();
          return;
        }
        const data = startRes.data;
        setRun(data);
        if (targetRes.success) setTarget(targetRes.data ?? null);
        if (statsRes.success && statsRes.data) setHistorical(statsRes.data);
        // Seed the in-flight totals from the server. On a fresh start these
        // are 0; on resume they reflect whatever was already logged before
        // the page was reloaded / remounted.
        setTotalGood(data.TotalGood ?? 0);
        setTotalDef(data.TotalDef ?? 0);
        // Seed the timer: 0 on fresh start, server-computed elapsed seconds
        // on resume so the counter doesn't restart from 0.
        resetTimer(data.pieceElapsedSec ?? 0);
        // If we resumed, briefly let the operator know — explains why the
        // timer is non-zero on what looks like a fresh page load.
        if (data.resumed) {
          toast.info(
            t("pqtt.resumedToast", {
              good: data.TotalGood,
              def: data.TotalDef,
              elapsed: formatPieceTimer(data.pieceElapsedSec ?? 0),
            }),
            { duration: 4000 },
          );
        }
        console.log(
          "[PQTT] run state set;",
          data.resumed ? "RESUMED" : "fresh",
          "PRSEQ=", data.PRSEQ,
          "PRDETSEQ=", data.PRDETSEQ,
          "pieceElapsedSec=", data.pieceElapsedSec,
          "TotalGood/Def=", data.TotalGood, "/", data.TotalDef,
        );
      })
      .catch((err) => {
        console.error("[PQTT] mount fetch chain error:", err);
        toast.error(t("pqtt.errors.startFailed"));
        onStartFailed?.();
      });

    // No cleanup that mutates a cancellation flag — see comment at top of effect.
    // Initial mount only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Finish piece ──
  const handleFinish = useCallback(
    async (kind: "GOOD" | "DEF") => {
      console.log("[PQTT] FinishPiece click:", kind, "current timer (sec):", timerSec, "run:", run);
      if (!run || finishing) {
        console.warn("[PQTT] FinishPiece ignored — run is null or already finishing");
        return;
      }
      const sw = computeShiftWindow(shiftStartHms, shiftEndHms);
      if (!sw) {
        console.warn("[PQTT] FinishPiece aborted — no shift window");
        return;
      }

      setFinishing(true);
      // Optimistic update
      const prevGood = totalGood;
      const prevDef = totalDef;
      if (kind === "GOOD") setTotalGood((v) => v + 1);
      else setTotalDef((v) => v + 1);

      try {
        const payload = {
          PRSEQ: run.PRSEQ,
          PRDETSEQ: run.PRDETSEQ,
          kind,
          pieceSeconds: timerSec,
          shiftStart: toSqlLocalIso(sw.shiftStart),
          shiftEnd: toSqlLocalIso(sw.shiftEnd),
        };
        console.log("[PQTT] → finishPiece payload:", payload);
        const res = await finishPiece(payload);
        console.log("[PQTT] ← finishPiece response:", res);
        if (!res.success || !res.data) {
          console.warn("[PQTT] finishPiece failed:", res.error);
          setTotalGood(prevGood);
          setTotalDef(prevDef);
          toast.error(t("pqtt.errors.finishFailed"), { duration: 4000 });
          return;
        }
        // Adopt new PRDETSEQ; update authoritative totals + stats.
        setRun((cur) =>
          cur
            ? {
                ...cur,
                PRDETSEQ: res.data.nextPRDETSEQ,
                PR_DetStart: res.data.PR_DetStart,
              }
            : cur,
        );
        setTotalGood(res.data.TotalGood);
        setTotalDef(res.data.TotalDef);
        setHistorical(res.data.stats);
        resetTimer();
        // A new PRDETSEQ is open — re-arm idle detection for it.
        idleAlertedRef.current = false;
        console.log("[PQTT] piece committed. nextPRDETSEQ=", res.data.nextPRDETSEQ, "Good=", res.data.TotalGood, "Def=", res.data.TotalDef, "stats=", res.data.stats);
      } catch (e) {
        console.error("[PQTT] finishPiece threw:", e);
        setTotalGood(prevGood);
        setTotalDef(prevDef);
        toast.error(t("pqtt.errors.finishFailed"), { duration: 4000 });
      } finally {
        setFinishing(false);
      }
    },
    [run, finishing, shiftStartHms, shiftEndHms, timerSec, totalGood, totalDef, resetTimer, t],
  );

  // ── Imperative API for the parent (close + optional final piece + snapshot) ──
  // We rebuild the ref any time the underlying values (run / totals) change,
  // so callers always read fresh data. Reads go through closures captured at
  // each render, so the snapshot reflects the latest totals after the most
  // recent FinishPiece commit.
  useEffect(() => {
    if (!imperativeRef) return;
    imperativeRef.current = {
      hasOpenPiece: () => run !== null && timerSec > 0,
      closeRun: async (withPiece) => {
        if (!run) return;
        if (withPiece) {
          await handleFinish(withPiece);
        }
        const cur = runRef.current ?? run;
        try {
          await closeProductionRun({ PRSEQ: cur.PRSEQ, PRDETSEQ: cur.PRDETSEQ });
        } catch {
          // Defensive close on next StartRun will catch this anyway.
        }
      },
      getSnapshot: () => {
        if (!run) return null;
        return {
          PRSEQ: run.PRSEQ,
          totalGood,
          totalDef,
          empNum,
        };
      },
    };
    return () => {
      if (imperativeRef) imperativeRef.current = null;
    };
  }, [imperativeRef, run, timerSec, totalGood, totalDef, empNum, handleFinish]);

  // ── Close on unmount (StatusActionBar moved away from PROD without using
  //    the imperative API, e.g. navigation by another path). Uses runRef so
  //    the cleanup sees the latest PRSEQ even though the effect itself runs
  //    once on mount. ──
  useEffect(() => {
    return () => {
      const cur = runRef.current;
      if (!cur) {
        console.log("[PQTT] unmount — no active run to close");
        return;
      }
      console.log("[PQTT] unmount → closeProductionRun PRSEQ=", cur.PRSEQ, "PRDETSEQ=", cur.PRDETSEQ);
      // Fire-and-forget so unmount returns immediately.
      void closeProductionRun({ PRSEQ: cur.PRSEQ, PRDETSEQ: cur.PRDETSEQ });
    };
  }, []);

  // ── Derived stats display ──
  // RunAvgTimePerPiece (seconds/piece) across the matching key + shift,
  // including this PRSEQ's already-closed pieces.
  const totalPieces = historical.sumGood + historical.sumDef;
  const runAvgTimePerPieceSec = totalPieces > 0 ? historical.totalSeconds / totalPieces : null;
  const runAvgPcsHour =
    historical.totalSeconds > 0
      ? (totalPieces * 3600) / historical.totalSeconds
      : null;
  console.log(
    "[PQTT] render — historical:", historical,
    "totalPieces:", totalPieces,
    "runAvgTimePerPieceSec:", runAvgTimePerPieceSec,
    "runAvgPcsHour:", runAvgPcsHour,
    "target:", target,
  );

  return (
    <div
      className="fixed bottom-5 left-1/2 -translate-x-1/2 z-40 flex flex-wrap items-center justify-center gap-3"
      style={{ pointerEvents: "auto" }}
    >
      <PieceCounter
        totalGood={totalGood}
        totalDef={totalDef}
        timerDisplay={timerDisplay()}
        finishDisabled={finishing || run === null}
        onFinish={handleFinish}
      />
      <PieceStats
        runAvgTimePerPieceSec={runAvgTimePerPieceSec}
        runAvgPcsHour={runAvgPcsHour}
        target={
          target
            ? {
                TargetTimePerPiece: target.TargetTimePerPiece,
                PT_Delay: target.PT_Delay,
                TargetAvgPcsHour: target.TargetAvgPcsHour,
                TargetAvgPcsHour_Min: target.TargetAvgPcsHour_Min,
              }
            : null
        }
      />
      {/* Silence unused warning in some toolchains for formatPieceTimer */}
      <span className="hidden">{formatPieceTimer(0)}</span>

      <IdleCheckModal
        open={idleModalOpen}
        pieceSeconds={timerSec}
        targetSeconds={target?.TargetTimePerPiece ?? 0}
        onContinue={() => {
          console.log("[PQTT] idle modal → continue");
          setIdleModalOpen(false);
        }}
        onStop={async () => {
          console.log("[PQTT] idle modal → stop");
          setIdleModalOpen(false);
          const cur = runRef.current;
          if (cur) {
            try {
              await closeProductionRun({ PRSEQ: cur.PRSEQ, PRDETSEQ: cur.PRDETSEQ });
            } catch (e) {
              console.warn("[PQTT] idle stop closeRun failed:", e);
            }
          }
          onIdleStop?.();
        }}
      />
    </div>
  );
}
