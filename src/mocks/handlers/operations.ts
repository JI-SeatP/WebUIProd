import { http, HttpResponse } from "msw";
import { loadWorkOrders, loadWorkOrderDetails } from "@/mocks/loaders";

export const operationHandlers = [
  http.get("/api/getOperation.cfm", async ({ request }) => {
    const url = new URL(request.url);
    const transac = url.searchParams.get("transac");
    const copmachine = url.searchParams.get("copmachine");
    const nopseq = url.searchParams.get("nopseq");

    if (!transac) {
      return HttpResponse.json({
        success: false,
        error: "transac parameter is required",
      });
    }

    const workOrders = await loadWorkOrders();
    const details = await loadWorkOrderDetails();

    // Match old CF logic: skip COPMACHINE filter when 0, use NOPSEQ when available
    const copmachineNum = Number(copmachine) || 0;
    const nopseqNum = Number(nopseq) || 0;

    const order = workOrders.find((wo) => {
      if (wo.TRANSAC !== Number(transac)) return false;
      if (copmachineNum !== 0 && wo.COPMACHINE !== copmachineNum) return false;
      if (nopseqNum !== 0 && wo.NOPSEQ !== nopseqNum) return false;
      return true;
    });

    if (!order) {
      return HttpResponse.json({
        success: false,
        error: "Operation not found",
      });
    }

    const detail = details.find((d) => d.TRANSAC === Number(transac));

    return HttpResponse.json({
      success: true,
      data: { ...order, ...(detail || {}) },
      message: "Operation retrieved",
    });
  }),

  http.post("/api/changeStatus.cfm", async ({ request }) => {
    const body = (await request.json()) as {
      transac: number;
      copmachine: number;
      newStatus: string;
      employeeCode: number;
    };

    return HttpResponse.json({
      success: true,
      data: {
        transac: body.transac,
        copmachine: body.copmachine,
        newStatus: body.newStatus,
      },
      message: `Status changed to ${body.newStatus}`,
    });
  }),
];
