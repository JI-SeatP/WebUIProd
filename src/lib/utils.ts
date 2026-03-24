import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Machine family sets matching the old ColdFusion code (operation.cfc lines 911-912,1015,1061).
 * Uses FAMILLEMACHINE integer IDs for exact parity with legacy logic.
 */
const FAMILLE_PRESSE = new Set([2, 38, 39, 40, 41, 42, 26, 16]);

/**
 * Check if a FAMILLEMACHINE ID is a press family.
 * Uses the integer ID set for exact match with old CF code,
 * with FMCODE string fallback for safety.
 */
export function isPressFamille(famillemachine: number | null | undefined, fmcode?: string | null): boolean {
  if (famillemachine != null && FAMILLE_PRESSE.has(famillemachine)) return true;
  // Fallback to FMCODE string check for any data that might not have FAMILLEMACHINE
  if (fmcode) {
    const fmc = fmcode.toUpperCase();
    return fmc.includes("PRESS") || fmc.includes("VENPR") || fmc.includes("FLATP");
  }
  return false;
}

/**
 * Displays the "Qté à fabriquer" field, matching the old software's logic.
 *
 * The old ColdFusion code (operation.cfc) uses FAMILLEMACHINE IDs:
 *   PRESS (2,16,26,38-42): DCQTE_A_PRESSER (+ DCQTE_REJET/PCS_PER_PANEL adjustment)
 *   Other:                  VBE.DCQTE_A_FAB (falls back to QTE_A_FAB)
 */
export function pressQtyDisplay(
  qteAFab: number | null | undefined,
  dcqteAPresser: number | null | undefined,
  dcqteRejet: number | null | undefined,
  fmcode: string | null | undefined,
  vbeDcqteAFab?: number | null | undefined,
  pcsPerPanel?: number | null | undefined,
  famillemachine?: number | null | undefined,
): string {
  if (isPressFamille(famillemachine, fmcode)) {
    // PRESS: show DCQTE_A_PRESSER (or VBE.DCQTE_A_FAB) + adjustment
    // LaQuantiteAjoutee = Ceiling(DCQTE_REJET / PCS_PER_PANEL) — matches old CF logic
    const base = (dcqteAPresser != null && dcqteAPresser > 0)
      ? dcqteAPresser
      : (vbeDcqteAFab ?? qteAFab ?? 0);
    const ppp = Math.ceil(Number(pcsPerPanel ?? 0));
    const rejet = ppp > 0 ? Math.ceil(Number(dcqteRejet ?? 0) / ppp) : 0;
    return rejet > 0 ? `${Math.ceil(base)} + ${rejet}` : String(Math.ceil(Number(base)));
  }

  // CNC / other: use VBE.DCQTE_A_FAB if available, else QTE_A_FAB
  const base = (vbeDcqteAFab != null && vbeDcqteAFab > 0) ? vbeDcqteAFab : (qteAFab ?? 0);
  return String(Math.ceil(Number(base)));
}

/**
 * Computes the remaining quantity (QTE_RESTANTE) the same way the legacy
 * ColdFusion code does in operation.cfc (lines 1009-1070).
 *
 * Uses FAMILLEMACHINE IDs for press detection (families 2,16,26,38-42).
 *   PRESS:  (LaQuantiteAFab + LaQuantiteAjoutee) - QTE_PRODUITE
 *   Other:  VBE_DCQTE_A_FAB (or QTE_A_FAB) - QTE_PRODUITE
 */
export function computeQteRestante(op: {
  QTE_A_FAB?: number | null;
  QTE_PRODUITE?: number | null;
  FMCODE?: string | null;
  FAMILLEMACHINE?: number | null;
  DCQTE_A_PRESSER?: number | null;
  DCQTE_REJET?: number | null;
  PCS_PER_PANEL?: number | null;
  VBE_DCQTE_A_FAB?: number | null;
  // V-CUT override fields
  NO_INVENTAIRE?: string | null;
  PRODUIT_CODE?: string | null;
  QTE_FORCEE?: number | null;
  VCUT_QTE_UTILISEE?: number | null;
}): number {
  // V-CUT special logic: QTE_FORCEE - VCUT_QTE_UTILISEE (matches old operation.cfc lines 1114-1116)
  if (op.NO_INVENTAIRE === "VCUT" || op.PRODUIT_CODE === "VCUT") {
    const qteRestante = Math.ceil(Number(op.QTE_FORCEE ?? 0) - Number(op.VCUT_QTE_UTILISEE ?? 0));
    return Math.max(qteRestante, 0);
  }

  const produced = Math.ceil(Number(op.QTE_PRODUITE ?? 0));

  if (isPressFamille(op.FAMILLEMACHINE, op.FMCODE)) {
    // PRESS: LaQuantiteAFab = DCQTE_A_PRESSER (or VBE.DCQTE_A_FAB if unavailable)
    const dcqteAPresser = Math.ceil(Number(op.DCQTE_A_PRESSER ?? 0));
    const vbeDcqteAFab = Math.ceil(Number(op.VBE_DCQTE_A_FAB ?? 0));
    const laQuantiteAFab = dcqteAPresser > 0 ? dcqteAPresser : (vbeDcqteAFab > 0 ? vbeDcqteAFab : Number(op.QTE_A_FAB ?? 0));

    // LaQuantiteAjoutee = DCQTE_REJET / PCS_PER_PANEL
    const pcsPerPanel = Math.ceil(Number(op.PCS_PER_PANEL ?? 0));
    const dcqteRejet = Math.ceil(Number(op.DCQTE_REJET ?? 0));
    const laQuantiteAjoutee = pcsPerPanel > 0 ? Math.round(dcqteRejet / pcsPerPanel) : 0;

    const restante = Math.ceil(laQuantiteAFab + laQuantiteAjoutee - produced);
    return Math.max(restante, 0);
  }

  // CNC / other: VBE_DCQTE_A_FAB (or QTE_A_FAB fallback) - QTE_PRODUITE
  const vbeBase = Number(op.VBE_DCQTE_A_FAB ?? 0);
  const qteAFab = Math.ceil(vbeBase > 0 ? vbeBase : Number(op.QTE_A_FAB ?? 0));
  const restante = Math.ceil(qteAFab - produced);
  return Math.max(restante, 0);
}

/**
 * Check if a V-CUT order should be auto-marked as completed.
 * Old CF logic (operation.cfc:1114-1124): if remaining <= 0, show as COMP.
 */
export function isVcutCompleted(op: {
  NO_INVENTAIRE?: string | null;
  PRODUIT_CODE?: string | null;
  QTE_FORCEE?: number | null;
  VCUT_QTE_UTILISEE?: number | null;
}): boolean {
  if (op.NO_INVENTAIRE !== "VCUT" && op.PRODUIT_CODE !== "VCUT") return false;
  const remaining = Number(op.QTE_FORCEE ?? 0) - Number(op.VCUT_QTE_UTILISEE ?? 0);
  return remaining <= 0;
}
