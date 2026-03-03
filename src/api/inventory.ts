import { apiGet, apiPost } from "./client";
import type { InventoryTransaction, ContainerDetail } from "@/types/inventory";

export function getInventoryTransactions(params: {
  transactionNo: string;
  productNo?: string;
  contains?: string;
}) {
  const query = new URLSearchParams();
  query.set("transactionNo", params.transactionNo);
  if (params.productNo) query.set("productNo", params.productNo);
  if (params.contains) query.set("contains", params.contains);
  return apiGet<InventoryTransaction[]>(`getInventoryTransactions.cfm?${query}`);
}

export function getContainerDetails(trseq: number) {
  return apiGet<ContainerDetail[]>(`getContainerDetails.cfm?trseq=${trseq}`);
}

export function updateContainerQty(cdseq: number, qtyReelle: number) {
  return apiPost<{ CDSEQ: number }>("updateContainerQty.cfm", { cdseq, qtyReelle });
}
