import { http, HttpResponse } from "msw";
import { loadWorkOrders, loadWorkOrderDetails } from "@/mocks/loaders";

export const workOrderHandlers = [
  http.get("/api/getWorkOrders.cfm", async ({ request }) => {
    const url = new URL(request.url);
    const departement = url.searchParams.get("departement");
    const machine = url.searchParams.get("machine");
    const status = url.searchParams.get("status");
    const search = url.searchParams.get("search");

    let data = await loadWorkOrders();

    if (departement) {
      data = data.filter((wo) => wo.DEPARTEMENT === Number(departement));
    }
    if (machine) {
      data = data.filter((wo) => wo.MACHINE === Number(machine));
    }
    if (status) {
      const statuses = status.split(",").map(Number);
      data = data.filter((wo) => statuses.includes(Number(wo.STATUT_CODE)));
    }
    if (search) {
      const term = search.toLowerCase();
      data = data.filter(
        (wo) =>
          wo.NO_PROD.toLowerCase().includes(term) ||
          wo.NOM_CLIENT.toLowerCase().includes(term) ||
          (wo.PRODUIT_P && wo.PRODUIT_P.toLowerCase().includes(term)) ||
          (wo.PRODUIT_S && wo.PRODUIT_S.toLowerCase().includes(term)) ||
          wo.MACODE.toLowerCase().includes(term)
      );
    }

    return HttpResponse.json({
      success: true,
      data,
      message: `Retrieved ${data.length} work orders`,
    });
  }),

  http.get("/api/getWorkOrderDetails.cfm", async ({ request }) => {
    const url = new URL(request.url);
    const transac = url.searchParams.get("transac");

    const details = await loadWorkOrderDetails();
    const data = transac
      ? details.filter((d) => d.TRANSAC === Number(transac))
      : details;

    return HttpResponse.json({
      success: true,
      data,
      message: `Retrieved ${data.length} work order details`,
    });
  }),
];
