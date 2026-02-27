import { http, HttpResponse } from "msw";
import { loadInventoryTransactions, loadContainerDetails } from "@/mocks/loaders";

export const inventoryHandlers = [
  http.get("/api/getInventoryTransactions.cfm", async ({ request }) => {
    const transactions = await loadInventoryTransactions();
    const url = new URL(request.url);
    const transactionNo = url.searchParams.get("transactionNo") ?? "";
    const productNo = url.searchParams.get("productNo") ?? "";
    const contains = url.searchParams.get("contains") ?? "";

    let filtered = transactions.filter((t) =>
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

  http.get("/api/getContainerDetails.cfm", async ({ request }) => {
    const allContainers = await loadContainerDetails();
    const url = new URL(request.url);
    const trseq = Number(url.searchParams.get("trseq"));
    const containers = allContainers
      .filter((c) => c.TRSEQ === trseq)
      .map(({ TRSEQ: _, ...rest }) => rest);

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
