import { apiGet, apiPost } from "./client";

// ──────────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────────

/** Compact employee row returned by GetEmpList.cfm. Distinct from the
 *  richer `Employee` type in `src/types/employee.ts`. */
export interface PqttEmployee {
  EMP_NUM: string;
  EMP_NOM: string;
}

export interface OperationKey {
  TRANSAC: number;
  NOPSEQ: number;
  OPSEQ: number;
  MASEQ: number;
  /** INVENTAIRE_SEQ — nullable for non-inventory operations */
  INSEQ: number | null;
  /** Panel_NiSeq — only for kits */
  NISEQ: number | null;
}

export interface StartRunInput extends OperationKey {
  OPCODE: string;
  TJSEQ: number | null;
  EMP_NUM: string;
}

export interface StartRunResult {
  PRSEQ: number;
  PRDETSEQ: number;
  PR_Start: string;
  PR_DetStart: string;
  /** True when the server reused an existing open PRSEQ rather than
   *  creating a new one. The client should seed the timer from
   *  `pieceElapsedSec` so a refresh / remount doesn't restart at 0. */
  resumed: boolean;
  /** Seconds the currently open PRDETSEQ has been running, computed
   *  server-side from PR_DetStart vs the server's current time. */
  pieceElapsedSec: number;
  /** Totals on the resumed PRSEQ (0 when freshly created). */
  TotalGood: number;
  TotalDef: number;
  /** Accumulated PR_TotalTime in seconds on the resumed PRSEQ. */
  PR_TotalSeconds: number;
}

export interface ShiftWindow {
  shiftStart: string; // ISO datetime
  shiftEnd: string;   // ISO datetime
}

export interface FinishPieceInput {
  PRSEQ: number;
  PRDETSEQ: number;
  kind: "GOOD" | "DEF";
  pieceSeconds: number;
  shiftStart: string;
  shiftEnd: string;
}

export interface FinishPieceResult {
  nextPRDETSEQ: number;
  PR_DetStart: string;
  TotalGood: number;
  TotalDef: number;
  /** PRSEQ's own PR_TotalTime, in seconds */
  TotalSeconds: number;
  /** Shift-scoped aggregate across all matching PRSEQs */
  stats: StatsData;
}

export interface CloseRunInput {
  PRSEQ: number;
  PRDETSEQ: number | null;
}

export interface StatsData {
  sumGood: number;
  sumDef: number;
  totalSeconds: number;
}

export interface GetStatsInput extends OperationKey, ShiftWindow {
  EMP_NUM: string;
}

export interface GetOpTargetsInput {
  /** MACHINE_CODE string */
  MACODE: string;
  /** TRSEQ (alias of TRANSAC in the targets table) */
  TRANSAC: number;
  /** INVENTAIRE column */
  INSEQ: number;
  /** Integer OPSEQ (stored in WUI_WOPM_Targets.OPCODE) */
  OPSEQ: number;
  NISEQ: number | null;
}

export interface TargetRow {
  MACODE: string;
  OPSEQ: number;
  NISEQ: number | null;
  TRANSAC: number;
  INSEQ: number;
  /** seconds */
  TargetTimePerPiece: number;
  /** seconds */
  PT_Delay: number;
  /** Pieces / hour, including delay */
  TargetAvgPcsHour: number | null;
  /** Pieces / hour, ideal (no delay) */
  TargetAvgPcsHour_Min: number | null;
}

// ──────────────────────────────────────────────────────────────────────────
// Endpoint wrappers
// ──────────────────────────────────────────────────────────────────────────

export function getEmployees() {
  return apiGet<PqttEmployee[]>("GetEmpList.cfm");
}

export function startProductionRun(input: StartRunInput) {
  return apiPost<StartRunResult>("PQTT_StartRun.cfm", input as unknown as Record<string, unknown>);
}

export function finishPiece(input: FinishPieceInput) {
  return apiPost<FinishPieceResult>("PQTT_FinishPiece.cfm", input as unknown as Record<string, unknown>);
}

export function closeProductionRun(input: CloseRunInput) {
  return apiPost<unknown>("PQTT_CloseRun.cfm", input as unknown as Record<string, unknown>);
}

/** Touches PR_LastUpdate so the resume window (5 min) stays open while the
 *  toolbar is mounted. Fire-and-forget; failures are logged but ignored. */
export function heartbeat(PRSEQ: number) {
  return apiPost<unknown>("PQTT_Heartbeat.cfm", { PRSEQ });
}

/**
 * sendBeacon variant — fires on tab close / page navigation. Returns boolean
 * synchronously (true if the browser queued the request). Falls back to the
 * regular POST if sendBeacon is unavailable (e.g. tests).
 *
 * IMPORTANT: must use the *same* URL convention as `apiPost` (Vite dev proxy
 * adds /api in dev; in prod the BASE_URL is /STPWEB/.../queries).
 */
export function closeProductionRunBeacon(input: CloseRunInput): boolean {
  const API_BASE = import.meta.env.DEV
    ? "/api"
    : import.meta.env.BASE_URL.replace(/web\/$/, "queries");
  const url = `${API_BASE}/PQTT_CloseRun.cfm`;
  const payload = JSON.stringify(input);

  if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
    // sendBeacon accepts Blobs; mark JSON content-type so the server parses it.
    const blob = new Blob([payload], { type: "application/json" });
    return navigator.sendBeacon(url, blob);
  }

  // Fallback: best-effort fire-and-forget fetch (will likely be aborted on
  // tab close, but harmless if it lands).
  try {
    void fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
      keepalive: true,
    });
    return true;
  } catch {
    return false;
  }
}

export function getStats(input: GetStatsInput) {
  const q = new URLSearchParams();
  q.set("TRANSAC", String(input.TRANSAC));
  q.set("NOPSEQ", String(input.NOPSEQ));
  q.set("OPSEQ", String(input.OPSEQ));
  q.set("MASEQ", String(input.MASEQ));
  if (input.INSEQ != null) q.set("INSEQ", String(input.INSEQ));
  if (input.NISEQ != null) q.set("NISEQ", String(input.NISEQ));
  q.set("EMP_NUM", input.EMP_NUM);
  q.set("shiftStart", input.shiftStart);
  q.set("shiftEnd", input.shiftEnd);
  return apiGet<StatsData>(`PQTT_GetStats.cfm?${q.toString()}`);
}

export function getOpTargets(input: GetOpTargetsInput) {
  const q = new URLSearchParams();
  q.set("MACODE", input.MACODE);
  q.set("TRANSAC", String(input.TRANSAC));
  q.set("INSEQ", String(input.INSEQ));
  q.set("OPSEQ", String(input.OPSEQ));
  if (input.NISEQ != null) q.set("NISEQ", String(input.NISEQ));
  return apiGet<TargetRow | null>(`PQTT_OpTargets_Get.cfm?${q.toString()}`);
}
