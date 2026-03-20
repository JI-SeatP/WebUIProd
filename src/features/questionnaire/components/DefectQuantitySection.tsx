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
import { Trash2 } from "lucide-react";
import { apiGet } from "@/api/client";

interface DefectType {
  id: number;
  description_P: string;
  description_S: string;
}

export interface SavedDefect {
  DDSEQ: number;
  qty: number;
  typeId: number;
  notes: string;
  type_P: string;
  type_S: string;
}

interface DefectQuantitySectionProps {
  language: string;
  fmcode?: string;
  onAddDefect?: (qty: string, typeId: string, notes: string) => Promise<void>;
  onRemoveDefect?: (ddseq: number) => Promise<void>;
  savedDefects?: SavedDefect[];
  loading?: boolean;
  theme?: "modern" | "minimal" | "dense";
}

export function DefectQuantitySection({
  language,
  fmcode = "",
  onAddDefect,
  onRemoveDefect,
  savedDefects = [],
  loading = false,
  theme = "modern",
}: DefectQuantitySectionProps) {
  const { t } = useTranslation();
  const isFr = language === "fr";

  const [defectTypes, setDefectTypes] = useState<DefectType[]>([]);
  const [numpadOpen, setNumpadOpen] = useState(false);

  // New defect input row state
  const [newQty, setNewQty] = useState("");
  const [newTypeId, setNewTypeId] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    apiGet<DefectType[]>(`getDefectTypes.cfm?fmcode=${encodeURIComponent(fmcode)}`).then((res) => {
      if (res.success) setDefectTypes(res.data);
    });
  }, [fmcode]);

  const handleAdd = useCallback(async () => {
    if (!newQty || !newTypeId || !onAddDefect) return;
    setAdding(true);
    try {
      await onAddDefect(newQty, newTypeId, newNotes);
      // Reset input row after successful add
      setNewQty("");
      setNewTypeId("");
      setNewNotes("");
    } finally {
      setAdding(false);
    }
  }, [newQty, newTypeId, newNotes, onAddDefect]);

  const handleRemove = useCallback(
    async (ddseq: number) => {
      if (!onRemoveDefect) return;
      await onRemoveDefect(ddseq);
    },
    [onRemoveDefect]
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
      </div>
      <CardContent className={contentClasses}>
        {/* New defect input row */}
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
            className="touch-target h-12 w-14 text-base font-bold border-red-600 text-red-700"
            onClick={handleAdd}
            disabled={adding || loading || !newQty || !newTypeId}
          >
            OK
          </Button>
        </div>

        {/* Saved defects table */}
        {savedDefects.length === 0 ? (
          <p className={`text-muted-foreground text-center ${theme === "dense" ? "text-xs py-2" : "text-sm py-4"}`}>
            {t("common.noResults")}
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[80px]">{t("questionnaire.qty")}</TableHead>
                <TableHead>{t("questionnaire.defectType")}</TableHead>
                <TableHead className="w-[60px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {savedDefects.map((row) => (
                <TableRow key={row.DDSEQ} className="h-[56px]">
                  <TableCell className="text-lg font-bold text-red-600">
                    {row.qty}
                  </TableCell>
                  <TableCell className="text-base">
                    {isFr ? row.type_P : row.type_S}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="touch-target text-destructive"
                      onClick={() => handleRemove(row.DDSEQ)}
                      disabled={loading}
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
