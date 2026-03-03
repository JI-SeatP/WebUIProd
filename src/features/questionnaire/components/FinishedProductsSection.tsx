import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NumPad } from "@/components/shared/NumPad";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Trash2 } from "lucide-react";

export interface FinishedProductRow {
  id: number;
  product: string;
  qty: string;
  container: string;
}

interface FinishedProductsSectionProps {
  products: FinishedProductRow[];
  onProductsChange: (products: FinishedProductRow[]) => void;
  theme?: "modern" | "minimal" | "dense";
}

let nextId = 1;

export function FinishedProductsSection({
  products,
  onProductsChange,
  theme = "modern",
}: FinishedProductsSectionProps) {
  const { t } = useTranslation();
  const [activeNumpad, setActiveNumpad] = useState<number | null>(null);

  const addRow = useCallback(() => {
    onProductsChange([
      ...products,
      { id: nextId++, product: "", qty: "", container: "" },
    ]);
  }, [products, onProductsChange]);

  const removeRow = useCallback(
    (id: number) => {
      onProductsChange(products.filter((p) => p.id !== id));
    },
    [products, onProductsChange]
  );

  const updateRow = useCallback(
    (id: number, field: keyof FinishedProductRow, value: string) => {
      onProductsChange(
        products.map((p) => (p.id === id ? { ...p, [field]: value } : p))
      );
    },
    [products, onProductsChange]
  );

  const headerClasses = {
    modern: "py-1.5 px-3 flex flex-row items-center justify-between",
    minimal: "py-2.5 px-4 flex flex-row items-center justify-between",
    dense: "py-1 px-3 border-b border-green-200 flex flex-row items-center justify-between",
  }[theme];

  const headerTextClasses = {
    modern: "border border-green-400 bg-green-50 rounded-lg px-3 py-1 text-2xl font-bold text-green-900 uppercase tracking-wider",
    minimal: "text-sm font-semibold text-green-900",
    dense: "text-xs font-bold text-green-900 uppercase",
  }[theme];

  const contentClasses = {
    modern: "px-3 pt-0.5 pb-2",
    minimal: "px-4 pt-0.5 pb-3",
    dense: "px-3 pt-px pb-1.5",
  }[theme];

  return (
    <Card className={`min-h-[250px] bg-white ${theme === "dense" ? "border border-gray-200" : ""}`}>
      <div className={headerClasses}>
        <div className={headerTextClasses}>{t("questionnaire.finishedProducts")}</div>
        <Button
          variant="outline"
          size="sm"
          className={`touch-target gap-2 text-green-800 border-2 border-green-600 hover:text-green-900 hover:border-green-700 ${theme === "dense" ? "text-xs h-8" : "text-base"}`}
          onClick={addRow}
        >
          <Plus size={theme === "dense" ? 14 : 18} />
          {t("questionnaire.addProduct")}
        </Button>
      </div>
      <CardContent className={contentClasses}>
        {products.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            {t("common.noResults")}
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[120px]">{t("questionnaire.qty")}</TableHead>
                <TableHead className="w-[250px]">{t("order.product")}</TableHead>
                <TableHead className="w-[180px]">{t("questionnaire.container")}</TableHead>
                <TableHead className="w-[80px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((row) => (
                <TableRow key={row.id} className="h-[56px]">
                  <TableCell>
                    <Popover
                      open={activeNumpad === row.id}
                      onOpenChange={(open) => setActiveNumpad(open ? row.id : null)}
                    >
                      <PopoverTrigger asChild>
                        <Input
                          value={row.qty}
                          readOnly
                          className="touch-target !text-3xl font-mono font-bold cursor-pointer bg-white text-green-600 border-green-600"
                          placeholder="0"
                        />
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <NumPad
                          value={row.qty}
                          onChange={(v) => updateRow(row.id, "qty", v)}
                          onSubmit={() => setActiveNumpad(null)}
                          onClose={() => setActiveNumpad(null)}
                        />
                      </PopoverContent>
                    </Popover>
                  </TableCell>
                  <TableCell>
                    <Input
                      value={row.product}
                      onChange={(e) => updateRow(row.id, "product", e.target.value)}
                      className="touch-target text-base bg-white"
                      placeholder={t("order.product")}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      value={row.container}
                      onChange={(e) => updateRow(row.id, "container", e.target.value)}
                      className="touch-target !text-2xl bg-white"
                      placeholder={t("questionnaire.container")}
                    />
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="touch-target text-destructive"
                      onClick={() => removeRow(row.id)}
                    >
                      <Trash2 size={18} />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
