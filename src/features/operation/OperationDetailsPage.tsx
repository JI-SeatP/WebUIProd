import { useParams } from "react-router-dom";
import { useSession } from "@/context/SessionContext";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { OperationHeader } from "./components/OperationHeader";
import { PressInfoSection } from "./components/PressInfoSection";
import { PanelLayersTable } from "./components/PanelLayersTable";
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
      <div className="flex-1 overflow-auto space-y-3 p-0">
        {/* Alerts */}
        {hasPpap && <PpapAlert />}
        {hasDoNotPress && <DoNotPressAlert />}

        {/* Header */}
        <OperationHeader operation={operation} language={state.language} />

        {/* Main content: left panel (machine-specific) + right panel (machine info) */}
        <div className="grid grid-cols-12 gap-3">
          {/* Left panel — machine-specific content */}
          <div className="col-span-8 space-y-3">
            {isPress && (
              <>
                <PressInfoSection operation={operation} />
                <PanelLayersTable layers={[]} />
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

          {/* Right panel — machine info */}
          <div className="col-span-4">
            <MachineInfoPanel operation={operation} language={state.language} />
          </div>
        </div>

        {/* Drawing viewer */}
        <DrawingViewer />
      </div>

      {/* Fixed bottom status action bar */}
      <StatusActionBar
        transac={operation.TRANSAC}
        copmachine={operation.COPMACHINE}
        statusCode={operation.STATUT_CODE}
      />
    </div>
  );
}
