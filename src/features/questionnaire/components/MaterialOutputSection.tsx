import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export interface MaterialRow {
  id: number;
  code: string;
  description: string;
  qty: number;
  warehouse: string;
  skid: string;
}

interface MaterialOutputSectionProps {
  materials: MaterialRow[];
  theme?: "modern" | "minimal" | "dense";
}

export function MaterialOutputSection({ materials, theme = "modern" }: MaterialOutputSectionProps) {
  const { t } = useTranslation();

  const headerClasses = {
    modern: "border-l-4 border-gray-600 bg-gray-50 py-1.5 px-3",
    minimal: "bg-gray-100 py-2.5 px-4",
    dense: "bg-gray-50 py-1 px-3 border-b border-gray-200",
  }[theme];

  const headerTextClasses = {
    modern: "text-xs font-bold text-gray-900 uppercase tracking-wider",
    minimal: "text-sm font-semibold text-gray-900",
    dense: "text-xs font-bold text-gray-900 uppercase",
  }[theme];

  const contentClasses = {
    modern: "px-3 pt-0.5 pb-2",
    minimal: "px-4 pt-0.5 pb-3",
    dense: "px-3 pt-px pb-1.5",
  }[theme];

  return (
    <Card className={theme === "dense" ? "border border-gray-200" : ""}>
      <div className={headerClasses}>
        <div className={headerTextClasses}>{t("questionnaire.materialOutput")}</div>
      </div>
      <CardContent className={contentClasses}>
        {materials.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            {t("common.noResults")}
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[120px]">{t("material.rawMaterial")}</TableHead>
                <TableHead className="w-[250px]">{t("production.description")}</TableHead>
                <TableHead className="w-[100px]">{t("questionnaire.qty")}</TableHead>
                <TableHead className="w-[150px]">{t("questionnaire.warehouse")}</TableHead>
                <TableHead className="w-[120px]">{t("questionnaire.skid")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {materials.map((row) => (
                <TableRow key={row.id} className="h-[56px]">
                  <TableCell className="font-mono">{row.code}</TableCell>
                  <TableCell>{row.description}</TableCell>
                  <TableCell className="font-mono">{row.qty}</TableCell>
                  <TableCell>{row.warehouse}</TableCell>
                  <TableCell className="font-mono">{row.skid}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
