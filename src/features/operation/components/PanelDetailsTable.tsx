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

export interface PanelDetail {
  ITEM: string;
  PANNEAU: string;
  DESCRIPTION: string;
  VER: number | string;
  TYPE: string;
  POIDS: number | string;
}

interface PanelDetailsTableProps {
  detail: PanelDetail;
}

export function PanelDetailsTable({ detail }: PanelDetailsTableProps) {
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
              <TableHead className={cn(W_PANEL_DETAILS.weight, "text-right")}>{t("panel.weight")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow className="h-10">
              <TableCell className={W_PANEL_DETAILS.item}>{detail.ITEM}</TableCell>
              <TableCell className={W_PANEL_DETAILS.panneau}>{detail.PANNEAU}</TableCell>
              <TableCell className={W_PANEL_DETAILS.description}>{detail.DESCRIPTION}</TableCell>
              <TableCell className={cn(W_PANEL_DETAILS.version, "text-right tabular-nums")}>{detail.VER}</TableCell>
              <TableCell className={W_PANEL_DETAILS.type}>{detail.TYPE}</TableCell>
              <TableCell className={cn(W_PANEL_DETAILS.weight, "text-right tabular-nums")}>{detail.POIDS}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
