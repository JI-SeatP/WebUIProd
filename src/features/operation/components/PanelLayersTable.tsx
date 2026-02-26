import { useTranslation } from "react-i18next";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { W_PANEL_LAYERS } from "@/constants/widths";

export interface PanelLayer {
  NIRANG: number;
  NILONGUEUR: number;
  NILARGEUR: number;
  SPECIES: string;
  GRADE: string;
  CUT: string;
  THICKNESS: number;
  GRAIN: string;
  P_LAM: string;
  GLUE: string;
  TAPE: string;
  SAND: string;
}

interface PanelLayersTableProps {
  layers: PanelLayer[];
}

export function PanelLayersTable({ layers }: PanelLayersTableProps) {
  const { t } = useTranslation();

  if (layers.length === 0) return null;

  return (
    <Card>
      <CardHeader className="py-3 px-4">
        <CardTitle className="text-base">{t("press.panel")} Layers</CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-3">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className={W_PANEL_LAYERS.seq}>{t("panel.seq")}</TableHead>
              <TableHead className={cn(W_PANEL_LAYERS.length, "text-right")}>{t("panel.length")}</TableHead>
              <TableHead className={cn(W_PANEL_LAYERS.width, "text-right")}>{t("panel.width")}</TableHead>
              <TableHead className={W_PANEL_LAYERS.species}>{t("panel.species")}</TableHead>
              <TableHead className={W_PANEL_LAYERS.grade}>{t("panel.grade")}</TableHead>
              <TableHead className={W_PANEL_LAYERS.cut}>{t("panel.cut")}</TableHead>
              <TableHead className={cn(W_PANEL_LAYERS.thickness, "text-right")}>{t("press.thickness")}</TableHead>
              <TableHead className={W_PANEL_LAYERS.grain}>{t("panel.grain")}</TableHead>
              <TableHead className={W_PANEL_LAYERS.glue}>{t("panel.glue")}</TableHead>
              <TableHead className={W_PANEL_LAYERS.tape}>{t("panel.tape")}</TableHead>
              <TableHead className={W_PANEL_LAYERS.sand}>{t("panel.sand")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {layers.map((layer, idx) => (
              <TableRow key={idx} className="h-10">
                <TableCell className={W_PANEL_LAYERS.seq}>{layer.NIRANG}</TableCell>
                <TableCell className={cn(W_PANEL_LAYERS.length, "text-right tabular-nums")}>{layer.NILONGUEUR}</TableCell>
                <TableCell className={cn(W_PANEL_LAYERS.width, "text-right tabular-nums")}>{layer.NILARGEUR}</TableCell>
                <TableCell className={W_PANEL_LAYERS.species}>{layer.SPECIES}</TableCell>
                <TableCell className={W_PANEL_LAYERS.grade}>{layer.GRADE}</TableCell>
                <TableCell className={W_PANEL_LAYERS.cut}>{layer.CUT}</TableCell>
                <TableCell className={cn(W_PANEL_LAYERS.thickness, "text-right tabular-nums")}>{layer.THICKNESS}</TableCell>
                <TableCell className={W_PANEL_LAYERS.grain}>{layer.GRAIN}</TableCell>
                <TableCell className={W_PANEL_LAYERS.glue}>{layer.GLUE}</TableCell>
                <TableCell className={W_PANEL_LAYERS.tape}>{layer.TAPE}</TableCell>
                <TableCell className={W_PANEL_LAYERS.sand}>{layer.SAND}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
