import { useTranslation } from "react-i18next";
import { useSession } from "@/context/SessionContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { W_CORRECTIONS } from "@/constants/widths";
import type { CorrectionMaterial } from "@/types/corrections";

interface CorrectionMaterialOutputProps {
  materials: CorrectionMaterial[];
  materialQtys: Record<number, number>;
  onQtyChange: (id: number, qty: number) => void;
}

export function CorrectionMaterialOutput({
  materials,
  materialQtys,
  onQtyChange,
}: CorrectionMaterialOutputProps) {
  const { t } = useTranslation();
  const { state } = useSession();
  const lang = state.language;

  if (materials.length === 0) return null;

  return (
    <Card>
      <CardHeader className="py-3 px-4">
        <CardTitle className="text-base">{t("corrections.materialOutput")}</CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-3">
        <div className="border rounded-md overflow-auto">
          <Table>
            <TableHeader>
              <TableRow className="h-[56px]">
                <TableHead>{t("material.rawMaterial")}</TableHead>
                <TableHead>{t("production.description")}</TableHead>
                <TableHead className={W_CORRECTIONS.qtyField}>{t("corrections.originalQty")}</TableHead>
                <TableHead className={W_CORRECTIONS.qtyField}>{t("corrections.correctedQty")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {materials.map((mat) => (
                <TableRow key={mat.id} className="h-[56px]">
                  <TableCell>{mat.code}</TableCell>
                  <TableCell>{lang === "fr" ? mat.description_P : mat.description_S}</TableCell>
                  <TableCell className="font-mono">{mat.originalQty}</TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min={0}
                      value={materialQtys[mat.id] ?? mat.correctedQty}
                      onChange={(e) => onQtyChange(mat.id, Number(e.target.value))}
                      className={`${W_CORRECTIONS.qtyField} touch-target font-mono`}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
