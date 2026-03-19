import { apiGet, apiPost } from "./client";
import type { CorrectionData } from "@/types/corrections";

export function getCorrection(tjseq: number) {
  return apiGet<CorrectionData>(`getCorrection.cfm?tjseq=${tjseq}`);
}

export function submitCorrection(payload: {
  tjseq: number;
  goodQty?: number;
  defects?: { id: number; correctedQty: number }[];
  newDefects?: { typeId: number; qty: number }[];
  finishedProducts?: { id: number; correctedQty: number }[];
}) {
  return apiPost<{ TJSEQ: number }>("submitCorrection.cfm", payload);
}
