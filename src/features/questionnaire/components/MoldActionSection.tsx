import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
}

export function MoldActionSection({ value, onChange }: MoldActionSectionProps) {
  const { t } = useTranslation();

  return (
    <Card>
      <CardHeader className="py-3 px-4">
        <CardTitle className="text-base">{t("questionnaire.moldAction")}</CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-3">
        <div className="flex items-center gap-2">
          <Label className="text-sm text-muted-foreground shrink-0">
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
        </div>
      </CardContent>
    </Card>
  );
}
