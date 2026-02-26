import { http, HttpResponse } from "msw";
import type { SkidInfo, LabelInfo, TransferInfo } from "@/types/modals";

const mockSkids: Record<string, SkidInfo> = {
  "SKID-001": {
    SKID: "SKID-001",
    PRODUIT_CODE: "PNL-4x8-A",
    PRODUIT_P: "Panneau composite 4x8 A",
    PRODUIT_S: "Composite Panel 4x8 A",
    QTE: 250,
    ENTREPOT_CODE: "WH-01",
    ENTREPOT_P: "Entrepôt principal",
    ENTREPOT_S: "Main Warehouse",
  },
  "SKID-002": {
    SKID: "SKID-002",
    PRODUIT_CODE: "PNL-4x8-B",
    PRODUIT_P: "Panneau composite 4x8 B",
    PRODUIT_S: "Composite Panel 4x8 B",
    QTE: 180,
    ENTREPOT_CODE: "WH-02",
    ENTREPOT_P: "Entrepôt matières premières",
    ENTREPOT_S: "Raw Materials Warehouse",
  },
};

const mockLabels: LabelInfo[] = [
  {
    TRANSAC: 50001,
    NO_PROD: "ORD-2024-001",
    PRODUIT_P: "Panneau composite 4x8",
    PRODUIT_S: "Composite Panel 4x8",
    NOM_CLIENT: "Cascade Lumber",
    QTE_PAR_SKID: 50,
  },
  {
    TRANSAC: 50002,
    NO_PROD: "ORD-2024-002",
    PRODUIT_P: "Contreplaqué bouleau",
    PRODUIT_S: "Birch Plywood",
    NOM_CLIENT: "Quebec Wood Products",
    QTE_PAR_SKID: 100,
  },
  {
    TRANSAC: 50003,
    NO_PROD: "ORD-2024-003",
    PRODUIT_P: "Panneau MDF 5x10",
    PRODUIT_S: "MDF Panel 5x10",
    NOM_CLIENT: "Maritime Panels Inc.",
    QTE_PAR_SKID: 30,
  },
];

export const modalsHandlers = [
  // SKID Scanner
  http.get("/api/getSkidInfo.cfm", ({ request }) => {
    const url = new URL(request.url);
    const skid = url.searchParams.get("skid") ?? "";
    const info = mockSkids[skid];

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
  http.get("/api/getLabelInfo.cfm", ({ request }) => {
    const url = new URL(request.url);
    const transac = Number(url.searchParams.get("transac"));
    const label = mockLabels.find((l) => l.TRANSAC === transac);

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

  // Label search
  http.get("/api/searchLabels.cfm", ({ request }) => {
    const url = new URL(request.url);
    const search = (url.searchParams.get("search") ?? "").toLowerCase();
    const filtered = mockLabels.filter(
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
  http.get("/api/getTransferInfo.cfm", ({ request }) => {
    const url = new URL(request.url);
    const skid = url.searchParams.get("skid") ?? "";
    const skidInfo = mockSkids[skid];

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
