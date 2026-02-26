import { http, HttpResponse } from "msw";
import { loadMachines } from "@/mocks/loaders";

export const machineHandlers = [
  http.get("/api/getMachines.cfm", async ({ request }) => {
    const url = new URL(request.url);
    const departement = url.searchParams.get("departement");
    let data = await loadMachines();

    if (departement) {
      data = data.filter((m) => m.DEPARTEMENT === Number(departement));
    }

    return HttpResponse.json({
      success: true,
      data,
      message: `Retrieved ${data.length} machines`,
    });
  }),
];
