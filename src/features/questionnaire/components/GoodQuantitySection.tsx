import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NumPad } from "@/components/shared/NumPad";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { W_QUESTIONNAIRE } from "@/constants/widths";

interface GoodQuantitySectionProps {
  value: string;
  onChange: (value: string) => void;
}

export function GoodQuantitySection({ value, onChange }: GoodQuantitySectionProps) {
  const { t } = useTranslation();
  const [numpadOpen, setNumpadOpen] = useState(false);

  return (
    <Card>
      <CardHeader className="py-3 px-4">
        <CardTitle className="text-base">{t("questionnaire.goodQuantity")}</CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-3">
        <div className="flex items-center gap-2">
          <Label className="text-sm text-muted-foreground shrink-0">
            {t("questionnaire.qty")}:
          </Label>
          <Popover open={numpadOpen} onOpenChange={setNumpadOpen}>
            <PopoverTrigger asChild>
              <Input
                value={value}
                readOnly
                className={`${W_QUESTIONNAIRE.input} touch-target text-xl font-mono cursor-pointer`}
                placeholder="0"
                onClick={() => setNumpadOpen(true)}
              />
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <NumPad
                value={value}
                onChange={onChange}
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
