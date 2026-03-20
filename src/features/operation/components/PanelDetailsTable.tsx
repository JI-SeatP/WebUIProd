import { useTranslation } from "react-i18next";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { W_PANEL_DETAILS } from "@/constants/widths";
import { Image } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface PanelDetail {
  ITEM: string;
  ITEM_SEQ?: number;
  PANNEAU: string;
  PANNEAU_SEQ?: number;
  DESCRIPTION: string;
  VER: number | string;
  TYPE: string;
  THICKNESS?: number | string | null;
  POIDS: number | string;
}

interface PanelDetailsTableProps {
  detail: PanelDetail;
  onViewDrawing?: (inventaireSeq: number) => void;
  activeDrawingSeq?: number | null;
}

export function PanelDetailsTable({ detail, onViewDrawing, activeDrawingSeq }: PanelDetailsTableProps) {
  const { t } = useTranslation();

  return (
    <Card className="py-0 gap-0">
      <CardContent className="px-4 pt-3 pb-3">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className={W_PANEL_DETAILS.item}>{t("panel.item")}</TableHead>
              <TableHead className={W_PANEL_DETAILS.panneau}>{t("panel.panneau")}</TableHead>
              <TableHead className={W_PANEL_DETAILS.description}>{t("panel.description")}</TableHead>
              <TableHead className={cn(W_PANEL_DETAILS.version, "text-right")}>{t("panel.version")}</TableHead>
              <TableHead className={W_PANEL_DETAILS.type}>{t("panel.type")}</TableHead>
              <TableHead className={cn(W_PANEL_DETAILS.thickness, "text-right")}>{t("panel.thickness")}</TableHead>
              <TableHead className={cn(W_PANEL_DETAILS.weight, "text-right")}>{t("panel.weight")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow className="h-10">
              <TableCell className={cn(W_PANEL_DETAILS.item, "text-base")}>
                <span className="flex items-center gap-1">
                  {detail.ITEM}
                  {detail.ITEM_SEQ && onViewDrawing && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-[42px]"
                      onClick={() => onViewDrawing(detail.ITEM_SEQ!)}
                    >
                      <div
                        className="flex items-center justify-center rounded-md size-[32px]"
                        style={{ backgroundColor: activeDrawingSeq === detail.ITEM_SEQ ? "#aeffae" : "transparent" }}
                      >
                        <Image
                          className="size-[25px]"
                          fill={activeDrawingSeq === detail.ITEM_SEQ ? "#aeffae" : "none"}
                        />
                      </div>
                    </Button>
                  )}
                </span>
              </TableCell>
              <TableCell className={cn(W_PANEL_DETAILS.panneau, "text-base font-semibold")}>
                <span className="flex items-center gap-1">
                  {detail.PANNEAU}
                  {detail.PANNEAU_SEQ && onViewDrawing && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-[42px]"
                      onClick={() => onViewDrawing(detail.PANNEAU_SEQ!)}
                    >
                      <div
                        className="flex items-center justify-center rounded-md size-[32px]"
                        style={{ backgroundColor: activeDrawingSeq === detail.PANNEAU_SEQ ? "#aeffae" : "transparent" }}
                      >
                        <Image
                          className="size-[25px]"
                          fill={activeDrawingSeq === detail.PANNEAU_SEQ ? "#aeffae" : "none"}
                        />
                      </div>
                    </Button>
                  )}
                </span>
              </TableCell>
              <TableCell className={cn(W_PANEL_DETAILS.description, "text-base")}>{detail.DESCRIPTION}</TableCell>
              <TableCell className={cn(W_PANEL_DETAILS.version, "text-right tabular-nums text-base")}>{detail.VER}</TableCell>
              <TableCell className={cn(W_PANEL_DETAILS.type, "text-base")}>{detail.TYPE}</TableCell>
              <TableCell className={cn(W_PANEL_DETAILS.thickness, "text-right tabular-nums text-base")}>
                {detail.THICKNESS != null && detail.THICKNESS !== "" ? detail.THICKNESS : "—"}
              </TableCell>
              <TableCell className={cn(W_PANEL_DETAILS.weight, "text-right tabular-nums text-base")}>{typeof detail.POIDS === "number" ? detail.POIDS.toFixed(2) : detail.POIDS}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
