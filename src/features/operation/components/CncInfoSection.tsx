import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { OperationData } from "../hooks/useOperation";

interface CncInfoSectionProps {
  operation: OperationData;
  language: "fr" | "en";
}

export function CncInfoSection({ operation, language }: CncInfoSectionProps) {
  const { t } = useTranslation();
  const op = operation as unknown as Record<string, unknown>;

  const loc = (fr: unknown, en: unknown) =>
    String((language === "fr" ? fr : en) ?? fr ?? "—");

  return (
    <div className="space-y-3">
      {/* Next Step */}
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

      {/* Components placeholder — will be populated with real CNC component data */}
      <Card className="py-0 gap-0">
        <CardHeader className="py-2 px-4">
          <CardTitle className="text-[0.8rem]">Components</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-3 text-sm text-muted-foreground">
          Component details will be loaded from CNC operation data.
        </CardContent>
      </Card>

      {/* Operation Steps placeholder */}
      <Card className="py-0 gap-0">
        <CardHeader className="py-2 px-4">
          <CardTitle className="text-[0.8rem]">Operation Steps</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-3 text-sm text-muted-foreground">
          Operation steps will be loaded from CNC operation data.
        </CardContent>
      </Card>
    </div>
  );
}
