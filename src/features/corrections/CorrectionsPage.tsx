import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useCorrection } from "./hooks/useCorrection";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { CorrectionOrderInfo } from "./components/CorrectionOrderInfo";
import { CorrectionDefects } from "./components/CorrectionDefects";
import { CorrectionGoodQty } from "./components/CorrectionGoodQty";
import { CorrectionFinishedProducts } from "./components/CorrectionFinishedProducts";
import { CorrectionMaterialOutput } from "./components/CorrectionMaterialOutput";
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
  const showFinishedProducts = data.ENTREPF === 1;

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Scrollable content */}
      <div className="flex-1 overflow-auto space-y-2 px-3 pb-3 pt-0">
        {/* Order + time info (combined, matching questionnaire style) */}
        <CorrectionOrderInfo data={data} />

        {/* Skip qty sections for SETUP */}
        {!isSetup && (
          <>
            {/* Row 1: Good qty / Finished products | Defects */}
            <div className="flex gap-4 items-start">
              <div className="flex-1">
                {showFinishedProducts ? (
                  <CorrectionFinishedProducts
                    products={data.finishedProducts}
                    fpQtys={fpQtys}
                    onQtyChange={updateFpQty}
                  />
                ) : (
                  <CorrectionGoodQty value={goodQty} onChange={setGoodQty} />
                )}
              </div>
              <div className="flex-1">
                <CorrectionDefects
                  defects={data.defects}
                  defectQtys={defectQtys}
                  onQtyChange={updateDefectQty}
                  newDefects={newDefects}
                  onNewDefectsChange={setNewDefects}
                />
              </div>
            </div>

            {/* Row 2: Material output (read-only display) */}
            <CorrectionMaterialOutput materials={data.materials} />
          </>
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
          OK
        </Button>
      </div>
    </div>
  );
}
