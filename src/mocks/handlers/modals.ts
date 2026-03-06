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

  // Labels for a specific order (order details context) — returns two tables
  http.get("/api/getOrderLabels.cfm", async () => {
    return HttpResponse.json({
      success: true,
      data: { finishedProducts: [], operations: [], currentOpcode: null, noProd: null },
      message: "Labels retrieved",
    });
  }),

  // Get label data for HTML preview
  http.get("/api/getLabelData.cfm", async ({ request }) => {
    const url = new URL(request.url);
    const transac = url.searchParams.get("transac");
    const nopseq = url.searchParams.get("nopseq");
    const tjseq = url.searchParams.get("tjseq");

    if (!transac || !nopseq || !tjseq) {
      return HttpResponse.json({
        success: false,
        data: null,
        error: "transac, nopseq, and tjseq parameters are required",
      });
    }

    return HttpResponse.json({
      success: true,
      data: {
        NOPSEQ: Number(nopseq),
        NO_PROD: "CO-000712-002",
        QTE_PRODUITE: 16,
        TRANSAC: Number(transac),
        NOM_CLIENT: "BOUTY INC.",
        Panneau: "UR002-004-P",
        INVENTAIRE_S: "",
        Presses: "C",
        QTE_COMMANDEE: 500,
        QTE_A_LIVRER: 500,
        NO_INVENTAIRE: "PLYS9000R",
        NEXTOPERATION_S: "Machining",
        NEXTOPERATION_P: "MACHINAGE",
        SCDESC_S: "Upholstery",
        REVISION: 11,
        DeDescription_P: "Pressage",
        EQDEBUTQUART: "2026-03-06T07:00:00",
        PRODUIT_CODE: "PLYS9000R",
        PRODUIT_S: 'OR:24"',
        EMPLOYE_EMNO: 2761,
        EMPLOYE_EMNOM: "ABANE, OURABAH",
      },
      message: "Label data retrieved",
    });
  }),

  // Get label PDF URL for preview (legacy)
  http.get("/api/getLabelPdf.cfm", async () => {
    return HttpResponse.json({
      success: true,
      data: { pdfUrl: "/sample-label.pdf" },
      message: "Label PDF generated",
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
