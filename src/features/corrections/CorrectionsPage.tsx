import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useCorrection } from "./hooks/useCorrection";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { CorrectionOrderInfo } from "./components/CorrectionOrderInfo";
import { CorrectionTimeInfo } from "./components/CorrectionTimeInfo";
import { CorrectionDefects } from "./components/CorrectionDefects";
import { CorrectionGoodQty } from "./components/CorrectionGoodQty";
import { CorrectionFinishedProducts } from "./components/CorrectionFinishedProducts";
import { CorrectionMaterialOutput } from "./components/CorrectionMaterialOutput";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

export function CorrectionsPage() {
  const { tjseq } = useParams<{ tjseq: string }>();
  const { t } = useTranslation();

  const {
    data,
    loading,
    submitting,
    goodQty,
    setGoodQty,
    defectQtys,
    updateDefectQty,
    fpQtys,
    updateFpQty,
    materialQtys,
    updateMaterialQty,
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
    <div className="flex flex-col h-full">
      {/* Scrollable content */}
      <div className="flex-1 overflow-auto space-y-3 p-3">
        <h1 className="text-xl font-bold">{t("corrections.title")}</h1>

        {/* Always show order + time info */}
        <CorrectionOrderInfo data={data} />
        <CorrectionTimeInfo data={data} />

        {/* Skip qty sections for SETUP */}
        {!isSetup && (
          <>
            {/* Defects */}
            <CorrectionDefects
              defects={data.defects}
              defectQtys={defectQtys}
              onQtyChange={updateDefectQty}
            />

            {/* Good qty or finished products */}
            {showFinishedProducts ? (
              <CorrectionFinishedProducts
                products={data.finishedProducts}
                fpQtys={fpQtys}
                onQtyChange={updateFpQty}
              />
            ) : (
              <CorrectionGoodQty value={goodQty} onChange={setGoodQty} />
            )}

            {/* Material output */}
            <CorrectionMaterialOutput
              materials={data.materials}
              materialQtys={materialQtys}
              onQtyChange={updateMaterialQty}
            />
          </>
        )}
      </div>

      {/* Fixed footer */}
      <div className="flex items-center justify-end px-3 py-2 border-t bg-background shrink-0">
        <Button
          className="touch-target gap-2 text-lg bg-green-600 hover:bg-green-700 text-white"
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
