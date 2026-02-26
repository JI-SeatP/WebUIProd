import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
}

let nextId = 1;

export function FinishedProductsSection({
  products,
  onProductsChange,
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

  return (
    <Card>
      <CardHeader className="py-3 px-4 flex flex-row items-center justify-between">
        <CardTitle className="text-base">{t("questionnaire.finishedProducts")}</CardTitle>
        <Button
          variant="outline"
          size="sm"
          className="touch-target gap-2 text-base"
          onClick={addRow}
        >
          <Plus size={18} />
          {t("questionnaire.addProduct")}
        </Button>
      </CardHeader>
      <CardContent className="px-4 pb-3">
        {products.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            {t("common.noResults")}
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[250px]">{t("order.product")}</TableHead>
                <TableHead className="w-[120px]">{t("questionnaire.qty")}</TableHead>
                <TableHead className="w-[180px]">{t("questionnaire.container")}</TableHead>
                <TableHead className="w-[80px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((row) => (
                <TableRow key={row.id} className="h-[56px]">
                  <TableCell>
                    <Input
                      value={row.product}
                      onChange={(e) => updateRow(row.id, "product", e.target.value)}
                      className="touch-target text-base"
                      placeholder={t("order.product")}
                    />
                  </TableCell>
                  <TableCell>
                    <Popover
                      open={activeNumpad === row.id}
                      onOpenChange={(open) => setActiveNumpad(open ? row.id : null)}
                    >
                      <PopoverTrigger asChild>
                        <Input
                          value={row.qty}
                          readOnly
                          className="touch-target text-lg font-mono cursor-pointer"
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
                      value={row.container}
                      onChange={(e) => updateRow(row.id, "container", e.target.value)}
                      className="touch-target text-base"
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
