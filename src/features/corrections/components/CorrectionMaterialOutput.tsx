import { useState } from "react";
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
import { Input } from "@/components/ui/input";
import { NumPad } from "@/components/shared/NumPad";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { CorrectionMaterial } from "@/types/corrections";

interface CorrectionMaterialOutputProps {
  materials: CorrectionMaterial[];
  smQtys: Record<number, number>;
  onQtyChange: (id: number, qty: number) => void;
  smnotrans?: string;
}

export function CorrectionMaterialOutput({
  materials,
  smQtys,
  onQtyChange,
  smnotrans,
}: CorrectionMaterialOutputProps) {
  const { t } = useTranslation();
  const { state } = useSession();
  const lang = state.language;
  const [activeNumpad, setActiveNumpad] = useState<number | null>(null);

  return (
    <Card className="min-h-[315px]">
      <div className="border-l-4 border-gray-600 bg-gray-50 py-1.5 px-6 flex items-center gap-3 min-h-[48px]">
        <div className="text-xs font-bold text-gray-900 uppercase tracking-wider">
          {t("questionnaire.materialOutput")}
        </div>
        {smnotrans && (
          <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-100/90 px-3 py-1 text-base font-bold text-blue-800">
            {smnotrans}
          </span>
        )}
      </div>
      <CardContent className="px-6 pt-0.5 pb-2">
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
                <TableHead className="w-[100px] text-base">{t("corrections.originalQty")}</TableHead>
                <TableHead className="w-[140px] text-base">{t("corrections.correctedQty")}</TableHead>
                <TableHead className="w-[80px] text-base">{t("material.unit")}</TableHead>
                <TableHead className="w-[120px] text-base">{t("questionnaire.warehouse")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {materials.map((mat) => (
                <TableRow key={mat.id} className="h-[56px]">
                  <TableCell className="text-base font-medium">{mat.code}</TableCell>
                  <TableCell className="text-base">{lang === "fr" ? mat.description_P : mat.description_S}</TableCell>
                  <TableCell className="text-lg font-bold">
                    {mat.originalQty.toFixed(2)}
                  </TableCell>
                  <TableCell>
                    <Popover
                      open={activeNumpad === mat.id}
                      onOpenChange={(open) => setActiveNumpad(open ? mat.id : null)}
                    >
                      <PopoverTrigger asChild>
                        <Input
                          value={String((smQtys[mat.id] ?? mat.correctedQty).toFixed(2))}
                          readOnly
                          className="w-[110px] touch-target !text-xl font-bold cursor-pointer text-gray-800 bg-white border-gray-500"
                          placeholder="0"
                        />
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <NumPad
                          value={String(smQtys[mat.id] ?? mat.correctedQty)}
                          onChange={(v) => onQtyChange(mat.id, Number(v) || 0)}
                          onSubmit={() => setActiveNumpad(null)}
                          onClose={() => setActiveNumpad(null)}
                          allowDecimal
                        />
                      </PopoverContent>
                    </Popover>
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
