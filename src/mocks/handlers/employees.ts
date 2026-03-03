import { http, HttpResponse } from "msw";
import { loadEmployees } from "@/mocks/loaders";

export const employeeHandlers = [
  http.get("/api/getEmployees.cfm", async () => {
    const data = await loadEmployees();
    return HttpResponse.json({
      success: true,
      data,
      message: `Retrieved ${data.length} employees`,
    });
  }),

  http.post("/api/validateEmployee.cfm", async ({ request }) => {
    const body = (await request.json()) as { employeeCode: number };
    const employees = await loadEmployees();
    const employee = employees.find((e) => e.EMNOIDENT === body.employeeCode);

    if (employee) {
      return HttpResponse.json({
        success: true,
        data: employee,
        message: "Employee found",
      });
    }

    return HttpResponse.json({
      success: false,
      data: null,
      error: "Employee not found",
    });
  }),
];
