import { http, HttpResponse } from "msw";
import { loadWorkOrders, loadWorkOrderDetails } from "@/mocks/loaders";

export const operationHandlers = [
  http.get("/api/getOperation.cfm", async ({ request }) => {
    const url = new URL(request.url);
    const transac = url.searchParams.get("transac");
    const copmachine = url.searchParams.get("copmachine");

    if (!transac) {
      return HttpResponse.json({
        success: false,
        error: "transac parameter is required",
      });
    }

    const workOrders = await loadWorkOrders();
    const details = await loadWorkOrderDetails();

    const order = workOrders.find(
      (wo) =>
        wo.TRANSAC === Number(transac) &&
        (copmachine ? wo.COPMACHINE === Number(copmachine) : true)
    );

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
