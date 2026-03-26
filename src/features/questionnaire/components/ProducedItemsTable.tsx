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
import type { ProducedItem } from "./VcutQuantitySection";

interface ProducedItemsTableProps {
  items: ProducedItem[];
  language: "fr" | "en";
}

export function ProducedItemsTable({ items, language }: ProducedItemsTableProps) {
  const { t } = useTranslation();
  const loc = (fr: string, en: string) => (language === "fr" ? fr : en) || fr;
  const total = items.reduce((sum, p) => sum + p.qty, 0);

  return (
    <Card className="bg-gray-100">
      <CardContent className="px-3 py-2">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-200">
              <TableHead className="text-sm font-bold uppercase w-[10%]">{t("questionnaire.producedQty")}</TableHead>
              <TableHead className="text-sm font-bold uppercase w-[15%]">{t("questionnaire.container")}</TableHead>
              <TableHead className="text-sm font-bold uppercase">{t("questionnaire.productCode")}</TableHead>
              <TableHead className="text-sm font-bold uppercase w-[12%]">{t("questionnaire.finishedProduct")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground py-3">
                  {total}
                </TableCell>
              </TableRow>
            ) : (
              <>
                {items.map((item) => (
                  <TableRow key={item.dtrseq} className="h-[44px]">
                    <TableCell className="text-base font-medium">{item.qty}</TableCell>
                    <TableCell className="text-base">{item.container}</TableCell>
                    <TableCell className="text-base">
                      {loc(item.desc_P, item.desc_S)} ({item.code})
                    </TableCell>
                    <TableCell className="text-base">{item.epfTrno}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-gray-200">
                  <TableCell className="text-base font-bold">{total}</TableCell>
                  <TableCell colSpan={3} />
                </TableRow>
              </>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
