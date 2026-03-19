import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { NumPad } from "@/components/shared/NumPad";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
  const [activeNumpad, setActiveNumpad] = useState<number | null>(null);

  if (products.length === 0) return null;

  return (
    <Card className="min-h-[250px] bg-white">
      <div className="py-1.5 px-3">
        <div className="border border-green-500 bg-green-50 rounded-lg px-3 py-1 text-2xl font-bold text-green-900 uppercase tracking-wider w-fit">
          {t("corrections.finishedProducts")}
        </div>
      </div>
      <CardContent className="px-3 pt-0.5 pb-2">
        <Table>
          <TableHeader>
            <TableRow className="h-[56px]">
              <TableHead>{t("order.product")}</TableHead>
              <TableHead>{t("questionnaire.container")}</TableHead>
              <TableHead className="w-[120px]">{t("corrections.originalQty")}</TableHead>
              <TableHead className="w-[140px]">{t("corrections.correctedQty")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((fp) => (
              <TableRow key={fp.id} className="h-[56px]">
                <TableCell className="text-base font-medium">{fp.product}</TableCell>
                <TableCell className="text-base">{fp.container}</TableCell>
                <TableCell className="text-lg font-bold">{fp.originalQty}</TableCell>
                <TableCell>
                  <Popover
                    open={activeNumpad === fp.id}
                    onOpenChange={(open) => setActiveNumpad(open ? fp.id : null)}
                  >
                    <PopoverTrigger asChild>
                      <Input
                        value={String(fpQtys[fp.id] ?? fp.correctedQty)}
                        readOnly
                        className="w-[100px] touch-target !text-2xl font-bold cursor-pointer text-green-700 bg-white border-green-600"
                        placeholder="0"
                      />
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <NumPad
                        value={String(fpQtys[fp.id] ?? fp.correctedQty)}
                        onChange={(v) => onQtyChange(fp.id, Number(v) || 0)}
                        onSubmit={() => setActiveNumpad(null)}
                        onClose={() => setActiveNumpad(null)}
                      />
                    </PopoverContent>
                  </Popover>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
