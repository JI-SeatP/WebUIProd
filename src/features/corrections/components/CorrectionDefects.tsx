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
import { Trash2 } from "lucide-react";
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
  fmcode?: string;
  onRecalcSM?: () => void;
}

let nextTempId = 1;

export function CorrectionDefects({
  defects,
  defectQtys,
  onQtyChange,
  newDefects,
  onNewDefectsChange,
  fmcode,
  onRecalcSM,
}: CorrectionDefectsProps) {
  const { t } = useTranslation();
  const { state } = useSession();
  const lang = state.language;
  const isFr = lang === "fr";
  const [activeNumpad, setActiveNumpad] = useState<number | null>(null);
  const [newNumpad, setNewNumpad] = useState<number | null>(null);
  const [defectTypes, setDefectTypes] = useState<DefectType[]>([]);

  // New defect input row state
  const [newQty, setNewQty] = useState("");
  const [newTypeId, setNewTypeId] = useState("");
  const [numpadOpen, setNumpadOpen] = useState(false);

  useEffect(() => {
    const params = fmcode ? `?fmcode=${encodeURIComponent(fmcode)}` : "";
    apiGet<DefectType[]>(`getDefectTypes.cfm${params}`).then((res) => {
      if (res.success) setDefectTypes(res.data);
    });
  }, [fmcode]);

  const handleAdd = () => {
    if (!newQty || !newTypeId) return;
    onNewDefectsChange([...newDefects, { tempId: nextTempId++, qty: newQty, typeId: newTypeId }]);
    setNewQty("");
    setNewTypeId("");
    if (onRecalcSM) onRecalcSM();
  };

  const removeNewRow = (tempId: number) => {
    onNewDefectsChange(newDefects.filter((d) => d.tempId !== tempId));
  };

  const hasExisting = defects.length > 0;

  return (
    <Card className="min-h-[250px] bg-white">
      <div className="py-1.5 px-6">
        <div className="border border-red-400 bg-red-50 rounded-lg px-3 py-1 text-2xl font-bold text-red-900 uppercase tracking-wider w-fit">
          {t("corrections.defectQuantities")}
        </div>
      </div>
      <CardContent className="px-6 pt-0.5 pb-2">
        {/* New defect input row — matches questionnaire DefectQuantitySection */}
        <div className="flex items-center gap-2 mb-3">
          <Popover open={numpadOpen} onOpenChange={setNumpadOpen}>
            <PopoverTrigger asChild>
              <Input
                value={newQty}
                readOnly
                className="w-[100px] touch-target !text-3xl font-sans font-bold cursor-pointer text-red-600 bg-white border-red-600"
                placeholder="0"
                onClick={() => setNumpadOpen(true)}
              />
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <NumPad
                value={newQty}
                onChange={setNewQty}
                onSubmit={() => setNumpadOpen(false)}
                onClose={() => setNumpadOpen(false)}
              />
            </PopoverContent>
          </Popover>
          <Select value={newTypeId} onValueChange={setNewTypeId}>
            <SelectTrigger className="flex-1 touch-target text-base bg-white">
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
          <Button
            variant="outline"
            className="touch-target h-12 w-28 text-base font-bold border-red-600 text-red-700"
            onClick={handleAdd}
            disabled={!newQty || !newTypeId}
          >
            OK
          </Button>
        </div>

        {/* Existing defects table */}
        {hasExisting && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[80px]">{t("questionnaire.qty")}</TableHead>
                <TableHead>{t("questionnaire.defectType")}</TableHead>
                <TableHead className="w-[140px]">{t("corrections.correctedQty")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {defects.map((defect) => (
                <TableRow key={defect.id} className="h-[56px]">
                  <TableCell className="text-lg font-bold text-red-600">{defect.originalQty}</TableCell>
                  <TableCell className="text-base">
                    {isFr ? defect.type_P : defect.type_S}
                  </TableCell>
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
                          onSubmit={() => {
                            setActiveNumpad(null);
                            if (onRecalcSM) onRecalcSM();
                          }}
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

        {/* New defects (just added) */}
        {newDefects.length > 0 && (
          <Table className={hasExisting ? "mt-2" : ""}>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[80px]">{t("questionnaire.qty")}</TableHead>
                <TableHead>{t("questionnaire.defectType")}</TableHead>
                <TableHead className="w-[60px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {newDefects.map((row) => (
                <TableRow key={row.tempId} className="h-[56px]">
                  <TableCell className="text-lg font-bold text-red-600">
                    {row.qty}
                  </TableCell>
                  <TableCell className="text-base">
                    {defectTypes.find((dt) => String(dt.id) === String(row.typeId))
                      ? (isFr
                          ? defectTypes.find((dt) => String(dt.id) === String(row.typeId))!.description_P
                          : defectTypes.find((dt) => String(dt.id) === String(row.typeId))!.description_S)
                      : row.typeId}
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

        {!hasExisting && newDefects.length === 0 && (
          <p className="text-muted-foreground text-center text-sm py-4">
            {t("common.noResults")}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
