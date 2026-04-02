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

export interface MaterialRow {
  id: number;
  code: string;
  description_P: string;
  description_S: string;
  unit_P: string;
  unit_S: string;
  originalQty: number;
  correctedQty: number;
  warehouse: string;
  warehouse_P: string;
  warehouse_S: string;
  container: string;
  /** Integer CON_SEQ — used as dropdown value */
  conSeq?: number;
  /** Per-material BOM ratio (NIQTE) — kept for type compatibility */
  bomRatio?: number;
}

export interface ContainerOption {
  conSeq: number;
  conNumero: string;
}

interface MaterialOutputSectionProps {
  materials: MaterialRow[];
  /** SM transaction number to display */
  smnotrans?: string;
  /** Available container/SKID options for dropdown (from VSP_BonTravail_VeneerReserve or DET_TRANS) */
  containerOptions?: ContainerOption[];
  /** Called when user selects a different container from the dropdown */
  onContainerChange?: (dtrseq: number, conSeq: number) => void;
}

export function MaterialOutputSection({
  materials,
  smnotrans,
  containerOptions,
  onContainerChange,
}: MaterialOutputSectionProps) {
  const { t } = useTranslation();
  const { state } = useSession();
  const lang = state.language;

  const hasDropdown = containerOptions && containerOptions.length > 0 && onContainerChange;

  return (
    <Card className="min-h-[315px]">
      <div className="border-l-4 border-gray-600 bg-gray-50 py-1.5 px-3 flex items-center gap-3 min-h-[48px]">
        <div className="text-xs font-bold text-gray-900 uppercase tracking-wider">
          {t("questionnaire.materialOutput")}
        </div>
        {smnotrans && (
          <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-100/90 px-3 py-1 text-base font-bold text-blue-800">
            {smnotrans}
          </span>
        )}
      </div>
      <CardContent className="px-3 pt-0.5 pb-2">
        {materials.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            {t("questionnaire.materialOutputHint")}
          </p>
        ) : (
          <Table className="text-base">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[120px] text-base">{t("material.rawMaterial")}</TableHead>
                <TableHead className="w-[250px] text-base">{t("production.description")}</TableHead>
                <TableHead className="w-[100px] text-right text-base">{t("questionnaire.qty")}</TableHead>
                <TableHead className="w-[80px] text-base">{t("material.unit")}</TableHead>
                <TableHead className="w-[120px] text-base">{t("questionnaire.warehouse")}</TableHead>
                <TableHead className="w-[160px] text-base">{t("questionnaire.skid")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {materials.map((row) => (
                <TableRow key={row.id} className="h-[56px]">
                  <TableCell className="text-base">{row.code}</TableCell>
                  <TableCell className="text-base">{lang === "fr" ? row.description_P : row.description_S}</TableCell>
                  <TableCell className="text-lg text-right font-bold">
                    {row.originalQty.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-base text-muted-foreground">
                    {lang === "fr" ? row.unit_P : row.unit_S}
                  </TableCell>
                  <TableCell className="text-base">{lang === "fr" ? row.warehouse_P : row.warehouse_S}</TableCell>
                  <TableCell className="text-base p-1">
                    {hasDropdown ? (
                      <Select
                        value={String(row.conSeq || "")}
                        onValueChange={(val) => onContainerChange(row.id, Number(val))}
                      >
                        <SelectTrigger className="!h-12 text-base w-full">
                          <SelectValue placeholder="—" />
                        </SelectTrigger>
                        <SelectContent>
                          {containerOptions.map((opt) => (
                            <SelectItem
                              key={opt.conSeq}
                              value={String(opt.conSeq)}
                              className="text-base min-h-[48px]"
                            >
                              {opt.conNumero}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      row.container
                    )}
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
