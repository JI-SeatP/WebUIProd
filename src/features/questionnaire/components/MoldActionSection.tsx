import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { W_QUESTIONNAIRE } from "@/constants/widths";

interface MoldActionSectionProps {
  value: string;
  onChange: (value: string) => void;
  theme?: "modern" | "minimal" | "dense";
}

export function MoldActionSection({ value, onChange, theme = "modern" }: MoldActionSectionProps) {
  const { t } = useTranslation();

  const headerClasses = {
    modern: "border-l-4 border-gray-600 bg-gray-50 py-1.5 px-3",
    minimal: "bg-gray-100 py-2.5 px-4",
    dense: "bg-gray-50 py-1 px-3 border-b border-gray-200",
  }[theme];

  const headerTextClasses = {
    modern: "text-xs font-bold text-gray-900 uppercase tracking-wider",
    minimal: "text-sm font-semibold text-gray-900",
    dense: "text-xs font-bold text-gray-900 uppercase",
  }[theme];

  const contentClasses = {
    modern: "pt-0.5 pb-2 px-3",
    minimal: "pt-0.5 pb-3 px-4",
    dense: "pt-px pb-1.5 px-3",
  }[theme];

  return (
    <Card className={theme === "dense" ? "border border-gray-200" : ""}>
      <div className={headerClasses}>
        <div className={headerTextClasses}>{t("questionnaire.moldAction")}</div>
      </div>
      <CardContent className={`${contentClasses} flex items-center ${theme === "dense" ? "gap-1" : "gap-2"}`}>
        <Label className={`${theme === "dense" ? "text-xs" : "text-sm"} text-muted-foreground shrink-0`}>
          {t("questionnaire.moldAction")}:
        </Label>
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger className={`${W_QUESTIONNAIRE.dropdown} touch-target text-base`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="keep" className="text-base">
              {t("questionnaire.keepMold")}
            </SelectItem>
            <SelectItem value="uninstall" className="text-base">
              {t("questionnaire.uninstallMold")}
            </SelectItem>
          </SelectContent>
        </Select>
      </CardContent>
    </Card>
  );
}
