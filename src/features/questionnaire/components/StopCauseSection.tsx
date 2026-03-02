import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
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
import { OnScreenKeyboard } from "@/components/shared/OnScreenKeyboard";

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
  theme?: "modern" | "minimal" | "dense";
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
  theme = "modern",
}: StopCauseSectionProps) {
  const { t } = useTranslation();
  const isFr = language === "fr";

  const [primaryOptions, setPrimaryOptions] = useState<CauseOption[]>([]);
  const [secondaryOptions, setSecondaryOptions] = useState<CauseOption[]>([]);
  const [keyboardOpen, setKeyboardOpen] = useState(false);

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

  const headerClasses = {
    modern: "border-l-4 border-blue-600 bg-blue-50 py-1.5 px-3",
    minimal: "bg-blue-100 py-2.5 px-4",
    dense: "bg-blue-50 py-1 px-3 border-b border-blue-200",
  }[theme];

  const headerTextClasses = {
    modern: "text-xs font-bold text-blue-900 uppercase tracking-wider",
    minimal: "text-sm font-semibold text-blue-900",
    dense: "text-xs font-bold text-blue-900 uppercase",
  }[theme];

  const contentClasses = {
    modern: "pt-0.5 pb-2 px-3",
    minimal: "pt-0.5 pb-3 px-4",
    dense: "pt-px pb-1.5 px-3",
  }[theme];

  return (
    <Card className={theme === "dense" ? "border border-gray-200" : ""}>
      <div className={headerClasses}>
        <div className={headerTextClasses}>{t("questionnaire.stopCause")}</div>
      </div>
      <CardContent className={contentClasses}>
        <div className="flex gap-4 items-start">
          {/* Left col: Primary + Secondary stacked */}
          <div className="flex flex-col gap-1.5 shrink-0">
            <div className="flex items-center gap-2">
              <Label className={`${W_QUESTIONNAIRE.label} text-sm text-muted-foreground shrink-0`}>
                {t("questionnaire.primaryCause")}:
              </Label>
              <Select value={primaryCause} onValueChange={onPrimaryCauseChange}>
                <SelectTrigger
                  className={`${W_QUESTIONNAIRE.dropdown} touch-target !text-lg !bg-gray-100 ${
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

            <div className="flex items-center gap-2">
              <Label className={`${W_QUESTIONNAIRE.label} text-sm text-muted-foreground shrink-0`}>
                {t("questionnaire.secondaryCause")}:
              </Label>
              <Select
                value={secondaryCause}
                onValueChange={onSecondaryCauseChange}
                disabled={secondaryOptions.length === 0}
              >
                <SelectTrigger className={`${W_QUESTIONNAIRE.dropdown} touch-target !text-lg !bg-gray-100`}>
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

            {error && !primaryCause && (
              <p className="text-sm text-destructive">{error}</p>
            )}
          </div>

          {/* Right col: Notes full height */}
          <div className="flex items-stretch flex-1 min-w-0 gap-2">
            <Label className="text-sm text-muted-foreground shrink-0 self-start pt-1">
              {t("questionnaire.notes")}:
            </Label>
            <Textarea
              value={notes}
              readOnly
              onClick={() => setKeyboardOpen(true)}
              className="flex-1 min-w-0 text-base resize-none cursor-pointer"
              placeholder={t("questionnaire.otherSpecify")}
            />
          </div>

          {/* On-screen keyboard (fixed, full-width, 40vh) */}
          {keyboardOpen && (
            <OnScreenKeyboard
              value={notes}
              onChange={onNotesChange}
              onClose={() => setKeyboardOpen(false)}
              locale={isFr ? "fr" : "en"}
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
