import { http, HttpResponse } from "msw";
import type { InventoryTransaction, ContainerDetail } from "@/types/inventory";

const mockTransactions: InventoryTransaction[] = [
  {
    TRSEQ: 2001,
    TRNO: "TR-001",
    PRODUIT_CODE: "PNL-4x8-A",
    PRODUIT_P: "Panneau composite 4x8 A",
    PRODUIT_S: "Composite Panel 4x8 A",
    ENTREPOT_CODE: "WH-01",
    ENTREPOT_P: "Entrepôt principal",
    ENTREPOT_S: "Main Warehouse",
    QTE_ESTIMEE: 500,
    QTE_REELLE: 485,
    UNITE: "PCS",
    DATE_VERIF: "2024-01-15",
  },
  {
    TRSEQ: 2002,
    TRNO: "TR-001",
    PRODUIT_CODE: "PNL-4x8-B",
    PRODUIT_P: "Panneau composite 4x8 B",
    PRODUIT_S: "Composite Panel 4x8 B",
    ENTREPOT_CODE: "WH-01",
    ENTREPOT_P: "Entrepôt principal",
    ENTREPOT_S: "Main Warehouse",
    QTE_ESTIMEE: 300,
    QTE_REELLE: 298,
    UNITE: "PCS",
    DATE_VERIF: "2024-01-15",
  },
  {
    TRSEQ: 2003,
    TRNO: "TR-002",
    PRODUIT_CODE: "PLY-BIRCH-001",
    PRODUIT_P: "Contreplaqué bouleau 3/4",
    PRODUIT_S: "Birch Plywood 3/4",
    ENTREPOT_CODE: "WH-02",
    ENTREPOT_P: "Entrepôt matières premières",
    ENTREPOT_S: "Raw Materials Warehouse",
    QTE_ESTIMEE: 1200,
    QTE_REELLE: 1180,
    UNITE: "SHT",
    DATE_VERIF: "2024-01-14",
  },
];

const mockContainers: Record<number, ContainerDetail[]> = {
  2001: [
    { CDSEQ: 3001, CONTAINER: "SKID-001", PRODUIT_CODE: "PNL-4x8-A", PRODUIT_P: "Panneau composite 4x8 A", PRODUIT_S: "Composite Panel 4x8 A", QTE_ESTIMEE: 250, QTE_REELLE: 245, UNITE: "PCS" },
    { CDSEQ: 3002, CONTAINER: "SKID-002", PRODUIT_CODE: "PNL-4x8-A", PRODUIT_P: "Panneau composite 4x8 A", PRODUIT_S: "Composite Panel 4x8 A", QTE_ESTIMEE: 250, QTE_REELLE: 240, UNITE: "PCS" },
  ],
  2002: [
    { CDSEQ: 3003, CONTAINER: "SKID-003", PRODUIT_CODE: "PNL-4x8-B", PRODUIT_P: "Panneau composite 4x8 B", PRODUIT_S: "Composite Panel 4x8 B", QTE_ESTIMEE: 300, QTE_REELLE: 298, UNITE: "PCS" },
  ],
  2003: [
    { CDSEQ: 3004, CONTAINER: "BIN-010", PRODUIT_CODE: "PLY-BIRCH-001", PRODUIT_P: "Contreplaqué bouleau 3/4", PRODUIT_S: "Birch Plywood 3/4", QTE_ESTIMEE: 600, QTE_REELLE: 590, UNITE: "SHT" },
    { CDSEQ: 3005, CONTAINER: "BIN-011", PRODUIT_CODE: "PLY-BIRCH-001", PRODUIT_P: "Contreplaqué bouleau 3/4", PRODUIT_S: "Birch Plywood 3/4", QTE_ESTIMEE: 600, QTE_REELLE: 590, UNITE: "SHT" },
  ],
};

export const inventoryHandlers = [
  http.get("/api/getInventoryTransactions.cfm", ({ request }) => {
    const url = new URL(request.url);
    const transactionNo = url.searchParams.get("transactionNo") ?? "";
    const productNo = url.searchParams.get("productNo") ?? "";
    const contains = url.searchParams.get("contains") ?? "";

    let filtered = mockTransactions.filter((t) =>
      t.TRNO.toLowerCase().includes(transactionNo.toLowerCase())
    );
    if (productNo) {
      filtered = filtered.filter((t) =>
        t.PRODUIT_CODE.toLowerCase().includes(productNo.toLowerCase())
      );
    }
    if (contains) {
      const search = contains.toLowerCase();
      filtered = filtered.filter(
        (t) =>
          t.PRODUIT_P.toLowerCase().includes(search) ||
          t.PRODUIT_S.toLowerCase().includes(search)
      );
    }

    return HttpResponse.json({
      success: true,
      data: filtered,
      message: `Retrieved ${filtered.length} transactions`,
    });
  }),

  http.get("/api/getContainerDetails.cfm", ({ request }) => {
    const url = new URL(request.url);
    const trseq = Number(url.searchParams.get("trseq"));
    const containers = mockContainers[trseq] ?? [];

    return HttpResponse.json({
      success: true,
      data: containers,
      message: `Retrieved ${containers.length} containers`,
    });
  }),

  http.post("/api/updateContainerQty.cfm", async ({ request }) => {
    const body = (await request.json()) as { cdseq: number; qtyReelle: number };
    return HttpResponse.json({
      success: true,
      data: { CDSEQ: body.cdseq },
      message: "Container quantity updated",
    });
  }),
];
