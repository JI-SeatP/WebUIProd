import { http, HttpResponse } from "msw";
import { loadProductionTime, loadEmployeeHours } from "@/mocks/loaders";

export const timeTrackingHandlers = [
  http.get("/api/getProductionTime.cfm", async ({ request }) => {
    const entries = await loadProductionTime();
    const url = new URL(request.url);
    const orderSearch = url.searchParams.get("orderSearch");
    const department = url.searchParams.get("department");
    const machine = url.searchParams.get("machine");

    let filtered = [...entries];
    if (orderSearch) {
      filtered = filtered.filter((e) =>
        e.NO_PROD.toLowerCase().includes(orderSearch.toLowerCase())
      );
    }
    if (department) {
      filtered = filtered.filter((e) => e.DEPARTEMENT === Number(department));
    }
    if (machine) {
      filtered = filtered.filter((e) => e.MACODE === machine);
    }

    return HttpResponse.json({
      success: true,
      data: filtered,
      message: `Retrieved ${filtered.length} time entries`,
    });
  }),

  http.post("/api/updateTimeStatus.cfm", async ({ request }) => {
    const body = (await request.json()) as { tjseq: number; statusCode: number };
    return HttpResponse.json({
      success: true,
      data: { TJSEQ: body.tjseq },
      message: "Status updated successfully",
    });
  }),

  http.post("/api/addHours.cfm", async () => {
    return HttpResponse.json({
      success: true,
      data: { success: true },
      message: "Hours added successfully",
    });
  }),

  http.get("/api/getEmployeeProductionTime.cfm", async ({ request }) => {
    const entries = await loadProductionTime();
    const url = new URL(request.url);
    const employeeCode = url.searchParams.get("employeeCode");
    const filtered = entries.filter(
      (e) => String(e.EMNOIDENT) === employeeCode
    );
    return HttpResponse.json({
      success: true,
      data: filtered,
      message: `Retrieved ${filtered.length} employee production entries`,
    });
  }),

  http.post("/api/updateTimeEntry.cfm", async ({ request }) => {
    const body = (await request.json()) as { tjseq: number };
    return HttpResponse.json({
      success: true,
      data: { TJSEQ: body.tjseq },
      message: "Time entry updated successfully",
    });
  }),

  http.get("/api/getEmployeeHours.cfm", async ({ request }) => {
    const hours = await loadEmployeeHours();
    const url = new URL(request.url);
    const employeeCode = url.searchParams.get("employeeCode");
    const filtered = hours.filter(
      (e) => String(e.EMNOIDENT) === employeeCode
    );
    return HttpResponse.json({
      success: true,
      data: filtered,
      message: `Retrieved ${filtered.length} employee hours entries`,
    });
  }),

  http.post("/api/deleteEmployeeHours.cfm", async ({ request }) => {
    const body = (await request.json()) as { ehseq: number };
    return HttpResponse.json({
      success: true,
      data: { EHSEQ: body.ehseq },
      message: "Employee hours entry deleted",
    });
  }),

  http.post("/api/updateEmployeeHours.cfm", async ({ request }) => {
    const body = (await request.json()) as { ehseq: number };
    return HttpResponse.json({
      success: true,
      data: { EHSEQ: body.ehseq },
      message: "Employee hours updated successfully",
    });
  }),

  http.get("/api/searchTimeEntries.cfm", async ({ request }) => {
    const entries = await loadProductionTime();
    const url = new URL(request.url);
    const department = url.searchParams.get("department");
    const employee = url.searchParams.get("employee");

    let filtered = [...entries];
    if (department) {
      filtered = filtered.filter((e) => e.DEPARTEMENT === Number(department));
    }
    if (employee) {
      filtered = filtered.filter((e) =>
        e.EMNOM.toLowerCase().includes(employee.toLowerCase()) ||
        String(e.EMNOIDENT).includes(employee)
      );
    }

    return HttpResponse.json({
      success: true,
      data: filtered,
      message: `Retrieved ${filtered.length} search results`,
    });
  }),
];
