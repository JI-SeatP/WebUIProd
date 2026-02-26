import { http, HttpResponse } from "msw";
import type { TimeEntry } from "@/types/timeTracking";

const mockTimeEntries: TimeEntry[] = [
  {
    TJSEQ: 1001,
    TJDATE: "2024-01-15",
    TJDEBUT: "2024-01-15 07:00:00",
    TJFIN: "2024-01-15 15:30:00",
    TJDUREE: 510,
    STATUT_CODE: 120,
    STATUT_P: "En production",
    STATUT_S: "In Production",
    TRANSAC: 50001,
    NO_PROD: "ORD-2024-001",
    NOM_CLIENT: "Cascade Lumber",
    COPMACHINE: 1,
    OPERATION_P: "Pressage",
    OPERATION_S: "Pressing",
    DEPARTEMENT: 10,
    DECODE: "PRESS",
    MACODE: "PR-01",
    MACHINE_P: "Presse #1",
    MACHINE_S: "Press #1",
    EMNOM: "Jean Tremblay",
    EMNOIDENT: 1234,
    QTE_BONNE: 150,
    QTE_DEFAUT: 3,
    SM_EPF: "SM",
    MODEPROD_MPCODE: "PROD",
  },
  {
    TJSEQ: 1002,
    TJDATE: "2024-01-15",
    TJDEBUT: "2024-01-15 07:30:00",
    TJFIN: "2024-01-15 12:00:00",
    TJDUREE: 270,
    STATUT_CODE: 130,
    STATUT_P: "En pause",
    STATUT_S: "Paused",
    TRANSAC: 50002,
    NO_PROD: "ORD-2024-002",
    NOM_CLIENT: "Quebec Wood Products",
    COPMACHINE: 2,
    OPERATION_P: "Découpe CNC",
    OPERATION_S: "CNC Cutting",
    DEPARTEMENT: 20,
    DECODE: "CNC",
    MACODE: "CNC-03",
    MACHINE_P: "CNC #3",
    MACHINE_S: "CNC #3",
    EMNOM: "Marie Gagnon",
    EMNOIDENT: 5678,
    QTE_BONNE: 85,
    QTE_DEFAUT: 1,
    SM_EPF: "EPF",
    MODEPROD_MPCODE: "PROD",
  },
  {
    TJSEQ: 1003,
    TJDATE: "2024-01-14",
    TJDEBUT: "2024-01-14 15:30:00",
    TJFIN: "2024-01-14 23:30:00",
    TJDUREE: 480,
    STATUT_CODE: 150,
    STATUT_P: "Terminé",
    STATUT_S: "Completed",
    TRANSAC: 50003,
    NO_PROD: "ORD-2024-003",
    NOM_CLIENT: "Maritime Panels Inc.",
    COPMACHINE: 3,
    OPERATION_P: "Sablage",
    OPERATION_S: "Sanding",
    DEPARTEMENT: 30,
    DECODE: "SAND",
    MACODE: "SND-02",
    MACHINE_P: "Sableuse #2",
    MACHINE_S: "Sander #2",
    EMNOM: "Pierre Lavoie",
    EMNOIDENT: 9012,
    QTE_BONNE: 200,
    QTE_DEFAUT: 5,
    SM_EPF: "SM",
    MODEPROD_MPCODE: "PROD",
  },
  {
    TJSEQ: 1004,
    TJDATE: "2024-01-14",
    TJDEBUT: "2024-01-14 07:00:00",
    TJFIN: "2024-01-14 08:30:00",
    TJDUREE: 90,
    STATUT_CODE: 110,
    STATUT_P: "Mise en course",
    STATUT_S: "Setup",
    TRANSAC: 50001,
    NO_PROD: "ORD-2024-001",
    NOM_CLIENT: "Cascade Lumber",
    COPMACHINE: 1,
    OPERATION_P: "Pressage",
    OPERATION_S: "Pressing",
    DEPARTEMENT: 10,
    DECODE: "PRESS",
    MACODE: "PR-01",
    MACHINE_P: "Presse #1",
    MACHINE_S: "Press #1",
    EMNOM: "Jean Tremblay",
    EMNOIDENT: 1234,
    QTE_BONNE: 0,
    QTE_DEFAUT: 0,
    SM_EPF: "SM",
    MODEPROD_MPCODE: "SETUP",
  },
  {
    TJSEQ: 1005,
    TJDATE: "2024-01-13",
    TJDEBUT: "2024-01-13 00:00:00",
    TJFIN: "2024-01-13 07:00:00",
    TJDUREE: 420,
    STATUT_CODE: 140,
    STATUT_P: "Arrêt",
    STATUT_S: "Stopped",
    TRANSAC: 50004,
    NO_PROD: "ORD-2024-004",
    NOM_CLIENT: "Northern Forestry Co.",
    COPMACHINE: 4,
    OPERATION_P: "Assemblage",
    OPERATION_S: "Assembly",
    DEPARTEMENT: 40,
    DECODE: "ASSY",
    MACODE: "ASM-01",
    MACHINE_P: "Assemblage #1",
    MACHINE_S: "Assembly #1",
    EMNOM: "Luc Bergeron",
    EMNOIDENT: 3456,
    QTE_BONNE: 45,
    QTE_DEFAUT: 2,
    SM_EPF: "SM",
    MODEPROD_MPCODE: "PROD",
  },
];

export const timeTrackingHandlers = [
  http.get("/api/getProductionTime.cfm", ({ request }) => {
    const url = new URL(request.url);
    const orderSearch = url.searchParams.get("orderSearch");
    const department = url.searchParams.get("department");
    const machine = url.searchParams.get("machine");

    let filtered = [...mockTimeEntries];
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

  http.get("/api/searchTimeEntries.cfm", ({ request }) => {
    const url = new URL(request.url);
    const department = url.searchParams.get("department");
    const employee = url.searchParams.get("employee");

    let filtered = [...mockTimeEntries];
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
