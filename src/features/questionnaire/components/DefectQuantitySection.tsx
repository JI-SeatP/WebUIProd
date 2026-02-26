import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { W_DEFECT_TABLE } from "@/constants/widths";

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
}

let nextId = 1;

export function DefectQuantitySection({
  language,
  defects,
  onDefectsChange,
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

  return (
    <Card>
      <CardHeader className="py-3 px-4 flex flex-row items-center justify-between">
        <CardTitle className="text-base">{t("questionnaire.defectQuantity")}</CardTitle>
        <Button
          variant="outline"
          size="sm"
          className="touch-target gap-2 text-base"
          onClick={addRow}
        >
          <Plus size={18} />
          {t("questionnaire.addDefect")}
        </Button>
      </CardHeader>
      <CardContent className="px-4 pb-3">
        {defects.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            {t("common.noResults")}
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className={W_DEFECT_TABLE.qty}>{t("questionnaire.qty")}</TableHead>
                <TableHead className={W_DEFECT_TABLE.type}>{t("questionnaire.defectType")}</TableHead>
                <TableHead className={W_DEFECT_TABLE.notes}>{t("questionnaire.notes")}</TableHead>
                <TableHead className={W_DEFECT_TABLE.actions} />
              </TableRow>
            </TableHeader>
            <TableBody>
              {defects.map((row) => (
                <TableRow key={row.id} className="h-[56px]">
                  <TableCell className={W_DEFECT_TABLE.qty}>
                    <Popover
                      open={activeNumpad === row.id}
                      onOpenChange={(open) => setActiveNumpad(open ? row.id : null)}
                    >
                      <PopoverTrigger asChild>
                        <Input
                          value={row.qty}
                          readOnly
                          className="touch-target text-lg font-mono cursor-pointer"
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
                  <TableCell className={W_DEFECT_TABLE.type}>
                    <Select
                      value={row.typeId}
                      onValueChange={(v) => updateRow(row.id, "typeId", v)}
                    >
                      <SelectTrigger className="touch-target text-base">
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
                  <TableCell className={W_DEFECT_TABLE.notes}>
                    <Input
                      value={row.notes}
                      onChange={(e) => updateRow(row.id, "notes", e.target.value)}
                      className="touch-target text-base"
                      placeholder={t("questionnaire.notes")}
                    />
                  </TableCell>
                  <TableCell className={W_DEFECT_TABLE.actions}>
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
