import { apiGet, apiPost } from "./client";
import type { TimeEntry, EmployeeHoursEntry, UpdateTimeEntryPayload } from "@/types/timeTracking";

export function getProductionTime(params: {
  startDate?: string;
  endDate?: string;
  orderSearch?: string;
  department?: string;
  machine?: string;
}) {
  const query = new URLSearchParams();
  if (params.startDate) query.set("startDate", params.startDate);
  if (params.endDate) query.set("endDate", params.endDate);
  if (params.orderSearch) query.set("orderSearch", params.orderSearch);
  if (params.department) query.set("department", params.department);
  if (params.machine) query.set("machine", params.machine);
  return apiGet<TimeEntry[]>(`getProductionTime.cfm?${query}`);
}

export function updateTimeStatus(tjseq: number, statusCode: number) {
  return apiPost<{ TJSEQ: number }>("updateTimeStatus.cfm", { tjseq, statusCode });
}

export function addHours(payload: {
  employeeCode: number;
  date: string;
  shift: number;
  startTime: string;
  endTime: string;
  department: number;
  machine: number;
  effortRate: number;
}) {
  return apiPost<{ success: boolean }>("addHours.cfm", payload);
}

export function getEmployeeProductionTime(params: {
  employeeCode: number;
  date: string;
}) {
  const query = new URLSearchParams();
  query.set("employeeCode", String(params.employeeCode));
  query.set("date", params.date);
  return apiGet<TimeEntry[]>(`getEmployeeProductionTime.cfm?${query}`);
}

export function updateTimeEntry(payload: UpdateTimeEntryPayload) {
  return apiPost<{ TJSEQ: number }>("updateTimeEntry.cfm", payload as unknown as Record<string, unknown>);
}

export function getEmployeeHours(params: {
  employeeCode: number;
  date: string;
}) {
  const query = new URLSearchParams();
  query.set("employeeCode", String(params.employeeCode));
  query.set("date", params.date);
  return apiGet<EmployeeHoursEntry[]>(`getEmployeeHours.cfm?${query}`);
}

export function deleteEmployeeHours(ehseq: number) {
  return apiPost<{ EHSEQ: number }>("deleteEmployeeHours.cfm", { ehseq });
}

export function updateEmployeeHours(payload: {
  ehseq: number;
  startTime: string;
  endTime: string;
  department: number;
  machine: number;
  effortRate: number;
}) {
  return apiPost<{ EHSEQ: number }>("updateEmployeeHours.cfm", payload);
}

export function searchTimeEntries(params: {
  startDate?: string;
  endDate?: string;
  department?: string;
  machine?: string;
  employee?: string;
}) {
  const query = new URLSearchParams();
  if (params.startDate) query.set("startDate", params.startDate);
  if (params.endDate) query.set("endDate", params.endDate);
  if (params.department) query.set("department", params.department);
  if (params.machine) query.set("machine", params.machine);
  if (params.employee) query.set("employee", params.employee);
  return apiGet<TimeEntry[]>(`searchTimeEntries.cfm?${query}`);
}
