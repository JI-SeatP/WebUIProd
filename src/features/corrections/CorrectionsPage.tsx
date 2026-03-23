import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useCorrection } from "./hooks/useCorrection";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { CorrectionOrderInfo } from "./components/CorrectionOrderInfo";
import { CorrectionDefects } from "./components/CorrectionDefects";
import { CorrectionGoodQty } from "./components/CorrectionGoodQty";
import { CorrectionFinishedProducts } from "./components/CorrectionFinishedProducts";
import { CorrectionMaterialOutput } from "./components/CorrectionMaterialOutput";
import { CorrectionProductionTime } from "./components/CorrectionProductionTime";
import { Button } from "@/components/ui/button";
import { X, Check } from "lucide-react";
import { W_QUESTIONNAIRE } from "@/constants/widths";

export function CorrectionsPage() {
  const { tjseq } = useParams<{ tjseq: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const {
    data,
    loading,
    submitting,
    goodQty,
    setGoodQty,
    defectQtys,
    updateDefectQty,
    newDefects,
    setNewDefects,
    fpQtys,
    updateFpQty,
    smQtys,
    updateSmQty,
    recalcSM,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    operation,
    setOperation,
    machine,
    setMachine,
    employeeCode,
    setEmployeeCode,
    handleSubmit,
  } = useCorrection(Number(tjseq));

  if (loading) {
    return <LoadingSpinner className="flex-1" />;
  }

  if (!data) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-lg text-destructive">Correction not found</p>
      </div>
    );
  }

  const isSetup = data.MODEPROD_MPCODE === "SETUP";
  // Match old logic: show finished products only if ENTREPF=1 AND records exist
  const showFinishedProducts = data.ENTREPF === 1 && data.finishedProducts.length > 0;

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Scrollable content */}
      <div className="flex-1 overflow-auto space-y-2 px-3 pb-3 pt-0">
        {/* Order info (read-only display) */}
        <CorrectionOrderInfo data={data} />

        {/* Row: Production time (40%) | Good qty (30%) | Defects (30%) */}
        <div className="flex gap-4 items-start">
          <CorrectionProductionTime
            data={data}
            startDate={startDate}
            endDate={endDate}
            operation={operation}
            machine={machine}
            employeeCode={employeeCode}
            onStartDateChange={setStartDate}
            onEndDateChange={setEndDate}
            onOperationChange={setOperation}
            onMachineChange={setMachine}
            onEmployeeCodeChange={setEmployeeCode}
          />

          {/* Skip qty sections for SETUP */}
          {!isSetup && (
            <>
              <div className="w-[30%]">
                {showFinishedProducts ? (
                  <CorrectionFinishedProducts
                    products={data.finishedProducts}
                    fpQtys={fpQtys}
                    onQtyChange={updateFpQty}
                  />
                ) : (
                  <CorrectionGoodQty value={goodQty} onChange={setGoodQty} onOk={recalcSM} />
                )}
              </div>
              <div className="w-[30%]">
                <CorrectionDefects
                  defects={data.defects}
                  defectQtys={defectQtys}
                  onQtyChange={updateDefectQty}
                  newDefects={newDefects}
                  onNewDefectsChange={setNewDefects}
                  fmcode={data.FMCODE}
                  onRecalcSM={recalcSM}
                />
              </div>
            </>
          )}
        </div>

        {/* Material output (editable) — only when not SETUP */}
        {!isSetup && (
          <CorrectionMaterialOutput
            materials={data.materials}
            smQtys={smQtys}
            onQtyChange={updateSmQty}
            smnotrans={data.SMNOTRANS}
          />
        )}
      </div>

      {/* Fixed footer — glassmorphism bar matching questionnaire */}
      <div
        className="flex items-center justify-center gap-6 px-6 py-3 shrink-0 border border-white/20 backdrop-blur rounded-2xl w-[680px] mx-auto mb-3"
        style={{ backgroundColor: "rgba(64, 75, 79, 0.65)", boxShadow: "0 8px 10px rgba(0,0,0,0.5)" }}
      >
        <Button
          variant="outline"
          className={`${W_QUESTIONNAIRE.footerBtn} touch-target gap-2 text-lg text-destructive`}
          onClick={() => navigate(-1)}
          disabled={submitting}
        >
          <X size={20} />
          {t("actions.cancel")}
        </Button>

        <Button
          className={`${W_QUESTIONNAIRE.footerBtn} touch-target gap-2 text-lg bg-green-600 hover:bg-green-700 text-white`}
          onClick={handleSubmit}
          disabled={submitting}
        >
          <Check size={20} />
          {t("actions.confirm")}
        </Button>
      </div>
    </div>
  );
}
