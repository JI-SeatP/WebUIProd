import { apiGet, apiPost } from "./client";
import type { CorrectionData } from "@/types/corrections";

export function getCorrection(tjseq: number) {
  return apiGet<CorrectionData>(`getCorrection.cfm?tjseq=${tjseq}`);
}

export interface SubmitCorrectionPayload {
  tjseq: number;
  employeeCode: string;
  employeeName: string;
  operation: number;
  machine: number;
  startDate: string; // ISO datetime-local format "yyyy-MM-ddTHH:mm"
  endDate: string;
  goodQty: number;
  defects: { ddseq?: number; qty: number; reasonId: number; note?: string }[];
  finishedProducts: { dtrseq: number; qty: number }[];
  materials: { dtrseq: number; qty: number }[];
}

export function submitCorrection(payload: SubmitCorrectionPayload) {
  return apiPost<{ TJSEQ: number }>("submitCorrection.cfm", payload);
}
