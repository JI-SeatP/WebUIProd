import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { VcutData } from "@/types/workOrder";

interface VcutInfoSectionProps {
  vcutData: VcutData | null;
  language: "fr" | "en";
  loading?: boolean;
}

export function VcutInfoSection({ vcutData, language, loading }: VcutInfoSectionProps) {
  const { t } = useTranslation();

  const loc = (fr: string | null | undefined, en: string | null | undefined) =>
    (language === "fr" ? fr : en) ?? fr ?? "—";

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground text-lg">{t("common.loading")}</div>;
  }

  if (!vcutData) {
    return <div className="text-center py-8 text-muted-foreground text-lg">{t("common.noResults")}</div>;
  }

  return (
    <div className="flex gap-2 flex-1 min-h-0">
      {/* Left: Components Table */}
      <Card className="w-[55%] py-0 gap-0 min-w-0 flex flex-col">
        <CardHeader className="py-2 px-4">
          <CardTitle className="text-base uppercase font-bold">
            {t("vcut.components")}
          </CardTitle>
        </CardHeader>
        <CardContent className="px-2 pb-2 flex-1 min-h-0 overflow-auto">
          <Table>
            <TableHeader>
              <TableRow className="h-[44px]">
                <TableHead className="text-sm">{t("vcut.productNo")}</TableHead>
                <TableHead className="text-sm">{t("production.description")}</TableHead>
                <TableHead className="text-sm">{t("vcut.order")}</TableHead>
                <TableHead className="text-sm text-center">Big Sheets</TableHead>
                <TableHead className="text-sm text-center">{t("vcut.good")}</TableHead>
                <TableHead className="text-sm text-center">{t("vcut.defect")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vcutData.components.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground h-[56px] text-base">
                    {t("common.noResults")}
                  </TableCell>
                </TableRow>
              ) : (
                vcutData.components.map((comp) => (
                  <TableRow
                    key={comp.NISEQ}
                    className={cn(
                      "h-[56px]",
                      comp.QTY_REQ === 0 && "bg-red-100"
                    )}
                  >
                    <TableCell className="text-lg font-medium">{comp.INVENTAIRE_M_INNOINV}</TableCell>
                    <TableCell className="text-lg">{loc(comp.INDESC1, comp.INDESC2)}</TableCell>
                    <TableCell className="text-lg">{comp.NIVALEUR_CHAR1 ?? "—"}</TableCell>
                    <TableCell className="text-lg text-center tabular-nums">
                      {comp.totalBigSheet} / {comp.QTY_REQ}
                    </TableCell>
                    <TableCell className="text-lg text-center tabular-nums">
                      {comp.totalProd} / {Math.ceil(comp.NIQTE)}
                    </TableCell>
                    <TableCell className="text-base text-center tabular-nums text-red-600">
                      {comp.totalDefect}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Right: Containers Table */}
      <Card className="w-[45%] shrink-0 py-0 gap-0 flex flex-col">
        <CardHeader className="py-2 px-4">
          <CardTitle className="text-base uppercase font-bold">
            {t("vcut.containers")}
          </CardTitle>
        </CardHeader>
        <CardContent className="px-2 pb-2 flex-1 min-h-0 overflow-auto">
          {vcutData.containers.length === 0 ? (
            <div className="flex items-center justify-center gap-2 py-6 px-4 bg-red-100 text-red-700 rounded-md font-semibold text-xl">
              <AlertTriangle size={24} />
              {t("vcut.noContainers")}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="h-[44px]">
                  <TableHead className="text-sm">{t("vcut.skidNumber")}</TableHead>
                  <TableHead className="text-sm text-right">{t("order.quantity")}</TableHead>
                  <TableHead className="text-sm">{t("vcut.warehouse")}</TableHead>
                  <TableHead className="text-sm">{t("production.description")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vcutData.containers.map((cont, idx) => (
                  <TableRow key={`${cont.CONTENANT_CON_NUMERO}-${idx}`} className="h-[56px]">
                    <TableCell className="text-lg font-medium">{cont.CONTENANT_CON_NUMERO}</TableCell>
                    <TableCell className="text-lg text-right tabular-nums">{cont.DTRQTE}</TableCell>
                    <TableCell className="text-lg">
                      <div>{cont.ENTREPOT_ENCODE}</div>
                      <div className="text-sm text-muted-foreground">{loc(cont.ENDESC_P, cont.ENDESC_S)}</div>
                    </TableCell>
                    <TableCell className="text-lg">
                      {[cont.SPECIE, cont.GRADE, cont.CUT, cont.THICKNESS].filter(Boolean).join(" / ")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
