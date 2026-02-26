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
}

export function MaterialOutputSection({ materials }: MaterialOutputSectionProps) {
  const { t } = useTranslation();

  return (
    <Card>
      <CardHeader className="py-3 px-4">
        <CardTitle className="text-base">{t("questionnaire.materialOutput")}</CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-3">
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
