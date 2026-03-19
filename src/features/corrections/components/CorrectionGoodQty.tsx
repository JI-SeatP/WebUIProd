import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NumPad } from "@/components/shared/NumPad";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface CorrectionGoodQtyProps {
  value: number;
  onChange: (qty: number) => void;
}

export function CorrectionGoodQty({ value, onChange }: CorrectionGoodQtyProps) {
  const { t } = useTranslation();
  const [numpadOpen, setNumpadOpen] = useState(false);

  return (
    <Card className="min-h-[250px] bg-white">
      <div className="py-1.5 px-3">
        <div className="border border-green-500 bg-green-50 rounded-lg px-3 py-1 text-2xl font-bold text-green-900 uppercase tracking-wider w-fit">
          {t("corrections.goodQuantities")}
        </div>
      </div>
      <CardContent className="pt-0.5 pb-2 px-3 flex items-center gap-2">
        <Label className="text-sm text-muted-foreground shrink-0">
          {t("questionnaire.qty")}:
        </Label>
        <Popover open={numpadOpen} onOpenChange={setNumpadOpen}>
          <PopoverTrigger asChild>
            <Input
              value={String(value)}
              readOnly
              className="w-[135px] touch-target !text-3xl font-sans font-bold cursor-pointer text-green-700 bg-white border-green-600"
              placeholder="0"
              onClick={() => setNumpadOpen(true)}
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
      </CardContent>
    </Card>
  );
}
