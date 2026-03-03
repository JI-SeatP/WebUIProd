import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NumPad } from "@/components/shared/NumPad";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { W_CORRECTIONS } from "@/constants/widths";

interface CorrectionGoodQtyProps {
  value: number;
  onChange: (qty: number) => void;
}

export function CorrectionGoodQty({ value, onChange }: CorrectionGoodQtyProps) {
  const { t } = useTranslation();
  const [numpadOpen, setNumpadOpen] = useState(false);

  return (
    <Card>
      <CardHeader className="py-3 px-4">
        <CardTitle className="text-base">{t("corrections.goodQuantities")}</CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-3">
        <div className="flex items-center gap-2">
          <Label className={`${W_CORRECTIONS.label} text-sm text-muted-foreground`}>
            {t("questionnaire.goodQuantity")}:
          </Label>
          <Popover open={numpadOpen} onOpenChange={setNumpadOpen}>
            <PopoverTrigger asChild>
              <Input
                value={String(value)}
                readOnly
                className={`${W_CORRECTIONS.qtyField} touch-target text-lg font-mono cursor-pointer`}
              />
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <NumPad
                value={String(value)}
                onChange={(v) => onChange(Number(v) || 0)}
                onSubmit={() => setNumpadOpen(false)}
                onClose={() => setNumpadOpen(false)}
              />
            </PopoverContent>
          </Popover>
        </div>
      </CardContent>
    </Card>
  );
}
