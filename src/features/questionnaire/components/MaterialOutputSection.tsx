import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useSession } from "@/context/SessionContext";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export interface MaterialRow {
  id: number;
  code: string;
  description_P: string;
  description_S: string;
  unit_P: string;
  unit_S: string;
  originalQty: number;
  correctedQty: number;
  warehouse: string;
  warehouse_P: string;
  warehouse_S: string;
  container: string;
}

interface MaterialOutputSectionProps {
  materials: MaterialRow[];
  /** BOM ratio from cNOMENCLATURE.NIQTE */
  bomRatio: number | null;
  /** Whether the operation creates finished products */
  hasFinishedProduct: boolean;
  /** Original good qty from TEMPSPROD */
  originalGoodQty: number;
  /** Original defect qty from TEMPSPROD */
  originalDefectQty: number;
  /** Current good qty entered by user */
  goodQty: number;
  /** Current defect qty entered by user */
  defectQty: number;
}

/**
 * Calculate material output quantity based on legacy logic:
 * - With finished product: (good + defect) × bomRatio
 * - Without: (good + defect) / ratio, where ratio = originalTotal / originalGoodQty
 */
function calcMaterialQty(
  originalQty: number,
  goodQty: number,
  defectQty: number,
  bomRatio: number | null,
  hasFinishedProduct: boolean,
  originalGoodQty: number,
  originalDefectQty: number,
): number {
  const totalQty = goodQty + defectQty;
  if (totalQty <= 0) return 0;

  if (hasFinishedProduct && bomRatio != null) {
    // Scenario A: totalQty × BOM ratio
    return totalQty * bomRatio;
  }

  // Scenario B: ratio-based calculation
  const originalTotal = originalGoodQty + originalDefectQty;
  let ratio = 1;
  if (originalGoodQty > 0 && originalTotal > 0 && originalQty > 0) {
    ratio = originalTotal / originalQty;
  }
  if (ratio <= 0) ratio = 1;
  return totalQty / ratio;
}

export function MaterialOutputSection({
  materials,
  bomRatio,
  hasFinishedProduct,
  originalGoodQty,
  originalDefectQty,
  goodQty,
  defectQty,
}: MaterialOutputSectionProps) {
  const { t } = useTranslation();
  const { state } = useSession();
  const lang = state.language;

  const calculatedMaterials = useMemo(() => {
    return materials.map((m) => ({
      ...m,
      calculatedQty: calcMaterialQty(
        m.originalQty,
        goodQty,
        defectQty,
        bomRatio,
        hasFinishedProduct,
        originalGoodQty,
        originalDefectQty,
      ),
    }));
  }, [materials, goodQty, defectQty, bomRatio, hasFinishedProduct, originalGoodQty, originalDefectQty]);

  return (
    <Card className="min-h-[315px]">
      <div className="border-l-4 border-gray-600 bg-gray-50 py-1.5 px-3">
        <div className="text-xs font-bold text-gray-900 uppercase tracking-wider">
          {t("questionnaire.materialOutput")}
        </div>
      </div>
      <CardContent className="px-3 pt-0.5 pb-2">
        {materials.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            {t("common.noResults")}
          </p>
        ) : (
          <Table className="text-base">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[120px] text-base">{t("material.rawMaterial")}</TableHead>
                <TableHead className="w-[250px] text-base">{t("production.description")}</TableHead>
                <TableHead className="w-[100px] text-right text-base">{t("questionnaire.qty")}</TableHead>
                <TableHead className="w-[80px] text-base">{t("material.unit")}</TableHead>
                <TableHead className="w-[120px] text-base">{t("questionnaire.warehouse")}</TableHead>
                <TableHead className="w-[120px] text-base">{t("questionnaire.skid")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {calculatedMaterials.map((row) => (
                <TableRow key={row.id} className="h-[56px]">
                  <TableCell className="text-base">{row.code}</TableCell>
                  <TableCell className="text-base">{lang === "fr" ? row.description_P : row.description_S}</TableCell>
                  <TableCell className="text-lg text-right font-bold">
                    {row.calculatedQty.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-base text-muted-foreground">
                    {lang === "fr" ? row.unit_P : row.unit_S}
                  </TableCell>
                  <TableCell className="text-base">{lang === "fr" ? row.warehouse_P : row.warehouse_S}</TableCell>
                  <TableCell className="text-base">{row.container}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
