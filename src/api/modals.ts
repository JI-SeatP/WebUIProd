import { apiGet, apiPost } from "./client";
import type { SkidInfo, LabelInfo, TransferInfo } from "@/types/modals";

export function getSkidInfo(skidNo: string) {
  return apiGet<SkidInfo>(`getSkidInfo.cfm?skid=${encodeURIComponent(skidNo)}`);
}

export function getLabelInfo(transac: number) {
  return apiGet<LabelInfo>(`getLabelInfo.cfm?transac=${transac}`);
}

export function searchLabels(search: string) {
  return apiGet<LabelInfo[]>(`searchLabels.cfm?search=${encodeURIComponent(search)}`);
}

export function getOrderLabels(transac: number) {
  return apiGet<LabelInfo[]>(`getOrderLabels.cfm?transac=${transac}`);
}

export function printLabel(transac: number, qtyPerSkid: number) {
  return apiPost<{ success: boolean }>("printLabel.cfm", { transac, qtyPerSkid });
}

export function sendMessage(payload: { machine: string; station: string; message: string }) {
  return apiPost<{ success: boolean }>("sendMessage.cfm", payload);
}

export function getTransferInfo(skidNo: string) {
  return apiGet<TransferInfo>(`getTransferInfo.cfm?skid=${encodeURIComponent(skidNo)}`);
}

export function submitTransfer(skidNo: string, destination: string) {
  return apiPost<{ success: boolean }>("submitTransfer.cfm", { skid: skidNo, destination });
}
