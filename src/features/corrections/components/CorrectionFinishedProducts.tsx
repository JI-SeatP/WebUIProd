import { useTranslation } from "react-i18next";
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
import type { CorrectionFinishedProduct } from "@/types/corrections";

interface CorrectionFinishedProductsProps {
  products: CorrectionFinishedProduct[];
  fpQtys: Record<number, number>;
  onQtyChange: (id: number, qty: number) => void;
}

export function CorrectionFinishedProducts({
  products,
  fpQtys,
  onQtyChange,
}: CorrectionFinishedProductsProps) {
  const { t } = useTranslation();

  if (products.length === 0) return null;

  return (
    <Card>
      <CardHeader className="py-3 px-4">
        <CardTitle className="text-base">{t("corrections.finishedProducts")}</CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-3">
        <div className="border rounded-md overflow-auto">
          <Table>
            <TableHeader>
              <TableRow className="h-[56px]">
                <TableHead>{t("order.product")}</TableHead>
                <TableHead>{t("questionnaire.container")}</TableHead>
                <TableHead className={W_CORRECTIONS.qtyField}>{t("corrections.originalQty")}</TableHead>
                <TableHead className={W_CORRECTIONS.qtyField}>{t("corrections.correctedQty")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((fp) => (
                <TableRow key={fp.id} className="h-[56px]">
                  <TableCell>{fp.product}</TableCell>
                  <TableCell>{fp.container}</TableCell>
                  <TableCell className="font-mono">{fp.originalQty}</TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min={0}
                      value={fpQtys[fp.id] ?? fp.correctedQty}
                      onChange={(e) => onQtyChange(fp.id, Number(e.target.value))}
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
