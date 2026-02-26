import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { OperationData } from "../hooks/useOperation";

interface MachineInfoPanelProps {
  operation: OperationData;
  language: "fr" | "en";
}

function InfoRow({ label, value, className }: { label: string; value: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex items-baseline gap-2 py-1.5", className)}>
      <span className="w-[120px] text-sm text-muted-foreground shrink-0">{label}</span>
      <span className="text-sm font-medium">{value ?? "—"}</span>
    </div>
  );
}

export function MachineInfoPanel({ operation, language }: MachineInfoPanelProps) {
  const { t } = useTranslation();
  const op = operation as Record<string, unknown>;

  const loc = (fr: string | null | undefined, en: string | null | undefined) =>
    (language === "fr" ? fr : en) ?? fr ?? "—";

  // Notes field varies by machine family
  const getNotes = (): string => {
    if (operation.FMCODE?.includes("PRESS")) return String(op.PRESSAGE_NOTE ?? "");
    if (operation.FMCODE?.includes("PACK")) return String(op.EMBALLAGE_NOTE ?? "");
    return String(op.PLACAGE_NOTE ?? op.TRNOTE ?? "");
  };

  const notes = getNotes();

  return (
    <Card className="h-full">
      <CardHeader className="py-3 px-4">
        <CardTitle className="text-base">{t("operation.machine")}</CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-3 space-y-1">
        {/* Dates */}
        <InfoRow
          label={t("dates.scheduledStart")}
          value={operation.DATE_DEBUT_PREVU ?? "—"}
        />
        <InfoRow
          label={t("dates.scheduledEnd")}
          value={operation.DATE_FIN_PREVU ?? "—"}
        />

        {/* Machine */}
        <InfoRow
          label={t("dates.assigned")}
          value={loc(operation.MACHINE_P, operation.MACHINE_S)}
        />

        {/* Type & Group */}
        <InfoRow label={t("production.type")} value={operation.FMCODE} />
        <InfoRow label={t("order.group")} value={operation.GROUPE} />

        {/* Department */}
        <InfoRow
          label={t("operation.department")}
          value={loc(operation.DeDescription_P, operation.DeDescription_S)}
        />

        {/* Warehouse */}
        {operation.ENTREPOT_CODE && (
          <InfoRow
            label={t("production.warehouse")}
            value={loc(operation.ENTREPOT_P, operation.ENTREPOT_S)}
          />
        )}

        {/* Notes */}
        {notes && (
          <div className="pt-2 border-t mt-2">
            <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
              {t("production.note")}
            </div>
            <p className="text-sm whitespace-pre-wrap">{notes}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
