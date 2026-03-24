import { useState, useEffect, useCallback, useRef } from "react";
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
import { StepDetailsViewer } from "./components/StepDetailsViewer";
import { StatusActionBar } from "./components/StatusActionBar";
import { PpapAlert } from "./components/PpapAlert";
import { DoNotPressAlert } from "./components/DoNotPressAlert";
import { useOperation } from "./hooks/useOperation";
import { useVcutData } from "./hooks/useVcutData";
import { apiGet } from "@/api/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { W_DRAWING_PANEL, W_PRESS_SECTION } from "@/constants/widths";
import type { OperationStep } from "@/types/workOrder";
import { useRegisterRefresh } from "@/context/RefreshContext";

export function OperationDetailsPage() {
  const { transac, copmachine } = useParams<{ transac: string; copmachine: string }>();
  const { state } = useSession();
  const { t } = useTranslation();
  const { operation, loading, error, refetch } = useOperation(transac!, copmachine!);
  const [localStatus, setLocalStatus] = useState<string | null>(null);

  // VCUT-specific data — fetched only when operation is VCUT
  const isVcutCheck = operation?.NO_INVENTAIRE === "VCUT" || operation?.PRODUIT_CODE === "VCUT" || (operation?.FMCODE ?? "") === "TableSaw";
  const { vcutData, loading: vcutLoading } = useVcutData(isVcutCheck ? Number(transac) : null);

  // Register with global refresh so the Header refresh button re-fetches this page's data
  useRegisterRefresh(refetch);

  // Panel data from API
  const [panelDetail, setPanelDetail] = useState<PanelDetail | null>(null);
  const [panelLayers, setPanelLayers] = useState<PanelLayer[]>([]);
  const [panelGroupHeader, setPanelGroupHeader] = useState<{ code: string; desc: string } | string>("");

  // Drawing data from API
  const [drawingUrls, setDrawingUrls] = useState<string[] | undefined>(undefined);
  const [activeDrawingSeq, setActiveDrawingSeq] = useState<number | null>(null);

  // Step details (shown inline in drawing pane)
  const [activeStep, setActiveStep] = useState<OperationStep | null>(null);
  const [activeStepNumber, setActiveStepNumber] = useState<number>(0);

  const handleStatusChanged = useCallback((newStatus: string) => {
    setLocalStatus(newStatus);
  }, []);

  // Fetch panel data when operation loads
  useEffect(() => {
    if (!operation) return;

    const fetchPanelData = async () => {
      try {
        const panelNiSeq = (operation as unknown as Record<string, unknown>).Panel_NiSeq;
        const panelNiSeqNum = Number(panelNiSeq) || 0;
        const res = await apiGet<{
          panelDetail: Record<string, unknown> | null;
          layers: PanelLayer[];
          groupHeader: string;
        }>(`getPanelData.cfm?transac=${operation.TRANSAC}&panelNiSeq=${panelNiSeqNum}`);

        if (res.success && res.data) {
          if (res.data.panelDetail) {
            const pd = res.data.panelDetail;
            if (import.meta.env.DEV) {
              console.log("[OperationDetails] getPanelData", {
                transac: operation.TRANSAC,
                panelNiSeq: panelNiSeqNum,
                rawPanel_NiSeq: panelNiSeq,
                THICKNESS_RAW: pd.THICKNESS_RAW,
                THICKNESS_displayed: pd.THICKNESS,
              });
            }
            setPanelDetail({
              ITEM: String(pd.ITEM || ""),
              ITEM_SEQ: pd.ITEM_SEQ as number | undefined,
              PANNEAU: String(pd.PANNEAU || ""),
              PANNEAU_SEQ: pd.PANNEAU_SEQ as number | undefined,
              DESCRIPTION: String(pd.DESCRIPTION_P || ""),
              VER: (pd.VER ?? "") as string | number,
              TYPE: String(pd.TYPE || ""),
              THICKNESS: (pd.THICKNESS ?? null) as number | string | null,
              POIDS: (pd.POIDS ?? "") as string | number,
            });
          }
          setPanelLayers(res.data.layers || []);
          setPanelGroupHeader(res.data.groupHeader || "");
        }
      } catch (err) {
        console.error("Failed to fetch panel data:", err);
      }
    };

    fetchPanelData();
  }, [operation]);

  // Fetch drawings when operation loads
  // For PRESS operations, wait for panel data and default to panel drawing
  useEffect(() => {
    if (!operation) return;

    const fmcode = operation.FMCODE ?? "";
    const operationIsPress = fmcode.toUpperCase().includes("PRESS");

    // For PRESS, skip initial fetch — we'll load panel drawing once panelDetail is ready
    if (operationIsPress) return;

    const fetchProductDrawings = async () => {
      try {
        const op = operation as unknown as Record<string, unknown>;
        const params = new URLSearchParams();
        if (op.PRODUIT_SEQ) params.set("produitSeq", String(op.PRODUIT_SEQ));
        if (op.INVENTAIRE_SEQ) params.set("inventaireSeq", String(op.INVENTAIRE_SEQ));
        if (op.KIT_SEQ) params.set("kitSeq", String(op.KIT_SEQ));

        const res = await apiGet<{ doseq: number; url: string }[]>(
          `getDrawings.cfm?${params.toString()}`
        );

        if (res.success && res.data && res.data.length > 0) {
          const urls = res.data.map((d) => `/api${d.url}`);
          setDrawingUrls(urls);
        } else {
          setDrawingUrls(undefined);
        }
      } catch (err) {
        console.error("Failed to fetch drawings:", err);
        setDrawingUrls(undefined);
      }
    };

    fetchProductDrawings();
  }, [operation]);

  // For PRESS: load panel drawing by default once panel data is available
  useEffect(() => {
    if (!operation || !panelDetail) return;

    const fmcode = operation.FMCODE ?? "";
    if (!fmcode.toUpperCase().includes("PRESS")) return;

    const panneauSeq = panelDetail.PANNEAU_SEQ;
    if (!panneauSeq) return;

    const fetchPanelDrawing = async () => {
      try {
        const res = await apiGet<{ doseq: number; url: string }[]>(
          `getDrawings.cfm?inventaireSeq=${panneauSeq}`
        );
        if (res.success && res.data && res.data.length > 0) {
          setDrawingUrls(res.data.map((d) => `/api${d.url}`));
          setActiveDrawingSeq(panneauSeq);
        } else {
          // Fallback to product drawing
          const op = operation as unknown as Record<string, unknown>;
          const params = new URLSearchParams();
          if (op.PRODUIT_SEQ) params.set("produitSeq", String(op.PRODUIT_SEQ));
          if (op.INVENTAIRE_SEQ) params.set("inventaireSeq", String(op.INVENTAIRE_SEQ));
          if (op.KIT_SEQ) params.set("kitSeq", String(op.KIT_SEQ));

          const fallback = await apiGet<{ doseq: number; url: string }[]>(
            `getDrawings.cfm?${params.toString()}`
          );
          if (fallback.success && fallback.data && fallback.data.length > 0) {
            setDrawingUrls(fallback.data.map((d) => `/api${d.url}`));
          } else {
            setDrawingUrls(undefined);
          }
        }
      } catch (err) {
        console.error("Failed to fetch panel drawing:", err);
        setDrawingUrls(undefined);
      }
    };

    fetchPanelDrawing();
  }, [operation, panelDetail]);

  const handleViewDrawing = useCallback(async (inventaireSeq: number) => {
    // Clear step details when switching to drawings
    setActiveStep(null);
    try {
      const res = await apiGet<{ doseq: number; url: string }[]>(
        `getDrawings.cfm?inventaireSeq=${inventaireSeq}`
      );
      if (res.success && res.data && res.data.length > 0) {
        setDrawingUrls(res.data.map((d) => `/api${d.url}`));
        setActiveDrawingSeq(inventaireSeq);
      } else {
        setDrawingUrls(undefined);
        setActiveDrawingSeq(null);
      }
    } catch (err) {
      console.error("Failed to fetch drawings:", err);
      setDrawingUrls(undefined);
      setActiveDrawingSeq(null);
    }
  }, []);

  const handleViewStepDetails = useCallback((step: OperationStep, stepNumber: number) => {
    setActiveStep(step);
    setActiveStepNumber(stepNumber);
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
  const locOp = (fr: string | null | undefined, en: string | null | undefined) =>
    (state.language === "fr" ? fr : en) ?? fr ?? "—";
  const isPress = fmcode.toUpperCase().includes("PRESS");
  const isCnc = fmcode.toUpperCase().includes("CNC") || fmcode.toUpperCase().includes("SAND");
  const isVcut = operation.NO_INVENTAIRE === "VCUT" || operation.PRODUIT_CODE === "VCUT" || fmcode === "TableSaw";

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
        <OperationHeader operation={operation} language={state.language} statusCode={localStatus ?? operation.STATUT_CODE} isVcut={isVcut} vcutData={vcutData} />

        {/* All cards (left 50%) + technical drawing (right 50%) */}
        <div className="flex gap-2 items-stretch">
          {/* Left: machine overview + operation-specific detail cards (full width for VCUT) */}
          <div className={cn(isVcut ? "w-full" : "w-1/2", "min-w-0 flex flex-col gap-2")}>
            {/* Machine overview: materials (left) + next step (CNC only, centre) + machine info panel (right) */}
            <div className="flex gap-2 items-stretch">
              {(isPress || isCnc) && (
                <div className="shrink-0">
                  <PressInfoSection operation={operation} showMoldInfo={isPress} />
                </div>
              )}

              {/* Next step — inline card between materials and machine info (CNC only) */}
              {isCnc && (() => {
                const op = operation as unknown as Record<string, unknown>;
                const loc = (fr: unknown, en: unknown) =>
                  String((state.language === "fr" ? fr : en) ?? fr ?? "—");
                const panelSource = (op.PANEL_SOURCE as string | null)?.trim() ?? null;
                const pvPaneau = (op.PV_PANEAU as string | null)?.trim() || null;
                const panelWarning = pvPaneau
                  ? panelSource === "LOCAL"
                    ? state.language === "fr"
                      ? `UTILISER LE PANNEAU #${pvPaneau} PRESSÉ LOCALEMENT / VÉRIFIEZ AVEC LES INGÉNIEURS`
                      : `USE LOCALLY PRESSED PANEL #${pvPaneau} / CHECK WITH ENGINEERS`
                    : state.language === "fr"
                      ? `UTILISER LE PANNEAU EXTERNALISÉ #${pvPaneau} EN STOCK / VÉRIFIEZ AVEC LES INGÉNIEURS`
                      : `USE OUTSOURCED PANEL #${pvPaneau} FROM STOCK / CHECK WITH ENGINEERS`
                  : null;
                return (
                  <Card className={cn(W_PRESS_SECTION.moldCard, "py-0 gap-0 flex flex-col justify-center")}>
                    <CardContent className="px-4 py-3 flex flex-col items-center gap-2">
                      {panelWarning && (
                        <div className="text-[0.9rem] font-bold text-center tracking-wide">
                          {panelWarning}
                        </div>
                      )}
                      <div className="flex items-center gap-3">
                        <span className="text-[0.8rem] font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap shrink-0">
                          {t("operation.nextStep")}
                        </span>
                        <div className="border border-blue-500 text-blue-600 rounded px-3 py-1 text-sm font-medium">
                          {op.NEXT_OPERATION ? (
                            <>
                              <span>{loc(op.NEXT_MACHINE_P, op.NEXT_MACHINE_S)}</span>
                              {op.NEXT_DEPT_P && (
                                <span> — {loc(op.NEXT_DEPT_P, op.NEXT_DEPT_S)}</span>
                              )}
                            </>
                          ) : (
                            t("common.noResults")
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })()}

              {!isVcut && (
                <div className={cn("flex-1", W_PRESS_SECTION.machineInfoMin)}>
                  <MachineInfoPanel operation={operation} />
                </div>
              )}
            </div>

            {/* Operation-specific detail cards */}
            {isPress && (
              <>
                {/* Next step — full-width row for PRESS (inline row already full with mold card) */}
                {(() => {
                  const op = operation as unknown as Record<string, unknown>;
                  const loc = (fr: unknown, en: unknown) =>
                    String((state.language === "fr" ? fr : en) ?? fr ?? "—");
                  const panelSource = (op.PANEL_SOURCE as string | null)?.trim() ?? null;
                  const pvPaneau = (op.PV_PANEAU as string | null)?.trim() || null;
                  const panelWarning = pvPaneau
                    ? panelSource === "LOCAL"
                      ? state.language === "fr"
                        ? `UTILISER LE PANNEAU #${pvPaneau} PRESSÉ LOCALEMENT / VÉRIFIEZ AVEC LES INGÉNIEURS`
                        : `USE LOCALLY PRESSED PANEL #${pvPaneau} / CHECK WITH ENGINEERS`
                      : state.language === "fr"
                        ? `UTILISER LE PANNEAU EXTERNALISÉ #${pvPaneau} EN STOCK / VÉRIFIEZ AVEC LES INGÉNIEURS`
                        : `USE OUTSOURCED PANEL #${pvPaneau} FROM STOCK / CHECK WITH ENGINEERS`
                    : null;
                  if (!op.NEXT_OPERATION && !panelWarning) return null;
                  return (
                    <Card className="py-0 gap-0">
                      <CardContent className="px-4 py-3 flex flex-col items-center gap-2">
                        {panelWarning && (
                          <div className="text-[0.9rem] font-bold text-center tracking-wide">
                            {panelWarning}
                          </div>
                        )}
                        <div className="flex items-center gap-3">
                          <span className="text-[0.8rem] font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap shrink-0">
                            {t("operation.nextStep")}
                          </span>
                          <div className="border border-blue-500 text-blue-600 rounded px-3 py-1 text-sm font-medium">
                            {op.NEXT_OPERATION ? (
                              <>
                                <span>{loc(op.NEXT_MACHINE_P, op.NEXT_MACHINE_S)}</span>
                                {op.NEXT_DEPT_P && (
                                  <span> — {loc(op.NEXT_DEPT_P, op.NEXT_DEPT_S)}</span>
                                )}
                              </>
                            ) : (
                              t("common.noResults")
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })()}
                {panelDetail && <PanelDetailsTable detail={panelDetail} onViewDrawing={handleViewDrawing} activeDrawingSeq={activeDrawingSeq} />}
                {panelLayers.length > 0 && (
                  <PanelLayersTable
                    layers={panelLayers}
                    groupHeader={panelGroupHeader}
                  />
                )}
              </>
            )}
            {isCnc && (
              <>
                {panelDetail && <PanelDetailsTable detail={panelDetail} onViewDrawing={handleViewDrawing} activeDrawingSeq={activeDrawingSeq} />}
                <div className="flex-1 flex flex-col">
                  <CncInfoSection
                    operation={operation}
                    language={state.language}
                    hideNextStep
                    onViewStepDetails={handleViewStepDetails}
                    activeStepSeq={activeStep?.METSEQ ?? null}
                  />
                </div>
              </>
            )}
            {isVcut && <VcutInfoSection vcutData={vcutData} language={state.language} loading={vcutLoading} />}
            {!isPress && !isCnc && !isVcut && (
              <div className="text-muted-foreground text-center py-8">
                Operation type: {fmcode}
              </div>
            )}
          </div>

          {/* Right 50%: technical drawing or step instructions (hidden for VCUT) */}
          {!isVcut && (
            <div className={W_DRAWING_PANEL.container}>
              {activeStep ? (
                <StepDetailsViewer
                  step={activeStep}
                  stepNumber={activeStepNumber}
                  language={state.language}
                  onClose={() => setActiveStep(null)}
                />
              ) : (
                <DrawingViewer images={drawingUrls} />
              )}
            </div>
          )}
        </div>
      </div>

      {/* Floating status action panel */}
      <StatusActionBar
        transac={operation.TRANSAC}
        copmachine={operation.COPMACHINE ?? Number(copmachine)}
        statusCode={localStatus ?? operation.STATUT_CODE}
        orderNumber={operation.NO_PROD}
        operationLabel={locOp(operation.OPERATION_P, operation.OPERATION_S)}
        machineLabel={locOp(operation.MACHINE_P, operation.MACHINE_S)}
        onStatusChanged={handleStatusChanged}
      />
    </div>
  );
}
