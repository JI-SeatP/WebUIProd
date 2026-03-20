import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Displays the "Qté à fabriquer" field, matching the old software's logic.
 *
 * The old ColdFusion code (operation.cfc) uses VBE fields for ALL machine types:
 *   PRESS:  DCQTE_A_PRESSER (+ DCQTE_REJET/PCS_PER_PANEL adjustment shown as "+ N")
 *   Other:  VBE.DCQTE_A_FAB (falls back to QTE_A_FAB if VBE not available)
 */
export function pressQtyDisplay(
  qteAFab: number | null | undefined,
  dcqteAPresser: number | null | undefined,
  dcqteRejet: number | null | undefined,
  fmcode: string | null | undefined,
  vbeDcqteAFab?: number | null | undefined,
  pcsPerPanel?: number | null | undefined,
): string {
  const fmc = (fmcode ?? "").toUpperCase();
  const isPress = fmc.includes("PRESS") || fmc.includes("VENPR") || fmc.includes("FLATP");

  if (isPress) {
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
 * ColdFusion code does in operation.cfc (lines 4649-4709).
 *
 * The old software does NOT use the SQL-computed QTE_RESTANTE for the header;
 * instead it recalculates:
 *   PRESS:  (LaQuantiteAFab + LaQuantiteAjoutee) - QTE_PRODUITE
 *   Other:  QTE_A_FAB - QTE_PRODUITE
 *
 * Where LaQuantiteAFab = DCQTE_A_PRESSER (or VBE.DCQTE_A_FAB) for PRESS,
 * and LaQuantiteAjoutee = ceil(DCQTE_REJET / PCS_PER_PANEL).
 */
export function computeQteRestante(op: {
  QTE_A_FAB?: number | null;
  QTE_PRODUITE?: number | null;
  FMCODE?: string | null;
  DCQTE_A_PRESSER?: number | null;
  DCQTE_REJET?: number | null;
  PCS_PER_PANEL?: number | null;
  VBE_DCQTE_A_FAB?: number | null;
}): number {
  const fmc = (op.FMCODE ?? "").toUpperCase();
  const isPress = fmc.includes("PRESS") || fmc.includes("VENPR") || fmc.includes("FLATP");
  const produced = Math.ceil(Number(op.QTE_PRODUITE ?? 0));

  if (isPress) {
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
