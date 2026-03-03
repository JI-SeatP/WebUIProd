import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NumPad } from "@/components/shared/NumPad";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Trash2 } from "lucide-react";
import { apiGet } from "@/api/client";

interface DefectRow {
  id: number;
  qty: string;
  typeId: string;
  notes: string;
}

interface DefectType {
  id: number;
  description_P: string;
  description_S: string;
}

interface DefectQuantitySectionProps {
  language: string;
  defects: DefectRow[];
  onDefectsChange: (defects: DefectRow[]) => void;
  theme?: "modern" | "minimal" | "dense";
}

let nextId = 1;

export function DefectQuantitySection({
  language,
  defects,
  onDefectsChange,
  theme = "modern",
}: DefectQuantitySectionProps) {
  const { t } = useTranslation();
  const isFr = language === "fr";

  const [defectTypes, setDefectTypes] = useState<DefectType[]>([]);
  const [activeNumpad, setActiveNumpad] = useState<number | null>(null);

  useEffect(() => {
    apiGet<DefectType[]>("getDefectTypes.cfm").then((res) => {
      if (res.success) setDefectTypes(res.data);
    });
  }, []);

  const addRow = useCallback(() => {
    onDefectsChange([...defects, { id: nextId++, qty: "", typeId: "", notes: "" }]);
  }, [defects, onDefectsChange]);

  const removeRow = useCallback(
    (id: number) => {
      onDefectsChange(defects.filter((d) => d.id !== id));
    },
    [defects, onDefectsChange]
  );

  const updateRow = useCallback(
    (id: number, field: keyof DefectRow, value: string) => {
      onDefectsChange(
        defects.map((d) => (d.id === id ? { ...d, [field]: value } : d))
      );
    },
    [defects, onDefectsChange]
  );

  const headerClasses = {
    modern: "py-1.5 px-3 flex flex-row items-center justify-between",
    minimal: "py-2.5 px-4 flex flex-row items-center justify-between",
    dense: "py-1 px-3 border-b border-red-200 flex flex-row items-center justify-between",
  }[theme];

  const headerTextClasses = {
    modern: "border border-red-400 bg-red-50 rounded-lg px-3 py-1 text-2xl font-bold text-red-900 uppercase tracking-wider",
    minimal: "text-sm font-semibold text-red-900",
    dense: "text-xs font-bold text-red-900 uppercase",
  }[theme];

  const contentClasses = {
    modern: "px-3 pt-0.5 pb-2",
    minimal: "px-4 pt-0.5 pb-3",
    dense: "px-3 pt-px pb-1.5",
  }[theme];

  return (
    <Card className={`min-h-[250px] bg-white ${theme === "dense" ? "border border-gray-200" : ""}`}>
      <div className={headerClasses}>
        <div className={headerTextClasses}>{t("questionnaire.defectQuantity")}</div>
        <Button
          variant="outline"
          size="sm"
          className={`touch-target gap-2 text-red-800 border-2 border-red-600 hover:text-red-900 hover:border-red-700 ${theme === "dense" ? "text-xs h-8" : "text-base"}`}
          onClick={addRow}
        >
          <Plus size={theme === "dense" ? 14 : 18} />
          {t("questionnaire.addDefect")}
        </Button>
      </div>
      <CardContent className={contentClasses}>
        {defects.length === 0 ? (
          <p className={`text-muted-foreground text-center ${theme === "dense" ? "text-xs py-2" : "text-sm py-4"}`}>
            {t("common.noResults")}
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[120px]">{t("questionnaire.qty")}</TableHead>
                <TableHead>{t("questionnaire.defectType")}</TableHead>
                <TableHead className="w-[80px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {defects.map((row) => (
                <TableRow key={row.id} className="h-[56px]">
                  <TableCell>
                    <Popover
                      open={activeNumpad === row.id}
                      onOpenChange={(open) => setActiveNumpad(open ? row.id : null)}
                    >
                      <PopoverTrigger asChild>
                        <Input
                          value={row.qty}
                          readOnly
                          className="touch-target !text-3xl font-mono font-bold cursor-pointer text-red-600 bg-white border-red-600"
                          placeholder="0"
                        />
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <NumPad
                          value={row.qty}
                          onChange={(v) => updateRow(row.id, "qty", v)}
                          onSubmit={() => setActiveNumpad(null)}
                          onClose={() => setActiveNumpad(null)}
                        />
                      </PopoverContent>
                    </Popover>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={row.typeId}
                      onValueChange={(v) => updateRow(row.id, "typeId", v)}
                    >
                      <SelectTrigger className="w-full touch-target text-base bg-white">
                        <SelectValue placeholder={t("questionnaire.selectDefectType")} />
                      </SelectTrigger>
                      <SelectContent>
                        {defectTypes.map((dt) => (
                          <SelectItem key={dt.id} value={String(dt.id)} className="text-base">
                            {isFr ? dt.description_P : dt.description_S}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="touch-target text-destructive"
                      onClick={() => removeRow(row.id)}
                    >
                      <Trash2 size={18} />
                    </Button>
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
