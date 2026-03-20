import { useState, useCallback } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useSession } from "@/context/SessionContext";
import { apiPost } from "@/api/client";
import { useOperation } from "@/features/operation/hooks/useOperation";
import { useQuestionnaireSubmit } from "./hooks/useQuestionnaireSubmit";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { OrderInfoBlock } from "./components/OrderInfoBlock";
import { EmployeeEntry } from "./components/EmployeeEntry";
import { MoldActionSection } from "./components/MoldActionSection";
import { StopCauseSection } from "./components/StopCauseSection";
import { DefectQuantitySection } from "./components/DefectQuantitySection";
import { GoodQuantitySection } from "./components/GoodQuantitySection";
import { FinishedProductsSection } from "./components/FinishedProductsSection";
import { MaterialOutputSection } from "./components/MaterialOutputSection";
import { Button } from "@/components/ui/button";
import { X, Check } from "lucide-react";
import { W_QUESTIONNAIRE } from "@/constants/widths";
import type { Employee } from "@/types/employee";
import type { FinishedProductRow } from "./components/FinishedProductsSection";
import type { MaterialRow } from "./components/MaterialOutputSection";
import type { SavedDefect } from "./components/DefectQuantitySection";

export function QuestionnairePage() {
  const { transac, type } = useParams<{ transac: string; type: string }>();
  const [searchParams] = useSearchParams();
  const { state } = useSession();
  const { t } = useTranslation();
  const navigate = useNavigate();
  // Get copmachine from URL query param (passed from status action) or fall back to session state
  const copmachine =
    searchParams.get("copmachine") ??
    state.activeOperation?.COPMACHINE?.toString() ??
    "0";
  const fromStatus = searchParams.get("fromStatus") ?? "";
  const { operation, loading: opLoading } = useOperation(transac!, copmachine);

  const isStop = type === "stop";
  const isComp = type === "comp";
  const isSetup = type === "setup";
  const targetStatus = isStop ? "STOP" : isComp ? "COMP" : isSetup ? "SETUP" : undefined;

  // Form state
  const [employeeCode, setEmployeeCode] = useState(
    state.employee?.EMNOIDENT?.toString() ?? ""
  );
  const [employeeName, setEmployeeName] = useState(state.employee?.EMNOM ?? "");
  const [moldAction, setMoldAction] = useState("keep");
  const [primaryCause, setPrimaryCause] = useState("8");       // Production
  const [secondaryCause, setSecondaryCause] = useState("40");  // Fin de quart de travail
  const [notes, setNotes] = useState("");
  const [goodQty, setGoodQty] = useState("");
  const [finishedProducts, setFinishedProducts] = useState<FinishedProductRow[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Write-as-you-go state
  const [smnotrans, setSmnotrans] = useState("");
  const [smseq, setSmseq] = useState<number | null>(null);
  const [smMaterials, setSmMaterials] = useState<MaterialRow[]>([]);
  const [savedDefects, setSavedDefects] = useState<SavedDefect[]>([]);
  const [smLoading, setSmLoading] = useState(false);

  const {
    loading: submitLoading,
    showZeroConfirm,
    submit,
    confirmZero,
    cancelZero,
  } = useQuestionnaireSubmit();

  const handleEmployeeFound = useCallback((employee: Employee) => {
    setEmployeeName(employee.EMNOM);
    setEmployeeCode(String(employee.EMNOIDENT));
  }, []);

  // Write-as-you-go: good qty OK button → creates/updates SM
  // Calls ajouteSM.cfm — creates/updates SM and recalculates material output.
  // The backend reads TJQTEDEFECT directly from TEMPSPROD (already updated by addDefect/removeDefect),
  // so we only need to pass the current goodQty from the UI.
  const handleGoodQtyOk = useCallback(async () => {
    setSmLoading(true);
    try {
      const nopseq = (operation as unknown as Record<string, unknown>)?.NOPSEQ ?? 0;
      const res = await apiPost<{
        smnotrans: string;
        smseq: number;
        materials: MaterialRow[];
      }>("ajouteSM.cfm", {
        transac: Number(transac),
        copmachine: Number(copmachine),
        nopseq: Number(nopseq),
        qteBonne: Number(goodQty) || 0,
        smnotrans,
      });
      if (res.success && res.data) {
        setSmnotrans(res.data.smnotrans || "");
        setSmseq(res.data.smseq);
        setSmMaterials(res.data.materials || []);
      }
    } finally {
      setSmLoading(false);
    }
  }, [transac, copmachine, operation, goodQty, smnotrans]);

  // Write-as-you-go: add defect → writes to DB, refreshes list, recalcs SM
  // In the old software, after adding a defect, calculeQteSMQS is ALWAYS called
  // (which calls ajouteSM first if SM doesn't exist). So we always trigger SM recalc.
  const handleAddDefect = useCallback(async (qty: string, typeId: string, notes: string) => {
    const nopseq = (operation as unknown as Record<string, unknown>)?.NOPSEQ ?? 0;
    const res = await apiPost<{
      defects: SavedDefect[];
      smnotrans?: string;
    }>("addDefect.cfm", {
      transac: Number(transac),
      nopseq: Number(nopseq),
      qty,
      typeId,
      notes,
    });
    if (res.success && res.data) {
      setSavedDefects(res.data.defects || []);
      // Always recalculate SM (old software triggers calculeQteSMQS after every defect change)
      handleGoodQtyOk();
    }
  }, [transac, operation, handleGoodQtyOk]);

  // Write-as-you-go: remove defect → deletes from DB, refreshes list, recalcs SM
  const handleRemoveDefect = useCallback(async (ddseq: number) => {
    const res = await apiPost<{
      defects: SavedDefect[];
      smnotrans?: string;
    }>("removeDefect.cfm", { ddseq });
    if (res.success && res.data) {
      setSavedDefects(res.data.defects || []);
      // Always recalculate SM
      handleGoodQtyOk();
    }
  }, [handleGoodQtyOk]);

  const handleSubmit = useCallback(async () => {
    if (isSetup) {
      // Setup questionnaire: save stop causes to TEMPSPRODEX on the SETUP row
      setErrors({});
      try {
        const res = await apiPost("submitSetupQuestionnaire.cfm", {
          transac: Number(transac),
          copmachine: Number(copmachine),
          primaryCause,
          secondaryCause,
          notes,
        });
        if (res.success) {
          const { toast } = await import("sonner");
          toast.success(t("questionnaire.submitSuccess"));
          navigate(`/orders/${transac}/operation/${copmachine}`);
        }
      } catch {
        const { toast } = await import("sonner");
        toast.error(t("questionnaire.submitError"));
      }
      return;
    }

    const nopseq = (operation as unknown as Record<string, unknown>).NOPSEQ ?? 0;
    const validationErrors = submit({
      transac: Number(transac),
      copmachine: Number(copmachine),
      type: isStop ? "stop" : "comp",
      employeeCode,
      primaryCause: isStop ? primaryCause : undefined,
      secondaryCause: isStop ? secondaryCause : undefined,
      notes: isStop ? notes : undefined,
      moldAction: showMoldAction ? moldAction : undefined,
      goodQty,
      defects: savedDefects.map((d) => ({ qty: String(d.qty), typeId: String(d.typeId), notes: d.notes })),
      finishedProducts:
        showFinishedProducts
          ? finishedProducts.map((p) => ({
              product: p.product,
              qty: p.qty,
              container: p.container,
            }))
          : undefined,
      nopseq: Number(nopseq),
    });

    if (validationErrors) {
      setErrors(validationErrors as Record<string, string>);
    } else {
      setErrors({});
    }
  }, [
    submit,
    transac,
    copmachine,
    isStop,
    isSetup,
    employeeCode,
    primaryCause,
    secondaryCause,
    notes,
    moldAction,
    goodQty,
    savedDefects,
    finishedProducts,
    navigate,
    t,
    operation,
  ]);

  const handleCancel = useCallback(async () => {
    const nopseq = (operation as unknown as Record<string, unknown>)?.NOPSEQ ?? 0;
    await apiPost("cancelQuestionnaire.cfm", {
      transac: Number(transac),
      nopseq: Number(nopseq),
      smnotrans,
      smseq,
    });
    navigate(`/orders/${transac}/operation/${copmachine}`);
  }, [transac, copmachine, smnotrans, smseq, navigate, operation]);

  if (opLoading) {
    return <LoadingSpinner className="flex-1" />;
  }

  if (!operation) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-lg text-destructive">Operation not found</p>
      </div>
    );
  }

  const fmcode = operation.FMCODE ?? "";
  const isPress = fmcode.toUpperCase().includes("PRESS");
  const isCnc = fmcode.toUpperCase().includes("CNC") || fmcode.toUpperCase().includes("SAND");
  const isVcut = operation.NO_INVENTAIRE === "VCUT" || fmcode === "TableSaw";

  // Show mold action for PRESS/CNC on completion
  const showMoldAction = isComp && (isPress || isCnc);
  // Show finished products when operation creates inventory (ENTREPF flag)
  // For now we check if ENTREPOT field exists — in production, use ENTREPF flag
  const showFinishedProducts = operation.ENTREPOT > 0;
  // Hide defect section for VCUT operations
  const showDefects = !isVcut;

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Scrollable content */}
      <div className="flex-1 overflow-auto space-y-2 px-3 pb-3 pt-0">
        {/* Order info */}
        <OrderInfoBlock
          operation={operation}
          language={state.language}
          label={isStop ? t("questionnaire.stopSurvey") : isSetup ? t("questionnaire.setupSurvey") : t("questionnaire.completionSurvey")}
          targetStatus={targetStatus}
          fromStatus={fromStatus}
        />

        {isSetup ? (
          /* ── SETUP QUESTIONNAIRE: only stop cause section ── */
          <div className="flex gap-4 items-start">
            <div className="flex-1 max-w-2xl">
              <StopCauseSection
                language={state.language}
                primaryCause={primaryCause}
                secondaryCause={secondaryCause}
                notes={notes}
                onPrimaryCauseChange={setPrimaryCause}
                onSecondaryCauseChange={setSecondaryCause}
                onNotesChange={setNotes}
                error={errors.primaryCause}
              />
            </div>
          </div>
        ) : (
          /* ── STOP / COMP QUESTIONNAIRE: full form ── */
          <>
            {/* Mold action (PRESS/CNC on COMP only) */}
            {showMoldAction && (
              <MoldActionSection value={moldAction} onChange={setMoldAction} />
            )}

            {/* Row 1: Employee | QTÉ PRODUITE | QUANTITÉ DÉFECTUEUSE — 3 × 1/3 */}
            <div className="flex gap-4 items-start">
              <div className="flex-1">
                <EmployeeEntry
                  employeeCode={employeeCode}
                  employeeName={employeeName}
                  onCodeChange={setEmployeeCode}
                  onEmployeeFound={handleEmployeeFound}
                  error={errors.employeeCode}
                />
              </div>
              <div className="flex-1">
                {showFinishedProducts ? (
                  <FinishedProductsSection
                    products={finishedProducts}
                    onProductsChange={setFinishedProducts}
                  />
                ) : (
                  <GoodQuantitySection value={goodQty} onChange={setGoodQty} onOkPress={handleGoodQtyOk} loading={smLoading} />
                )}
              </div>
              {showDefects && (
                <div className="flex-1">
                  <DefectQuantitySection
                    language={state.language}
                    fmcode={fmcode}
                    onAddDefect={handleAddDefect}
                    onRemoveDefect={handleRemoveDefect}
                    savedDefects={savedDefects}
                    loading={smLoading}
                  />
                </div>
              )}
            </div>

            {/* Row 2: Stop Cause (isStop, 1/3) | Material Output (2/3) */}
            <div className="flex gap-4 items-start">
              {isStop && (
                <div className="flex-1">
                  <StopCauseSection
                    language={state.language}
                    primaryCause={primaryCause}
                    secondaryCause={secondaryCause}
                    notes={notes}
                    onPrimaryCauseChange={setPrimaryCause}
                    onSecondaryCauseChange={setSecondaryCause}
                    onNotesChange={setNotes}
                    error={errors.primaryCause}
                  />
                </div>
              )}
              <div className="flex-[2]">
                <MaterialOutputSection
                  materials={smMaterials}
                  smnotrans={smnotrans}
                />
              </div>
            </div>
          </>
        )}
      </div>

      {/* Fixed footer */}
      <div
        className="flex items-center justify-center gap-6 px-6 py-3 shrink-0 border border-white/20 backdrop-blur rounded-2xl w-[680px] mx-auto mb-3"
        style={{ backgroundColor: "rgba(64, 75, 79, 0.65)", boxShadow: "0 8px 10px rgba(0,0,0,0.5)" }}
      >
        <Button
          variant="outline"
          className={`${W_QUESTIONNAIRE.footerBtn} touch-target gap-2 text-lg text-destructive`}
          onClick={handleCancel}
          disabled={submitLoading}
        >
          <X size={20} />
          {t("actions.cancel")}
        </Button>

        <Button
          className={`${W_QUESTIONNAIRE.footerBtn} touch-target gap-2 text-lg bg-green-600 hover:bg-green-700 text-white`}
          onClick={handleSubmit}
          disabled={submitLoading}
        >
          <Check size={20} />
          {t("questionnaire.confirmQuantities")}
        </Button>
      </div>

      {/* Zero-quantity confirmation */}
      <ConfirmDialog
        open={showZeroConfirm}
        onOpenChange={(open) => !open && cancelZero()}
        title={t("dialogs.warning")}
        description={t("questionnaire.zeroQtyWarning")}
        onConfirm={confirmZero}
      />
    </div>
  );
}
