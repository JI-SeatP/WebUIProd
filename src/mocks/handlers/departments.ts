import { http, HttpResponse } from "msw";
import { loadDepartments } from "@/mocks/loaders";

export const departmentHandlers = [
  http.get("/api/getDepartments.cfm", async () => {
    const data = await loadDepartments();
    return HttpResponse.json({
      success: true,
      data,
      message: `Retrieved ${data.length} departments`,
    });
  }),
];
