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
import type { CorrectionDefect } from "@/types/corrections";

interface CorrectionDefectsProps {
  defects: CorrectionDefect[];
  defectQtys: Record<number, number>;
  onQtyChange: (id: number, qty: number) => void;
}

export function CorrectionDefects({ defects, defectQtys, onQtyChange }: CorrectionDefectsProps) {
  const { t } = useTranslation();
  const { state } = useSession();
  const lang = state.language;

  if (defects.length === 0) return null;

  return (
    <Card>
      <CardHeader className="py-3 px-4">
        <CardTitle className="text-base">{t("corrections.defectQuantities")}</CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-3">
        <div className="border rounded-md overflow-auto">
          <Table>
            <TableHeader>
              <TableRow className="h-[56px]">
                <TableHead>{t("questionnaire.defectType")}</TableHead>
                <TableHead className={W_CORRECTIONS.qtyField}>{t("corrections.originalQty")}</TableHead>
                <TableHead className={W_CORRECTIONS.qtyField}>{t("corrections.correctedQty")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {defects.map((defect) => (
                <TableRow key={defect.id} className="h-[56px]">
                  <TableCell>{lang === "fr" ? defect.type_P : defect.type_S}</TableCell>
                  <TableCell className="font-mono">{defect.originalQty}</TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min={0}
                      value={defectQtys[defect.id] ?? defect.correctedQty}
                      onChange={(e) => onQtyChange(defect.id, Number(e.target.value))}
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
