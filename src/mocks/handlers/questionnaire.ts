import { http, HttpResponse } from "msw";

/** Mock stop-cause data — in production these come from QA_CAUSEP / QA_CAUSES tables */
const primaryCauses = [
  { id: 1, description_P: "Bris mécanique", description_S: "Mechanical breakdown" },
  { id: 2, description_P: "Manque matériel", description_S: "Lack of material" },
  { id: 3, description_P: "Changement priorité", description_S: "Priority change" },
  { id: 4, description_P: "Problème qualité", description_S: "Quality issue" },
  { id: 5, description_P: "Fin du quart", description_S: "End of shift" },
  { id: 6, description_P: "Maintenance préventive", description_S: "Preventive maintenance" },
  { id: 7, description_P: "Pause repas", description_S: "Meal break" },
  { id: 8, description_P: "Autre", description_S: "Other" },
];

const secondaryCauses: Record<number, { id: number; description_P: string; description_S: string }[]> = {
  1: [
    { id: 10, description_P: "Remplacement pièce", description_S: "Part replacement" },
    { id: 11, description_P: "Ajustement", description_S: "Adjustment" },
    { id: 12, description_P: "Attente technicien", description_S: "Waiting for technician" },
  ],
  2: [
    { id: 20, description_P: "En commande", description_S: "On order" },
    { id: 21, description_P: "En transit", description_S: "In transit" },
    { id: 22, description_P: "Stock insuffisant", description_S: "Insufficient stock" },
  ],
  3: [
    { id: 30, description_P: "Commande urgente", description_S: "Rush order" },
    { id: 31, description_P: "Réorganisation", description_S: "Reorganization" },
  ],
  4: [
    { id: 40, description_P: "Défaut visuel", description_S: "Visual defect" },
    { id: 41, description_P: "Dimension hors tolérance", description_S: "Dimension out of tolerance" },
    { id: 42, description_P: "Matériel non conforme", description_S: "Non-conforming material" },
  ],
  5: [
    { id: 50, description_P: "Quart terminé", description_S: "Shift ended" },
  ],
  6: [
    { id: 60, description_P: "Entretien planifié", description_S: "Planned maintenance" },
    { id: 61, description_P: "Nettoyage", description_S: "Cleaning" },
  ],
  7: [
    { id: 70, description_P: "Dîner", description_S: "Lunch" },
    { id: 71, description_P: "Pause 15 min", description_S: "15 min break" },
  ],
  8: [
    { id: 80, description_P: "Voir note", description_S: "See notes" },
  ],
};

/** Mock defect types */
const defectTypes = [
  { id: 1, description_P: "Bosses / Impact", description_S: "Dents / Impact" },
  { id: 2, description_P: "Délaminage", description_S: "Delamination" },
  { id: 3, description_P: "Égratignure", description_S: "Scratch" },
  { id: 4, description_P: "Fendillement", description_S: "Cracking" },
  { id: 5, description_P: "Gauchissement", description_S: "Warping" },
  { id: 6, description_P: "Mauvaise coupe", description_S: "Bad cut" },
  { id: 7, description_P: "Tache", description_S: "Stain" },
  { id: 8, description_P: "Autre", description_S: "Other" },
];

export const questionnaireHandlers = [
  http.get("/api/getStopCauses.cfm", () => {
    return HttpResponse.json({
      success: true,
      data: primaryCauses,
      message: `Retrieved ${primaryCauses.length} primary causes`,
    });
  }),

  http.get("/api/getSecondaryCauses.cfm", ({ request }) => {
    const url = new URL(request.url);
    const primaryId = Number(url.searchParams.get("primaryId"));
    const causes = secondaryCauses[primaryId] ?? [];

    return HttpResponse.json({
      success: true,
      data: causes,
      message: `Retrieved ${causes.length} secondary causes`,
    });
  }),

  http.get("/api/getDefectTypes.cfm", () => {
    return HttpResponse.json({
      success: true,
      data: defectTypes,
      message: `Retrieved ${defectTypes.length} defect types`,
    });
  }),

  http.post("/api/submitQuestionnaire.cfm", async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;

    return HttpResponse.json({
      success: true,
      data: { transac: body.transac },
      message: "Questionnaire submitted successfully",
    });
  }),
];
