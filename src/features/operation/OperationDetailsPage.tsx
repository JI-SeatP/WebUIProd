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
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-auto space-y-3 p-0 pb-32">
        {/* Alerts */}
        {hasPpap && <PpapAlert />}
        {hasDoNotPress && <DoNotPressAlert />}

        {/* Header */}
        <OperationHeader operation={operation} language={state.language} />

        {/* Machine overview: press mold info (left, press only) + machine info panel (right) */}
        <div className="flex gap-3">
          {isPress && (
            <div className="shrink-0">
              <PressInfoSection operation={operation} />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <MachineInfoPanel operation={operation} />
          </div>
        </div>

        {/* Operation details (left) + technical drawing (right) */}
        <div className="flex gap-3 items-start">
          {/* Left: operation-specific detail cards */}
          <div className="flex-1 min-w-0 space-y-3">
            {isPress && (
              <>
                <PanelDetailsTable detail={MOCK_PANEL_DETAIL} />
                <PanelLayersTable
                  layers={MOCK_PANEL_LAYERS}
                  groupHeader={MOCK_PANEL_GROUP_HEADER}
                />
              </>
            )}
            {isCnc && <CncInfoSection operation={operation} language={state.language} />}
            {isVcut && <VcutInfoSection operation={operation} language={state.language} />}
            {!isPress && !isCnc && !isVcut && (
              <div className="text-muted-foreground text-center py-8">
                Operation type: {fmcode}
              </div>
            )}
          </div>

          {/* Right: technical drawing */}
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
        copmachine={operation.COPMACHINE}
        statusCode={Number(operation.STATUT_CODE)}
      />
    </div>
  );
}
