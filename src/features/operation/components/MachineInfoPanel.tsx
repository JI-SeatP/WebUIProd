import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { OperationData } from "../hooks/useOperation";

interface MachineInfoPanelProps {
  operation: OperationData;
}

function InfoRow({ label, value, className }: { label: string; value: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex items-baseline gap-2 py-1", className)}>
      <span className="w-[100px] text-sm text-muted-foreground shrink-0">{label}</span>
      <span
        className="text-sm font-medium px-2 py-1 rounded block text-center flex-1"
        style={{ backgroundColor: "#F2F2F2" }}
      >
        {value ?? "—"}
      </span>
    </div>
  );
}

function DateField({ label, value, className }: { label: string; value: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <span className="text-xs text-muted-foreground uppercase tracking-wide">{label}</span>
      <span
        className="text-sm font-medium px-2 py-1 rounded text-center"
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

  const isCnc = operation.FMCODE?.toUpperCase().includes("CNC") ||
                operation.FMCODE?.toUpperCase().includes("SAND");

  // Notes field varies by machine family
  const getNotes = (): string => {
    if (operation.FMCODE?.includes("PRESS")) return String(op.PRESSAGE_NOTE ?? "");
    if (operation.FMCODE?.includes("PACK")) return String(op.EMBALLAGE_NOTE ?? "");
    if (isCnc) return ""; // CNC: TRNOTE shown as its own row below
    return String(op.PLACAGE_NOTE ?? op.TRNOTE ?? "");
  };

  const notes = getNotes();

  return (
    <Card className="h-full py-0 gap-0">
      <CardContent className="px-4 pt-3 pb-3">
        <div className="flex flex-col gap-2">
          {/* Top row: group/product type + notes */}
          <div className="flex gap-3">
            {/* Group + product type — type wraps to next row when card is narrow */}
            <div className="flex flex-wrap gap-4 min-w-0 flex-1">
              <DateField label={t("order.group")} value={operation.GROUPE} className="flex-1 min-w-[120px] max-w-[220px]" />
              {isCnc && (
                <DateField label={t("cnc.productType")} value={op.TYPEPRODUIT as string} className="flex-1 min-w-[120px] max-w-[220px]" />
              )}
            </div>

            {/* Notes (non-CNC, non-PRESS — PRESS notes are shown in the mold card) */}
            {notes && !operation.FMCODE?.includes("PRESS") && (
              <div className="flex-1 border-l pl-4 ml-2">
                <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                  {t("production.note")}
                </div>
                <p className="text-sm whitespace-pre-wrap">{notes}</p>
              </div>
            )}
          </div>

          {/* Bottom row: transac note spanning full width (CNC only) */}
          {isCnc && (
            <InfoRow label={t("cnc.transacNote")} value={op.TRNOTE as string} className="border-t pt-2" />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
