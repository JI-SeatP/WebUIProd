import { useTranslation } from "react-i18next";
import { TableBody, TableCell, TableHead, TableHeader, TableRow, Table } from "@/components/ui/table";
import type { OperationAccessory } from "@/types/workOrder";

interface AccessoriesTableProps {
  accessories: OperationAccessory[];
  language: "fr" | "en";
  loading?: boolean;
}

export function AccessoriesTable({ accessories, language, loading }: AccessoriesTableProps) {
  const { t } = useTranslation();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
        {t("common.loading")}...
      </div>
    );
  }

  if (!accessories || accessories.length === 0) {
    return (
      <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
        {t("common.noData")}
      </div>
    );
  }

  return (
    <div>
      <Table>
        <TableHeader className="sticky top-0 z-10 shadow-sm bg-background">
          <TableRow className="h-[44px] border-b">
            <TableHead className="w-[60px] text-center text-[13px] font-bold uppercase">
              {t("accessories.qty", "QTÉ")}
            </TableHead>
            <TableHead className="text-left text-[13px] font-bold uppercase">
              {t("accessories.needed", "ACCESSOIRES NÉCESSAIRES")}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {accessories.map((acc, idx) => (
            <TableRow key={idx} className="h-[44px] hover:bg-green-50">
              <TableCell className="w-[60px] text-center text-base font-bold">
                {acc.qty}
              </TableCell>
              <TableCell className="text-base whitespace-normal break-words">
                {language === "fr"
                  ? (acc.description_fr ?? acc.description_en ?? "—")
                  : (acc.description_en ?? acc.description_fr ?? "—")}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
