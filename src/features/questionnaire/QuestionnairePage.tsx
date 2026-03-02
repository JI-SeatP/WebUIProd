import { useState, useCallback } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useSession } from "@/context/SessionContext";
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
import type { Employee } from "@/types/employee";
import type { FinishedProductRow } from "./components/FinishedProductsSection";
import type { MaterialRow } from "./components/MaterialOutputSection";

interface DefectRow {
  id: number;
  qty: string;
  typeId: string;
  notes: string;
}

export function QuestionnairePage() {
  const { transac, type } = useParams<{ transac: string; type: string }>();
  const [searchParams] = useSearchParams();
  const { state } = useSession();
  const { t } = useTranslation();
  // Get copmachine from URL query param (passed from status action) or fall back to session state
  const copmachine =
    searchParams.get("copmachine") ??
    state.activeOperation?.COPMACHINE?.toString() ??
    "0";
  const { operation, loading: opLoading } = useOperation(transac!, copmachine);

  const isStop = type === "stop";
  const isComp = type === "comp";

  // Form state
  const [employeeCode, setEmployeeCode] = useState(
    state.employee?.EMNOIDENT?.toString() ?? ""
  );
  const [employeeName, setEmployeeName] = useState(state.employee?.EMNOM ?? "");
  const [moldAction, setMoldAction] = useState("keep");
  const [primaryCause, setPrimaryCause] = useState("");
  const [secondaryCause, setSecondaryCause] = useState("");
  const [notes, setNotes] = useState("");
  const [goodQty, setGoodQty] = useState("");
  const [defects, setDefects] = useState<DefectRow[]>([]);
  const [finishedProducts, setFinishedProducts] = useState<FinishedProductRow[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Mock materials — in production these would come from the operation data
  const [materials] = useState<MaterialRow[]>([]);

  const {
    loading: submitLoading,
    showZeroConfirm,
    submit,
    confirmZero,
    cancelZero,
    cancel,
  } = useQuestionnaireSubmit();

  const handleEmployeeFound = useCallback((employee: Employee) => {
    setEmployeeName(employee.EMNOM);
    setEmployeeCode(String(employee.EMNOIDENT));
  }, []);

  const handleSubmit = useCallback(() => {
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
      defects: defects.map((d) => ({ qty: d.qty, typeId: d.typeId, notes: d.notes })),
      finishedProducts:
        showFinishedProducts
          ? finishedProducts.map((p) => ({
              product: p.product,
              qty: p.qty,
              container: p.container,
            }))
          : undefined,
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
    employeeCode,
    primaryCause,
    secondaryCause,
    notes,
    moldAction,
    goodQty,
    defects,
    finishedProducts,
  ]);

  const handleCancel = useCallback(() => {
    cancel(Number(transac), Number(copmachine));
  }, [cancel, transac, copmachine]);

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
    <div className="flex flex-col h-full">
      {/* Scrollable content */}
      <div className="flex-1 overflow-auto space-y-2 px-3 pb-3 pt-0">
        {/* Order info */}
        <OrderInfoBlock
          operation={operation}
          language={state.language}
          label={isStop ? t("questionnaire.stopSurvey") : t("questionnaire.completionSurvey")}
        />

        {/* Mold action (PRESS/CNC on COMP only) */}
        {showMoldAction && (
          <MoldActionSection value={moldAction} onChange={setMoldAction} />
        )}

        {/* Employee + Stop cause side by side */}
        <div className="flex gap-4 items-start">
          <div className={isStop ? "w-1/3" : "w-full"}>
            <EmployeeEntry
              employeeCode={employeeCode}
              employeeName={employeeName}
              onCodeChange={setEmployeeCode}
              onEmployeeFound={handleEmployeeFound}
              error={errors.employeeCode}
            />
          </div>
          {isStop && (
            <div className="w-2/3">
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
        </div>

        {/* Finished/Good products + Defect quantities + Material output — side by side */}
        <div className="flex gap-4 items-start">
          <div className="flex-1">
            {showFinishedProducts ? (
              <FinishedProductsSection
                products={finishedProducts}
                onProductsChange={setFinishedProducts}
              />
            ) : (
              <GoodQuantitySection value={goodQty} onChange={setGoodQty} />
            )}
          </div>

          {showDefects && (
            <div className="flex-1">
              <DefectQuantitySection
                language={state.language}
                defects={defects}
                onDefectsChange={setDefects}
              />
            </div>
          )}

          <div className="flex-1">
            <MaterialOutputSection materials={materials} />
          </div>
        </div>
      </div>

      {/* Fixed footer */}
      <div className="flex items-center justify-between px-3 py-2 border-t bg-background shrink-0">
        <Button
          variant="outline"
          className="touch-target gap-2 text-lg text-destructive"
          onClick={handleCancel}
          disabled={submitLoading}
        >
          <X size={20} />
          {t("actions.cancel")}
        </Button>

        <Button
          className="touch-target gap-2 text-lg bg-green-600 hover:bg-green-700 text-white"
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
