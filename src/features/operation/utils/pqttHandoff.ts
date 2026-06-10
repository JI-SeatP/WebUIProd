/**
 * Handoff record written by PQTT when the operator leaves PROD for STOP /
 * ON_HOLD / COMP, and read by the QuestionnairePage on mount.
 *
 * Stored in sessionStorage so it survives the navigate() but is naturally
 * scoped to a single tab and goes away on logout / refresh.
 */
const KEY_PREFIX = "pqtt:handoff";

export type PqttHandoffAction = "STOP" | "ON_HOLD" | "COMP";

export interface PqttHandoff {
  action: PqttHandoffAction;
  /** Originating PRSEQ — useful for debugging / cross-referencing. */
  PRSEQ: number;
  totalGood: number;
  totalDef: number;
  /** EMP_NUM (EMNOIDENT) of the operator that ran the PRSEQ. */
  empNum: string;
  /** Wall-clock when stashed. We treat the handoff as stale if it's > 60s old. */
  stashedAt: number;
}

function keyFor(transac: number | string, copmachine: number | string | null) {
  return `${KEY_PREFIX}:${transac}:${copmachine ?? 0}`;
}

/** Persist a snapshot for the questionnaire to read. Called from
 *  OperationDetailsPage.beforeCommit just after closeRun. */
export function stashPqttHandoff(
  action: PqttHandoffAction | string,
  transac: number | string,
  copmachine: number | string | null,
  snapshot: { PRSEQ: number; totalGood: number; totalDef: number; empNum: string } | null | undefined,
) {
  if (!snapshot) return;
  // Only the three status flips we care about; ignore everything else (PAUSE, etc.)
  if (action !== "STOP" && action !== "ON_HOLD" && action !== "COMP") return;
  const record: PqttHandoff = {
    action: action as PqttHandoffAction,
    PRSEQ: snapshot.PRSEQ,
    totalGood: snapshot.totalGood,
    totalDef: snapshot.totalDef,
    empNum: snapshot.empNum,
    stashedAt: Date.now(),
  };
  try {
    sessionStorage.setItem(keyFor(transac, copmachine), JSON.stringify(record));
    console.log("[PQTT] handoff stashed:", record);
  } catch (err) {
    console.warn("[PQTT] failed to stash handoff:", err);
  }
}

/** Read and consume the handoff record. Returns null if no record exists or
 *  the stash is older than 60 seconds (stale → ignore). The record is
 *  deleted on read so a manual page reload doesn't double-apply. */
export function consumePqttHandoff(
  transac: number | string,
  copmachine: number | string | null,
): PqttHandoff | null {
  const key = keyFor(transac, copmachine);
  let raw: string | null;
  try {
    raw = sessionStorage.getItem(key);
  } catch {
    return null;
  }
  if (!raw) return null;
  try {
    sessionStorage.removeItem(key);
  } catch {
    /* ignore */
  }
  let parsed: PqttHandoff;
  try {
    parsed = JSON.parse(raw) as PqttHandoff;
  } catch {
    return null;
  }
  if (typeof parsed.stashedAt !== "number" || Date.now() - parsed.stashedAt > 60_000) {
    return null;
  }
  return parsed;
}
