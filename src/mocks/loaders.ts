import type { Department } from "@/types/department";
import type { Machine } from "@/types/machine";
import type { Employee } from "@/types/employee";
import type { WorkOrder, WorkOrderDetail } from "@/types/workOrder";
import type { Warehouse } from "@/types/warehouse";
import type { Team, EmployeeFunction } from "@/types/team";

function parseCSV<T>(csv: string): T[] {
  const lines = csv.trim().split("\n");
  if (lines.length < 2) return [];

  const headers = parseCSVLine(lines[0]);
  const rows: T[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length !== headers.length) continue;

    const row: Record<string, unknown> = {};
    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = parseValue(values[j]);
    }
    rows.push(row as T);
  }

  return rows;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

function parseValue(value: string): unknown {
  if (value === "NULL" || value === "") return null;
  const num = Number(value);
  if (!isNaN(num) && value !== "") return num;
  return value;
}

// Lazy-loaded data caches
let departmentsCache: Department[] | null = null;
let machinesCache: Machine[] | null = null;
let employeesCache: Employee[] | null = null;
let workOrdersCache: WorkOrder[] | null = null;
let workOrderDetailsCache: WorkOrderDetail[] | null = null;
let warehousesCache: Warehouse[] | null = null;
let teamsCache: Team[] | null = null;
let employeeFunctionsCache: EmployeeFunction[] | null = null;

async function loadCSV(filename: string): Promise<string> {
  const response = await fetch(`/src/mocks/data/${filename}`);
  return response.text();
}

export async function loadDepartments(): Promise<Department[]> {
  if (departmentsCache) return departmentsCache;
  const csv = await loadCSV("departments.csv");
  departmentsCache = parseCSV<Department>(csv);
  return departmentsCache;
}

export async function loadMachines(): Promise<Machine[]> {
  if (machinesCache) return machinesCache;
  const csv = await loadCSV("machines.csv");
  machinesCache = parseCSV<Machine>(csv);
  return machinesCache;
}

export async function loadEmployees(): Promise<Employee[]> {
  if (employeesCache) return employeesCache;
  const csv = await loadCSV("employees.csv");
  employeesCache = parseCSV<Employee>(csv);
  return employeesCache;
}

export async function loadWorkOrders(): Promise<WorkOrder[]> {
  if (workOrdersCache) return workOrdersCache;
  const csv = await loadCSV("work_orders.csv");
  workOrdersCache = parseCSV<WorkOrder>(csv);
  return workOrdersCache;
}

export async function loadWorkOrderDetails(): Promise<WorkOrderDetail[]> {
  if (workOrderDetailsCache) return workOrderDetailsCache;
  const csv = await loadCSV("work_order_details.csv");
  workOrderDetailsCache = parseCSV<WorkOrderDetail>(csv);
  return workOrderDetailsCache;
}

export async function loadWarehouses(): Promise<Warehouse[]> {
  if (warehousesCache) return warehousesCache;
  const csv = await loadCSV("warehouses.csv");
  warehousesCache = parseCSV<Warehouse>(csv);
  return warehousesCache;
}

export async function loadTeams(): Promise<Team[]> {
  if (teamsCache) return teamsCache;
  const csv = await loadCSV("teams.csv");
  teamsCache = parseCSV<Team>(csv);
  return teamsCache;
}

export async function loadEmployeeFunctions(): Promise<EmployeeFunction[]> {
  if (employeeFunctionsCache) return employeeFunctionsCache;
  const csv = await loadCSV("employee_functions.csv");
  employeeFunctionsCache = parseCSV<EmployeeFunction>(csv);
  return employeeFunctionsCache;
}
