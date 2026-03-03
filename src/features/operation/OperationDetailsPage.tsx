import { useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import { useSession } from "@/context/SessionContext";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { OperationHeader } from "./components/OperationHeader";
import { PressInfoSection } from "./components/PressInfoSection";
import { PanelDetailsTable, type PanelDetail } from "./components/PanelDetailsTable";
import { PanelLayersTable, type PanelLayer } from "./components/PanelLayersTable";
import { CncInfoSection } from "./components/CncInfoSection";
import { VcutInfoSection } from "./components/VcutInfoSection";
import { MachineInfoPanel } from "./components/MachineInfoPanel";
import { DrawingViewer } from "./components/DrawingViewer";
import { StatusActionBar } from "./components/StatusActionBar";
import { PpapAlert } from "./components/PpapAlert";
import { DoNotPressAlert } from "./components/DoNotPressAlert";
import { useOperation } from "./hooks/useOperation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "react-i18next";
import { W_DRAWING_PANEL } from "@/constants/widths";

// ── Mock panel construction data (replace with API data when available) ──────

const MOCK_PANEL_DETAIL: PanelDetail = {
  ITEM:        "FWOD-1974-20",
  PANNEAU:     "FR176-051-P",
  DESCRIPTION: "FWOD-1974-20-MAPLE FC- SEAT",
  VER:         1,
  TYPE:        "Exposed",
  POIDS:       6.69,
};

const MOCK_PANEL_LAYERS: PanelLayer[] = [
  { NIRANG: 1,  NILONGUEUR: 21, NILARGEUR: 21, SPECIES: "FR176-051-P 2-PLY MAPLE 21 X 21 FACE FLAT CUT BOOK MATCH", GRADE: "FC", CUT: "1/21", THICKNESS: "L",  GRAIN: "2-PLY", P_LAM: "",    GLUE: "",    TAPE: "Non", SAND: "Oui" },
  { NIRANG: 2,  NILONGUEUR: 21, NILARGEUR: 21, SPECIES: "MERISIER SOUND 21 X 21 X 1/16 ROTARY CUT",                 GRADE: "RC", CUT: "1/16", THICKNESS: "L",  GRAIN: "",      P_LAM: "1",  GLUE: "Non", TAPE: "Non", SAND: "Non" },
  { NIRANG: 3,  NILONGUEUR: 21, NILARGEUR: 21, SPECIES: "MERISIER SOUND 21 X 21 X 1/16 ROTARY CUT",                 GRADE: "RC", CUT: "1/16", THICKNESS: "X",  GRAIN: "",      P_LAM: "",   GLUE: "Non", TAPE: "Non", SAND: "Non" },
  { NIRANG: 4,  NILONGUEUR: 21, NILARGEUR: 21, SPECIES: "MERISIER SOUND 21 X 21 X 1/16 ROTARY CUT",                 GRADE: "RC", CUT: "1/16", THICKNESS: "L",  GRAIN: "",      P_LAM: "1",  GLUE: "Non", TAPE: "Non", SAND: "Non" },
  { NIRANG: 5,  NILONGUEUR: 21, NILARGEUR: 21, SPECIES: "MERISIER SOUND 21 X 21 X 1/16 ROTARY CUT",                 GRADE: "RC", CUT: "1/16", THICKNESS: "X",  GRAIN: "",      P_LAM: "",   GLUE: "Non", TAPE: "Non", SAND: "Non" },
  { NIRANG: 6,  NILONGUEUR: 21, NILARGEUR: 21, SPECIES: "MERISIER SOUND 21 X 21 X 1/16 ROTARY CUT",                 GRADE: "RC", CUT: "1/16", THICKNESS: "L",  GRAIN: "",      P_LAM: "1",  GLUE: "Non", TAPE: "Non", SAND: "Non" },
  { NIRANG: 7,  NILONGUEUR: 21, NILARGEUR: 21, SPECIES: "MERISIER SOUND 21 X 21 X 1/16 ROTARY CUT",                 GRADE: "RC", CUT: "1/16", THICKNESS: "X",  GRAIN: "",      P_LAM: "",   GLUE: "Non", TAPE: "Non", SAND: "Non" },
  { NIRANG: 8,  NILONGUEUR: 21, NILARGEUR: 21, SPECIES: "MERISIER SOUND 21 X 21 X 1/16 ROTARY CUT",                 GRADE: "RC", CUT: "1/16", THICKNESS: "L",  GRAIN: "",      P_LAM: "1",  GLUE: "Non", TAPE: "Non", SAND: "Non" },
  { NIRANG: 9,  NILONGUEUR: 21, NILARGEUR: 21, SPECIES: "MERISIER SOUND 21 X 21 X 1/16 ROTARY CUT",                 GRADE: "RC", CUT: "1/16", THICKNESS: "X",  GRAIN: "",      P_LAM: "",   GLUE: "Non", TAPE: "Non", SAND: "Non" },
  { NIRANG: 10, NILONGUEUR: 21, NILARGEUR: 21, SPECIES: "MERISIER SOUND 21 X 21 X 1/16 ROTARY CUT",                 GRADE: "RC", CUT: "1/16", THICKNESS: "L",  GRAIN: "",      P_LAM: "1",  GLUE: "Non", TAPE: "Non", SAND: "Non" },
  { NIRANG: 11, NILONGUEUR: 21, NILARGEUR: 21, SPECIES: "MERISIER SOUND 21 X 21 X 1/16 ROTARY CUT",                 GRADE: "RC", CUT: "1/16", THICKNESS: "X",  GRAIN: "",      P_LAM: "",   GLUE: "Non", TAPE: "Non", SAND: "Non" },
  { NIRANG: 12, NILONGUEUR: 21, NILARGEUR: 21, SPECIES: "MERISIER SOUND 21 X 21 X 1/16 ROTARY CUT",                 GRADE: "RC", CUT: "1/16", THICKNESS: "L",  GRAIN: "",      P_LAM: "1",  GLUE: "Non", TAPE: "Non", SAND: "Non" },
];

const MOCK_PANEL_GROUP_HEADER = "SEAT EXPOSED MAPLE 21 X 21 X 0.75 (FR176-051-P)";

export function OperationDetailsPage() {
  const { transac, copmachine } = useParams<{ transac: string; copmachine: string }>();
  const { state } = useSession();
  const { t } = useTranslation();
  const { operation, loading, error, refetch } = useOperation(transac!, copmachine!);
  const [localStatus, setLocalStatus] = useState<string | null>(null);

  const handleStatusChanged = useCallback((newStatus: string) => {
    setLocalStatus(newStatus);
  }, []);

  if (loading) {
    return <LoadingSpinner className="flex-1" />;
  }

  if (error || !operation) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-3">
          <p className="text-lg text-destructive">{error ?? "Operation not found"}</p>
          <Button onClick={refetch}>{t("actions.refresh")}</Button>
        </div>
      </div>
    );
  }

  const fmcode = operation.FMCODE ?? "";
  const isPress = fmcode.toUpperCase().includes("PRESS");
  const isCnc = fmcode.toUpperCase().includes("CNC") || fmcode.toUpperCase().includes("SAND");
  const isVcut = operation.NO_INVENTAIRE === "VCUT" || fmcode === "TableSaw";

  // PPAP and DoNotPress flags — will be populated from extended operation data
  const hasPpap = false;
  const hasDoNotPress = false;

  return (
    <div className="flex flex-col h-full bg-[#C5E0D4]">
      <div className="flex-1 overflow-y-auto space-y-2 p-0 pb-20 [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5">
        {/* Alerts */}
        {hasPpap && <PpapAlert />}
        {hasDoNotPress && <DoNotPressAlert />}

        {/* Header */}
        <OperationHeader operation={operation} language={state.language} />

        {/* All cards (left 50%) + technical drawing (right 50%) */}
        <div className="flex gap-2 items-stretch">
          {/* Left 50%: machine overview + operation-specific detail cards */}
          <div className="w-1/2 min-w-0 flex flex-col gap-2">
            {/* Machine overview: materials (left) + machine info panel (right) */}
            <div className="flex gap-2">
              {(isPress || isCnc) && (
                <div className="shrink-0">
                  <PressInfoSection operation={operation} showMoldInfo={isPress} />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <MachineInfoPanel operation={operation} />
              </div>
            </div>

            {/* Next step — full width row (CNC only) */}
            {isCnc && (() => {
              const op = operation as unknown as Record<string, unknown>;
              const loc = (fr: unknown, en: unknown) =>
                String((state.language === "fr" ? fr : en) ?? fr ?? "—");
              return (
                <Card className="py-0 gap-0">
                  <CardHeader className="py-2 px-4">
                    <CardTitle className="text-[0.8rem]">{t("operation.nextStep")}</CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-3">
                    <div className="text-sm text-muted-foreground">
                      {op.NEXT_OPERATION
                        ? loc(op.NEXT_OPERATION_P, op.NEXT_OPERATION_S)
                        : t("common.noResults")}
                    </div>
                    {!!op.NEXT_MACHINE_P && (
                      <div className="text-sm mt-1">
                        {t("operation.machine")}: {loc(op.NEXT_MACHINE_P, op.NEXT_MACHINE_S)}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })()}

            {/* Operation-specific detail cards */}
            {isPress && (
              <>
                <PanelDetailsTable detail={MOCK_PANEL_DETAIL} />
                <PanelLayersTable
                  layers={MOCK_PANEL_LAYERS}
                  groupHeader={MOCK_PANEL_GROUP_HEADER}
                />
              </>
            )}
            {isCnc && (
              <>
                <PanelDetailsTable detail={MOCK_PANEL_DETAIL} />
                <div className="flex-1 flex flex-col">
                  <CncInfoSection operation={operation} language={state.language} hideNextStep />
                </div>
              </>
            )}
            {isVcut && <VcutInfoSection operation={operation} language={state.language} />}
            {!isPress && !isCnc && !isVcut && (
              <div className="text-muted-foreground text-center py-8">
                Operation type: {fmcode}
              </div>
            )}
          </div>

          {/* Right 50%: technical drawing */}
          <div className={W_DRAWING_PANEL.container}>
            <DrawingViewer
              images={
                isPress
                  ? ["/mock/drawing-press.png"]
                  : isCnc
                  ? ["/mock/drawing-cnc-1.png", "/mock/drawing-cnc-2.png"]
                  : undefined
              }
            />
          </div>
        </div>
      </div>

      {/* Floating status action panel */}
      <StatusActionBar
        transac={operation.TRANSAC}
        copmachine={operation.COPMACHINE ?? Number(copmachine)}
        statusCode={localStatus ?? operation.STATUT_CODE}
        orderNumber={operation.NO_PROD}
        onStatusChanged={handleStatusChanged}
      />
    </div>
  );
}
