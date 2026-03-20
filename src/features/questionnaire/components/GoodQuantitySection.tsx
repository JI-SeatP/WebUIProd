import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { NumPad } from "@/components/shared/NumPad";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface GoodQuantitySectionProps {
  value: string;
  onChange: (value: string) => void;
  onOkPress?: () => void;
  loading?: boolean;
  theme?: "modern" | "minimal" | "dense";
}

export function GoodQuantitySection({ value, onChange, onOkPress, loading, theme = "modern" }: GoodQuantitySectionProps) {
  const { t } = useTranslation();
  const [numpadOpen, setNumpadOpen] = useState(false);

  const headerClasses = {
    modern: "py-1.5 px-3",
    minimal: "bg-green-100 py-2.5 px-4",
    dense: "bg-green-50 py-1 px-3 border-b border-green-200",
  }[theme];

  const headerTextClasses = {
    modern: "border border-green-500 bg-green-50 rounded-lg px-3 py-1 text-2xl font-bold text-green-900 uppercase tracking-wider",
    minimal: "text-sm font-semibold text-green-900",
    dense: "text-xs font-bold text-green-900 uppercase",
  }[theme];

  const contentClasses = {
    modern: "pt-0.5 pb-2 px-3",
    minimal: "pt-0.5 pb-3 px-4",
    dense: "pt-px pb-1.5 px-3",
  }[theme];

  return (
    <Card className={`min-h-[250px] bg-white ${theme === "dense" ? "border border-gray-200" : ""}`}>
      <div className={headerClasses}>
        <div className={headerTextClasses}>{t("questionnaire.goodQuantity")}</div>
      </div>
      <CardContent className={`${contentClasses} flex items-center ${theme === "dense" ? "gap-1" : "gap-2"}`}>
        <Label className="text-sm text-muted-foreground shrink-0">
          {t("questionnaire.qty")}:
        </Label>
        <Popover open={numpadOpen} onOpenChange={setNumpadOpen}>
          <PopoverTrigger asChild>
            <Input
              value={value}
              readOnly
              className="w-[135px] touch-target !text-3xl font-sans font-bold cursor-pointer text-green-700 bg-white border-green-600"
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
        {onOkPress && (
          <Button
            variant="outline"
            className="touch-target h-12 w-14 text-base font-bold border-green-600 text-green-700"
            onClick={onOkPress}
            disabled={loading}
          >
            OK
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
