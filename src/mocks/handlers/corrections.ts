import { http, HttpResponse } from "msw";
import type { CorrectionData } from "@/types/corrections";

const mockCorrections: Record<number, CorrectionData> = {
  1001: {
    TJSEQ: 1001,
    TRANSAC: 50001,
    NO_PROD: "ORD-2024-001",
    NOM_CLIENT: "Cascade Lumber",
    PRODUIT_P: "Panneau composite 4x8",
    PRODUIT_S: "Composite Panel 4x8",
    TJDEBUT: "2024-01-15 07:00:00",
    TJFIN: "2024-01-15 15:30:00",
    TJDUREE: 510,
    EMNOM: "Jean Tremblay",
    EMNOIDENT: 1234,
    MACODE: "PR-01",
    MACHINE_P: "Presse #1",
    MACHINE_S: "Press #1",
    DECODE: "PRESS",
    OPERATION_P: "Pressage",
    OPERATION_S: "Pressing",
    MODEPROD_MPCODE: "PROD",
    ENTREPF: 1,
    QTE_BONNE: 150,
    QTE_DEFAUT: 3,
    defects: [
      { id: 1, typeId: 1, type_P: "Bosses / Impact", type_S: "Dents / Impact", originalQty: 2, correctedQty: 2 },
      { id: 2, typeId: 3, type_P: "Égratignure", type_S: "Scratch", originalQty: 1, correctedQty: 1 },
    ],
    finishedProducts: [
      { id: 1, product: "PNL-4x8-A", container: "SKID-001", originalQty: 80, correctedQty: 80 },
      { id: 2, product: "PNL-4x8-B", container: "SKID-002", originalQty: 70, correctedQty: 70 },
    ],
    materials: [
      { id: 1, code: "MAT-PLY-001", description_P: "Contreplaqué brut", description_S: "Raw plywood", originalQty: 160, correctedQty: 160 },
    ],
  },
  1004: {
    TJSEQ: 1004,
    TRANSAC: 50001,
    NO_PROD: "ORD-2024-001",
    NOM_CLIENT: "Cascade Lumber",
    PRODUIT_P: "Panneau composite 4x8",
    PRODUIT_S: "Composite Panel 4x8",
    TJDEBUT: "2024-01-14 07:00:00",
    TJFIN: "2024-01-14 08:30:00",
    TJDUREE: 90,
    EMNOM: "Jean Tremblay",
    EMNOIDENT: 1234,
    MACODE: "PR-01",
    MACHINE_P: "Presse #1",
    MACHINE_S: "Press #1",
    DECODE: "PRESS",
    OPERATION_P: "Pressage",
    OPERATION_S: "Pressing",
    MODEPROD_MPCODE: "SETUP",
    ENTREPF: 0,
    QTE_BONNE: 0,
    QTE_DEFAUT: 0,
    defects: [],
    finishedProducts: [],
    materials: [],
  },
};

export const correctionsHandlers = [
  http.get("/api/getCorrection.cfm", ({ request }) => {
    const url = new URL(request.url);
    const tjseq = Number(url.searchParams.get("tjseq"));
    const correction = mockCorrections[tjseq];

    if (!correction) {
      return HttpResponse.json({
        success: false,
        data: null,
        error: "Correction not found",
      });
    }

    return HttpResponse.json({
      success: true,
      data: correction,
      message: "Correction data retrieved",
    });
  }),

  http.post("/api/submitCorrection.cfm", async ({ request }) => {
    const body = (await request.json()) as { tjseq: number };
    return HttpResponse.json({
      success: true,
      data: { TJSEQ: body.tjseq },
      message: "Correction saved successfully",
    });
  }),
];
