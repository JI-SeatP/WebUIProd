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
import type { CorrectionMaterial } from "@/types/corrections";

interface CorrectionMaterialOutputProps {
  materials: CorrectionMaterial[];
}

export function CorrectionMaterialOutput({
  materials,
}: CorrectionMaterialOutputProps) {
  const { t } = useTranslation();
  const { state } = useSession();
  const lang = state.language;

  return (
    <Card className="bg-white">
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
            </TableRow>
          </TableHeader>
          <TableBody>
            {materials.map((mat) => (
              <TableRow key={mat.id} className="h-[56px]">
                <TableCell className="text-base font-medium">{mat.code}</TableCell>
                <TableCell className="text-base">{lang === "fr" ? mat.description_P : mat.description_S}</TableCell>
                <TableCell className="text-lg text-right font-bold">
                  {(mat.correctedQty || mat.originalQty || 0).toFixed(2)}
                </TableCell>
                <TableCell className="text-base text-muted-foreground">
                  {lang === "fr" ? mat.unit_P : mat.unit_S}
                </TableCell>
                <TableCell className="text-base">
                  {lang === "fr" ? mat.warehouse_P : mat.warehouse_S}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        )}
      </CardContent>
    </Card>
  );
}
