import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiGet } from "@/api/client";
import { W_QUESTIONNAIRE } from "@/constants/widths";

interface CauseOption {
  id: number;
  description_P: string;
  description_S: string;
}

interface StopCauseSectionProps {
  language: string;
  primaryCause: string;
  secondaryCause: string;
  notes: string;
  onPrimaryCauseChange: (value: string) => void;
  onSecondaryCauseChange: (value: string) => void;
  onNotesChange: (value: string) => void;
  error?: string;
}

export function StopCauseSection({
  language,
  primaryCause,
  secondaryCause,
  notes,
  onPrimaryCauseChange,
  onSecondaryCauseChange,
  onNotesChange,
  error,
}: StopCauseSectionProps) {
  const { t } = useTranslation();
  const isFr = language === "fr";

  const [primaryOptions, setPrimaryOptions] = useState<CauseOption[]>([]);
  const [secondaryOptions, setSecondaryOptions] = useState<CauseOption[]>([]);

  // Load primary causes on mount
  useEffect(() => {
    apiGet<CauseOption[]>("getStopCauses.cfm").then((res) => {
      if (res.success) setPrimaryOptions(res.data);
    });
  }, []);

  // Load secondary causes when primary changes
  const loadSecondary = useCallback(async (primaryId: string) => {
    if (!primaryId) {
      setSecondaryOptions([]);
      return;
    }
    const res = await apiGet<CauseOption[]>(`getSecondaryCauses.cfm?primaryId=${primaryId}`);
    if (res.success) setSecondaryOptions(res.data);
  }, []);

  useEffect(() => {
    loadSecondary(primaryCause);
    onSecondaryCauseChange("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [primaryCause, loadSecondary]);

  const getLabel = (opt: CauseOption) =>
    isFr ? opt.description_P : opt.description_S;

  return (
    <Card>
      <CardHeader className="py-3 px-4">
        <CardTitle className="text-base">{t("questionnaire.stopCause")}</CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-3 space-y-3">
        {/* Primary cause */}
        <div className="flex items-center gap-2">
          <Label className={`${W_QUESTIONNAIRE.label} text-sm text-muted-foreground shrink-0`}>
            {t("questionnaire.primaryCause")}:
          </Label>
          <Select value={primaryCause} onValueChange={onPrimaryCauseChange}>
            <SelectTrigger
              className={`${W_QUESTIONNAIRE.dropdown} touch-target text-base ${
                error && !primaryCause ? "border-destructive" : ""
              }`}
            >
              <SelectValue placeholder={t("questionnaire.selectCause")} />
            </SelectTrigger>
            <SelectContent>
              {primaryOptions.map((opt) => (
                <SelectItem key={opt.id} value={String(opt.id)} className="text-base">
                  {getLabel(opt)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Secondary cause */}
        <div className="flex items-center gap-2">
          <Label className={`${W_QUESTIONNAIRE.label} text-sm text-muted-foreground shrink-0`}>
            {t("questionnaire.secondaryCause")}:
          </Label>
          <Select
            value={secondaryCause}
            onValueChange={onSecondaryCauseChange}
            disabled={secondaryOptions.length === 0}
          >
            <SelectTrigger className={`${W_QUESTIONNAIRE.dropdown} touch-target text-base`}>
              <SelectValue placeholder={t("questionnaire.selectCause")} />
            </SelectTrigger>
            <SelectContent>
              {secondaryOptions.map((opt) => (
                <SelectItem key={opt.id} value={String(opt.id)} className="text-base">
                  {getLabel(opt)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Notes */}
        <div className="flex items-start gap-2">
          <Label className={`${W_QUESTIONNAIRE.label} text-sm text-muted-foreground shrink-0 pt-3`}>
            {t("questionnaire.notes")}:
          </Label>
          <Textarea
            value={notes}
            onChange={(e) => onNotesChange(e.target.value)}
            className="flex-1 min-h-[75px] text-base"
            placeholder={t("questionnaire.otherSpecify")}
          />
        </div>

        {error && !primaryCause && (
          <p className="text-sm text-destructive">{error}</p>
        )}
      </CardContent>
    </Card>
  );
}
