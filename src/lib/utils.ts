import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * For PRESS operations, displays quantity as "DCQTE_A_PRESSER + DCQTE_REJET"
 * matching the VSP_BonTravail_Entete view values from the legacy software.
 */
export function pressQtyDisplay(
  qteAFab: number | null | undefined,
  dcqteAPresser: number | null | undefined,
  dcqteRejet: number | null | undefined,
  fmcode: string | null | undefined
): string {
  const fmc = (fmcode ?? "").toUpperCase();
  const isPress = fmc.includes("PRESS");
  if (!isPress || dcqteAPresser == null) return String(qteAFab ?? 0);
  const rejet = Number(dcqteRejet ?? 0);
  return rejet > 0 ? `${dcqteAPresser} + ${rejet}` : String(dcqteAPresser);
}
