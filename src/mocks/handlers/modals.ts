import { http, HttpResponse } from "msw";
import type { TransferInfo } from "@/types/modals";
import { loadSkids, loadLabels } from "@/mocks/loaders";

export const modalsHandlers = [
  // SKID Scanner
  http.get("/api/getSkidInfo.cfm", async ({ request }) => {
    const skids = await loadSkids();
    const url = new URL(request.url);
    const skid = url.searchParams.get("skid") ?? "";
    const info = skids.find((s) => s.SKID === skid);

    if (!info) {
      return HttpResponse.json({
        success: false,
        data: null,
        error: "SKID not found",
      });
    }

    return HttpResponse.json({
      success: true,
      data: info,
      message: "SKID info retrieved",
    });
  }),

  // Label info (order-specific)
  http.get("/api/getLabelInfo.cfm", async ({ request }) => {
    const labels = await loadLabels();
    const url = new URL(request.url);
    const transac = Number(url.searchParams.get("transac"));
    const label = labels.find((l) => l.TRANSAC === transac);

    if (!label) {
      return HttpResponse.json({
        success: false,
        data: null,
        error: "Label info not found",
      });
    }

    return HttpResponse.json({
      success: true,
      data: label,
      message: "Label info retrieved",
    });
  }),

  // Labels for a specific order (order details context)
  http.get("/api/getOrderLabels.cfm", async ({ request }) => {
    const labels = await loadLabels();
    const url = new URL(request.url);
    const transac = Number(url.searchParams.get("transac"));
    // In the real system this returns all labels for the order's containers.
    // For mock, return labels matching the transac or just return all labels to simulate.
    const matched = labels.filter((l) => l.TRANSAC === transac);
    // If exact match found, return it; otherwise return all labels as mock data
    const result = matched.length > 0 ? matched : labels;

    return HttpResponse.json({
      success: true,
      data: result,
      message: `Found ${result.length} labels for order`,
    });
  }),

  // Label search
  http.get("/api/searchLabels.cfm", async ({ request }) => {
    const labels = await loadLabels();
    const url = new URL(request.url);
    const search = (url.searchParams.get("search") ?? "").toLowerCase();
    const filtered = labels.filter(
      (l) =>
        l.NO_PROD.toLowerCase().includes(search) ||
        l.NOM_CLIENT.toLowerCase().includes(search)
    );

    return HttpResponse.json({
      success: true,
      data: filtered,
      message: `Found ${filtered.length} labels`,
    });
  }),

  // Print label
  http.post("/api/printLabel.cfm", async () => {
    return HttpResponse.json({
      success: true,
      data: { success: true },
      message: "Label sent to printer",
    });
  }),

  // Send message
  http.post("/api/sendMessage.cfm", async () => {
    return HttpResponse.json({
      success: true,
      data: { success: true },
      message: "Message sent",
    });
  }),

  // Warehouse transfer - get info
  http.get("/api/getTransferInfo.cfm", async ({ request }) => {
    const skids = await loadSkids();
    const url = new URL(request.url);
    const skid = url.searchParams.get("skid") ?? "";
    const skidInfo = skids.find((s) => s.SKID === skid);

    if (!skidInfo) {
      return HttpResponse.json({
        success: false,
        data: null,
        error: "SKID not found",
      });
    }

    const transferInfo: TransferInfo = {
      SKID: skidInfo.SKID,
      CURRENT_ENTREPOT_CODE: skidInfo.ENTREPOT_CODE,
      CURRENT_ENTREPOT_P: skidInfo.ENTREPOT_P,
      CURRENT_ENTREPOT_S: skidInfo.ENTREPOT_S,
    };

    return HttpResponse.json({
      success: true,
      data: transferInfo,
      message: "Transfer info retrieved",
    });
  }),

  // Submit transfer
  http.post("/api/submitTransfer.cfm", async () => {
    return HttpResponse.json({
      success: true,
      data: { success: true },
      message: "Transfer completed",
    });
  }),
];
