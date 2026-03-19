import { useState, useEffect } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { NumPad } from "@/components/shared/NumPad";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Plus, Trash2 } from "lucide-react";
import { apiGet } from "@/api/client";
import type { CorrectionDefect, NewDefectRow } from "@/types/corrections";

interface DefectType {
  id: number;
  description_P: string;
  description_S: string;
}

interface CorrectionDefectsProps {
  defects: CorrectionDefect[];
  defectQtys: Record<number, number>;
  onQtyChange: (id: number, qty: number) => void;
  newDefects: NewDefectRow[];
  onNewDefectsChange: (rows: NewDefectRow[]) => void;
}

let nextTempId = 1;

export function CorrectionDefects({
  defects,
  defectQtys,
  onQtyChange,
  newDefects,
  onNewDefectsChange,
}: CorrectionDefectsProps) {
  const { t } = useTranslation();
  const { state } = useSession();
  const lang = state.language;
  const [activeNumpad, setActiveNumpad] = useState<number | null>(null);
  const [newNumpad, setNewNumpad] = useState<number | null>(null);
  const [defectTypes, setDefectTypes] = useState<DefectType[]>([]);

  useEffect(() => {
    apiGet<DefectType[]>("getDefectTypes.cfm").then((res) => {
      if (res.success) setDefectTypes(res.data);
    });
  }, []);

  const addRow = () => {
    onNewDefectsChange([...newDefects, { tempId: nextTempId++, qty: "", typeId: "" }]);
  };

  const removeNewRow = (tempId: number) => {
    onNewDefectsChange(newDefects.filter((d) => d.tempId !== tempId));
  };

  const updateNewRow = (tempId: number, field: keyof NewDefectRow, value: string) => {
    onNewDefectsChange(
      newDefects.map((d) => (d.tempId === tempId ? { ...d, [field]: value } : d))
    );
  };

  const hasExisting = defects.length > 0;
  const hasNew = newDefects.length > 0;

  return (
    <Card className="min-h-[250px] bg-white">
      <div className="py-1.5 px-3 flex items-center justify-between">
        <div className="border border-red-400 bg-red-50 rounded-lg px-3 py-1 text-2xl font-bold text-red-900 uppercase tracking-wider w-fit">
          {t("corrections.defectQuantities")}
        </div>
        <Button
          variant="outline"
          size="sm"
          className="touch-target gap-2 text-red-800 border-2 border-red-600 hover:text-red-900 hover:border-red-700 text-base"
          onClick={addRow}
        >
          <Plus size={18} />
          {t("questionnaire.addDefect")}
        </Button>
      </div>
      <CardContent className="px-3 pt-0.5 pb-2">
        {/* Existing defects */}
        {hasExisting && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("questionnaire.defectType")}</TableHead>
                <TableHead className="w-[120px]">{t("corrections.originalQty")}</TableHead>
                <TableHead className="w-[140px]">{t("corrections.correctedQty")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {defects.map((defect) => (
                <TableRow key={defect.id} className="h-[56px]">
                  <TableCell className="text-base">
                    {lang === "fr" ? defect.type_P : defect.type_S}
                  </TableCell>
                  <TableCell className="text-lg font-bold text-red-600">{defect.originalQty}</TableCell>
                  <TableCell>
                    <Popover
                      open={activeNumpad === defect.id}
                      onOpenChange={(open) => setActiveNumpad(open ? defect.id : null)}
                    >
                      <PopoverTrigger asChild>
                        <Input
                          value={String(defectQtys[defect.id] ?? defect.correctedQty)}
                          readOnly
                          className="w-[100px] touch-target !text-2xl font-bold cursor-pointer text-red-600 bg-white border-red-600"
                          placeholder="0"
                        />
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <NumPad
                          value={String(defectQtys[defect.id] ?? defect.correctedQty)}
                          onChange={(v) => onQtyChange(defect.id, Number(v) || 0)}
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
        )}

        {/* New defects */}
        {hasNew && (
          <Table className={hasExisting ? "mt-2" : ""}>
            {!hasExisting && (
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[120px]">{t("questionnaire.qty")}</TableHead>
                  <TableHead>{t("questionnaire.defectType")}</TableHead>
                  <TableHead className="w-[80px]" />
                </TableRow>
              </TableHeader>
            )}
            <TableBody>
              {newDefects.map((row) => (
                <TableRow key={row.tempId} className="h-[56px]">
                  <TableCell>
                    <Popover
                      open={newNumpad === row.tempId}
                      onOpenChange={(open) => setNewNumpad(open ? row.tempId : null)}
                    >
                      <PopoverTrigger asChild>
                        <Input
                          value={row.qty}
                          readOnly
                          className="w-[100px] touch-target !text-2xl font-bold cursor-pointer text-red-600 bg-white border-red-600"
                          placeholder="0"
                        />
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <NumPad
                          value={row.qty}
                          onChange={(v) => updateNewRow(row.tempId, "qty", v)}
                          onSubmit={() => setNewNumpad(null)}
                          onClose={() => setNewNumpad(null)}
                        />
                      </PopoverContent>
                    </Popover>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={row.typeId}
                      onValueChange={(v) => updateNewRow(row.tempId, "typeId", v)}
                    >
                      <SelectTrigger className="w-full touch-target text-base bg-white">
                        <SelectValue placeholder={t("questionnaire.selectDefectType")} />
                      </SelectTrigger>
                      <SelectContent>
                        {defectTypes.map((dt) => (
                          <SelectItem key={dt.id} value={String(dt.id)} className="text-base">
                            {lang === "fr" ? dt.description_P : dt.description_S}
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
                      onClick={() => removeNewRow(row.tempId)}
                    >
                      <Trash2 size={18} />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {!hasExisting && !hasNew && (
          <p className="text-muted-foreground text-center text-sm py-4">
            {t("common.noResults")}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
