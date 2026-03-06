import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Info } from "lucide-react";
import type { OperationData } from "../hooks/useOperation";
import type { OperationStep } from "@/types/workOrder";
import { StepDetailsDialog } from "./StepDetailsDialog";

/** Returns true if the step has any viewable media in the given language */
function stepHasMedia(step: OperationStep, language: "fr" | "en"): boolean {
  if (language === "fr") {
    return !!(step.METRTF_P || step.METFICHIER_PDF_P || step.METVIDEO_P || step.IMAGE_COUNT > 0);
  }
  return !!(step.METRTF_S || step.METFICHIER_PDF_S || step.METVIDEO_S || step.IMAGE_COUNT > 0);
}

interface CncInfoSectionProps {
  operation: OperationData;
  language: "fr" | "en";
  hideNextStep?: boolean;
}

export function CncInfoSection({ operation, language, hideNextStep = false }: CncInfoSectionProps) {
  const { t } = useTranslation();
  const op = operation as unknown as Record<string, unknown>;

  const [selectedStep, setSelectedStep] = useState<OperationStep | null>(null);
  const [selectedStepNumber, setSelectedStepNumber] = useState<number>(100);

  const loc = (fr: unknown, en: unknown) =>
    String((language === "fr" ? fr : en) ?? fr ?? "—");

  return (
    <div className="flex flex-col gap-3 h-full">
      {/* Next Step (shown here only when not rendered in the overview row) */}
      {!hideNextStep && (
        <Card className="py-0 gap-0">
          <CardHeader className="py-2 px-4">
            <CardTitle className="text-[0.8rem]">{t("operation.nextStep")}</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <div className="text-sm text-muted-foreground">
              {op.NEXT_OPERATION
                ? loc(op.NEXT_OPERATION_P, op.NEXT_OPERATION_S)
                : t("common.noResults")}
            </div>
            {!!op.NEXT_MACHINE_P && (
              <div className="text-sm mt-1">
                {t("operation.machine")}: {String(loc(op.NEXT_MACHINE_P, op.NEXT_MACHINE_S))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Operation Steps + Components — side by side, grow to fill available height */}
      <div className="flex gap-3 items-stretch flex-1 min-h-0">
        <Card className="flex-1 flex flex-col py-0 gap-0 min-h-0">
          <CardContent className="px-0 pb-0 flex-1 overflow-auto min-h-0 pt-0">
            {(() => {
              const steps = (op.steps ?? []) as OperationStep[];
              if (steps.length === 0) {
                return (
                  <div className="px-4 py-3 text-sm text-muted-foreground">
                    {t("common.noResults")}
                  </div>
                );
              }
              // Determine if any step has an action button (to show the column)
              const anyHasAction = steps.some((s) => stepHasMedia(s, language));
              return (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow className="h-[42px]">
                        <TableHead className="w-[56px] text-center font-bold text-xs">{t("cnc.stepNumber")}</TableHead>
                        <TableHead className="text-xs font-bold">{t("cnc.stepDescription")}</TableHead>
                        {anyHasAction && <TableHead className="w-[56px]" />}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {steps.map((step, i) => {
                        const hasMedia = stepHasMedia(step, language);
                        return (
                          <TableRow key={step.METSEQ} className="h-[52px]">
                            <TableCell className="text-center font-bold text-base">{100 + i}</TableCell>
                            <TableCell className="text-lg">
                              {language === "fr" ? step.METDESC_P : step.METDESC_S}
                            </TableCell>
                            {anyHasAction && (
                              <TableCell className="text-center p-1">
                                {hasMedia && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-[48px] w-[48px]"
                                    onClick={() => { setSelectedStep(step); setSelectedStepNumber(100 + i); }}
                                  >
                                    <Info className="size-[24px] text-blue-600" />
                                  </Button>
                                )}
                              </TableCell>
                            )}
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                  <StepDetailsDialog
                    step={selectedStep}
                    stepNumber={selectedStepNumber}
                    language={language}
                    onClose={() => setSelectedStep(null)}
                  />
                </>
              );
            })()}
          </CardContent>
        </Card>

        <Card className="flex-1 flex flex-col py-0 gap-0">
          <CardHeader className="py-2 px-4">
            <CardTitle className="text-[0.8rem]">Components</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3 flex-1 text-sm text-muted-foreground">
            Component details will be loaded from CNC operation data.
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
