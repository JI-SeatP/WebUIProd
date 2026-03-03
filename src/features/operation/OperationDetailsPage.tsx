import { useState, useEffect, useCallback } from "react";
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
import { apiGet } from "@/api/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "react-i18next";
import { W_DRAWING_PANEL } from "@/constants/widths";

export function OperationDetailsPage() {
  const { transac, copmachine } = useParams<{ transac: string; copmachine: string }>();
  const { state } = useSession();
  const { t } = useTranslation();
  const { operation, loading, error, refetch } = useOperation(transac!, copmachine!);
  const [localStatus, setLocalStatus] = useState<string | null>(null);

  // Panel data from API
  const [panelDetail, setPanelDetail] = useState<PanelDetail | null>(null);
  const [panelLayers, setPanelLayers] = useState<PanelLayer[]>([]);
  const [panelGroupHeader, setPanelGroupHeader] = useState<{ code: string; desc: string } | string>("");

  // Drawing data from API
  const [drawingUrls, setDrawingUrls] = useState<string[] | undefined>(undefined);
  const [activeDrawingSeq, setActiveDrawingSeq] = useState<number | null>(null);

  const handleStatusChanged = useCallback((newStatus: string) => {
    setLocalStatus(newStatus);
  }, []);

  // Fetch panel data when operation loads
  useEffect(() => {
    if (!operation) return;

    const fetchPanelData = async () => {
      try {
        const panelNiSeq = (operation as Record<string, unknown>).Panel_NiSeq;
        const res = await apiGet<{
          panelDetail: Record<string, unknown> | null;
          layers: PanelLayer[];
          groupHeader: string;
        }>(`getPanelData.cfm?transac=${operation.TRANSAC}&panelNiSeq=${panelNiSeq || 0}`);

        if (res.success && res.data) {
          if (res.data.panelDetail) {
            const pd = res.data.panelDetail;
            setPanelDetail({
              ITEM: String(pd.ITEM || ""),
              ITEM_SEQ: pd.ITEM_SEQ as number | undefined,
              PANNEAU: String(pd.PANNEAU || ""),
              PANNEAU_SEQ: pd.PANNEAU_SEQ as number | undefined,
              DESCRIPTION: String(pd.DESCRIPTION_P || ""),
              VER: pd.VER ?? "",
              TYPE: String(pd.TYPE || ""),
              POIDS: pd.POIDS ?? "",
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
  useEffect(() => {
    if (!operation) return;

    const fetchDrawings = async () => {
      try {
        const op = operation as Record<string, unknown>;
        const params = new URLSearchParams();
        if (op.PRODUIT_SEQ) params.set("produitSeq", String(op.PRODUIT_SEQ));
        if (op.INVENTAIRE_SEQ) params.set("inventaireSeq", String(op.INVENTAIRE_SEQ));
        if (op.KIT_SEQ) params.set("kitSeq", String(op.KIT_SEQ));

        const res = await apiGet<{ doseq: number; url: string }[]>(
          `getDrawings.cfm?${params.toString()}`
        );

        if (res.success && res.data && res.data.length > 0) {
          // Convert API-relative URLs to full proxy URLs
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

    fetchDrawings();
  }, [operation]);

  const handleViewDrawing = useCallback(async (inventaireSeq: number) => {
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
                    {op.NEXT_OPERATION ? (
                      <div className="text-sm">
                        <span className="font-medium">{loc(op.NEXT_MACHINE_P, op.NEXT_MACHINE_S)}</span>
                        {op.NEXT_DEPT_P && (
                          <span className="text-muted-foreground"> — {loc(op.NEXT_DEPT_P, op.NEXT_DEPT_S)}</span>
                        )}
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground">{t("common.noResults")}</div>
                    )}
                  </CardContent>
                </Card>
              );
            })()}

            {/* Operation-specific detail cards */}
            {isPress && (
              <>
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
            <DrawingViewer images={drawingUrls} />
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
