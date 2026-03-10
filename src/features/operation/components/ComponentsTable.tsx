import { useTranslation } from "react-i18next";
import { TableBody, TableCell, TableHead, TableHeader, TableRow, Table } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { W_COMPONENTS } from "@/constants/widths";
import type { OperationComponent } from "@/types/workOrder";

interface ComponentsTableProps {
  components: OperationComponent[];
  language: "fr" | "en";
  loading?: boolean;
}

export function ComponentsTable({ components, language, loading }: ComponentsTableProps) {
  const { t } = useTranslation();

  const getLocalizedText = (fr: string | null | undefined, en: string | null | undefined) => {
    return language === "fr" ? (fr ?? en ?? "—") : (en ?? fr ?? "—");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
        {t("common.loading")}...
      </div>
    );
  }

  if (!components || components.length === 0) {
    return (
      <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
        {t("common.noData")}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader className="sticky top-0 z-10 shadow-sm bg-background">
          <TableRow className="border-b">
            <TableHead className={cn(W_COMPONENTS.seq, "text-center")}>
              {t("components.seq", "Seq")}
            </TableHead>
            <TableHead className={cn(W_COMPONENTS.length, "text-right")}>
              {t("components.length", "L")}
            </TableHead>
            <TableHead className={cn(W_COMPONENTS.width, "text-right")}>
              {t("components.width", "W")}
            </TableHead>
            <TableHead className={cn(W_COMPONENTS.species, "text-left")}>
              {t("components.species", "Espèce")}
            </TableHead>
            <TableHead className={cn(W_COMPONENTS.grade, "text-center")}>
              {t("components.grade", "Gr")}
            </TableHead>
            <TableHead className={cn(W_COMPONENTS.cut, "text-left")}>
              {t("components.cut", "Coupe")}
            </TableHead>
            <TableHead className={cn(W_COMPONENTS.thickness, "text-right")}>
              {t("components.thickness", "Épaisseur")}
            </TableHead>
            <TableHead className={cn(W_COMPONENTS.grain, "text-center")}>
              {t("components.grain", "Grain")}
            </TableHead>
            <TableHead className={cn(W_COMPONENTS.laminate, "text-center")}>
              {t("components.laminate", "P_Lam")}
            </TableHead>
            <TableHead className={cn(W_COMPONENTS.glue, "text-center")}>
              {t("components.glue", "GL/CO")}
            </TableHead>
            <TableHead className={cn(W_COMPONENTS.tape, "text-center")}>
              {t("components.tape", "Tape")}
            </TableHead>
            <TableHead className={cn(W_COMPONENTS.sand, "text-center")}>
              {t("components.sand", "Sand")}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {components.map((comp, idx) => (
            <TableRow key={`${comp.NISEQ}-${idx}`} className="h-[52px] hover:bg-green-50">
              <TableCell className={cn(W_COMPONENTS.seq, "text-center text-sm")}>
                {comp.NISEQ}
              </TableCell>
              <TableCell className={cn(W_COMPONENTS.length, "text-right text-sm font-mono")}>
                {comp.NILONGUEUR ?? "—"}
              </TableCell>
              <TableCell className={cn(W_COMPONENTS.width, "text-right text-sm font-mono")}>
                {comp.NILARGEUR ?? "—"}
              </TableCell>
              <TableCell className={cn(W_COMPONENTS.species, "text-left text-sm truncate")}>
                {comp.SPECIES ?? "—"}
              </TableCell>
              <TableCell className={cn(W_COMPONENTS.grade, "text-center text-sm truncate")}>
                {comp.GRADE ?? "—"}
              </TableCell>
              <TableCell className={cn(W_COMPONENTS.cut, "text-left text-sm truncate")}>
                {comp.CUT ?? "—"}
              </TableCell>
              <TableCell className={cn(W_COMPONENTS.thickness, "text-right text-sm font-mono")}>
                {comp.NIEPAISSEUR ?? "—"}
              </TableCell>
              <TableCell className={cn(W_COMPONENTS.grain, "text-center text-sm truncate")}>
                {comp.NIVALEUR_CHAR1 ?? "—"}
              </TableCell>
              <TableCell className={cn(W_COMPONENTS.laminate, "text-center text-sm truncate")}>
                {comp.NIVALEUR_CHAR2 ?? "—"}
              </TableCell>
              <TableCell className={cn(W_COMPONENTS.glue, "text-center text-sm truncate")}>
                {comp.NIVALEUR_CHAR3 ?? "—"}
              </TableCell>
              <TableCell className={cn(W_COMPONENTS.tape, "text-center text-sm")}>
                —
              </TableCell>
              <TableCell className={cn(W_COMPONENTS.sand, "text-center text-sm")}>
                —
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
