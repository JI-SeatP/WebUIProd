import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { OperationData } from "../hooks/useOperation";

interface MachineInfoPanelProps {
  operation: OperationData;
}

function InfoRow({ label, value, className }: { label: string; value: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex items-baseline gap-2 py-1.5", className)}>
      <span className="w-[120px] text-sm text-muted-foreground shrink-0">{label}</span>
      <span className="text-sm font-medium">{value ?? "—"}</span>
    </div>
  );
}

function DateField({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-muted-foreground uppercase tracking-wide">{label}</span>
      <span
        className="text-sm font-medium px-2 py-1 rounded"
        style={{ backgroundColor: "#F2F2F2" }}
      >
        {value ?? "—"}
      </span>
    </div>
  );
}

export function MachineInfoPanel({ operation }: MachineInfoPanelProps) {
  const { t } = useTranslation();
  const op = operation as unknown as Record<string, unknown>;

  // Notes field varies by machine family
  const getNotes = (): string => {
    if (operation.FMCODE?.includes("PRESS")) return String(op.PRESSAGE_NOTE ?? "");
    if (operation.FMCODE?.includes("PACK")) return String(op.EMBALLAGE_NOTE ?? "");
    return String(op.PLACAGE_NOTE ?? op.TRNOTE ?? "");
  };

  const notes = getNotes();

  return (
    <Card className="h-full py-0 gap-0">
      <CardContent className="px-4 pt-3 pb-3 space-y-3">
        {/* Dates — side by side */}
        <div className="flex gap-4">
          <DateField
            label={t("dates.scheduledStart")}
            value={operation.DATE_DEBUT_PREVU ?? "—"}
          />
          <DateField
            label={t("dates.scheduledEnd")}
            value={operation.DATE_FIN_PREVU ?? "—"}
          />
        </div>

        {/* Group */}
        <InfoRow label={t("order.group")} value={operation.GROUPE} />

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
