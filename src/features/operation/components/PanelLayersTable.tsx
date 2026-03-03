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
import { W_PANEL_LAYERS } from "@/constants/widths";

export interface PanelLayer {
  NIRANG: number;
  NILONGUEUR: number;
  NILARGEUR: number;
  SPECIES: string;
  GRADE: string;
  CUT: string;
  THICKNESS: string;
  GRAIN: string;
  P_LAM: string;
  GLUE: string;
  TAPE: string;
  SAND: string;
}

interface PanelLayersTableProps {
  layers: PanelLayer[];
  groupHeader?: string;
}

export function PanelLayersTable({ layers, groupHeader }: PanelLayersTableProps) {
  const { t } = useTranslation();

  if (layers.length === 0) return null;

  const colCount = 12;

  return (
    <Card className="py-0 gap-0">
      <CardContent className="px-4 pt-3 pb-3">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className={W_PANEL_LAYERS.seq}>{t("panel.seq")}</TableHead>
              <TableHead className={cn(W_PANEL_LAYERS.length, "text-right")}>{t("panel.length")}</TableHead>
              <TableHead className={cn(W_PANEL_LAYERS.width, "text-right")}>{t("panel.width")}</TableHead>
              <TableHead className={W_PANEL_LAYERS.species}>{t("panel.species")}</TableHead>
              <TableHead className={W_PANEL_LAYERS.grade}>{t("panel.grade")}</TableHead>
              <TableHead className={W_PANEL_LAYERS.cut}>{t("panel.cut")}</TableHead>
              <TableHead className={cn(W_PANEL_LAYERS.thickness, "text-right")}>{t("panel.thickness")}</TableHead>
              <TableHead className={W_PANEL_LAYERS.grain}>{t("panel.grain")}</TableHead>
              <TableHead className={W_PANEL_LAYERS.pLam}>{t("panel.pLam")}</TableHead>
              <TableHead className={cn(W_PANEL_LAYERS.glue, "text-center")}>{t("panel.glue")}</TableHead>
              <TableHead className={cn(W_PANEL_LAYERS.tape, "text-center")}>{t("panel.tape")}</TableHead>
              <TableHead className={cn(W_PANEL_LAYERS.sand, "text-center")}>{t("panel.sand")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {groupHeader && (
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableCell colSpan={colCount} className="py-1.5 px-3 text-sm font-semibold text-foreground">
                  {groupHeader}
                </TableCell>
              </TableRow>
            )}
            {layers.map((layer, idx) => {
              const isPlyRow = /\d+-PLY/i.test(
                [layer.SPECIES, layer.GRADE, layer.CUT, layer.THICKNESS, layer.GRAIN, layer.P_LAM].join(" ")
              );
              return (
              <TableRow
                key={idx}
                className="h-7 [&_td]:py-1"
                style={isPlyRow ? { backgroundColor: "#FFFAD9" } : undefined}
              >
                <TableCell className={cn(W_PANEL_LAYERS.seq)} style={{ color: "#89DE71" }}>{layer.NIRANG}</TableCell>
                <TableCell className={cn(W_PANEL_LAYERS.length, "text-right tabular-nums")}>{layer.NILONGUEUR}</TableCell>
                <TableCell className={cn(W_PANEL_LAYERS.width, "text-right tabular-nums")}>{layer.NILARGEUR}</TableCell>
                <TableCell className={W_PANEL_LAYERS.species}>{layer.SPECIES}</TableCell>
                <TableCell className={W_PANEL_LAYERS.grade}>{layer.GRADE}</TableCell>
                <TableCell className={W_PANEL_LAYERS.cut}>{layer.CUT}</TableCell>
                <TableCell className={cn(W_PANEL_LAYERS.thickness, "text-right tabular-nums")}>{layer.THICKNESS}</TableCell>
                <TableCell className={W_PANEL_LAYERS.grain}>{layer.GRAIN}</TableCell>
                <TableCell className={W_PANEL_LAYERS.pLam}>{layer.P_LAM}</TableCell>
                <TableCell className={cn(W_PANEL_LAYERS.glue, "text-center")}>{layer.GLUE}</TableCell>
                <TableCell className={cn(W_PANEL_LAYERS.tape, "text-center")}>{layer.TAPE}</TableCell>
                <TableCell className={cn(W_PANEL_LAYERS.sand, "text-center")}>{layer.SAND}</TableCell>
              </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
