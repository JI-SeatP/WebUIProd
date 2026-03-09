import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
import { StatusBadge, statusCodeToEnum } from "@/components/shared/StatusBadge";
import { cn, pressQtyDisplay, computeQteRestante } from "@/lib/utils";
import type { OperationData } from "../hooks/useOperation";

interface OperationHeaderProps {
  operation: OperationData;
  language: "fr" | "en";
}

function Field({ label, value, className }: { label: string; value: React.ReactNode; className?: string }) {
  return (
    <div className={cn("space-y-0.5", className)}>
      <div className="text-xs text-muted-foreground uppercase tracking-wide">{label}</div>
      <div className="text-[1.2rem] font-medium">{value ?? "—"}</div>
    </div>
  );
}

function QtyField({ 
  label, 
  value,
  textColor,
  backgroundColor 
}: { 
  label: string; 
  value: React.ReactNode;
  textColor?: string;
  backgroundColor?: string;
}) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="text-xs font-semibold uppercase tracking-wide" style={{ color: textColor || "inherit" }}>
        {label}
      </div>
      <div 
        className="rounded-lg px-6 py-2.5 text-center min-w-[80px]"
        style={{ backgroundColor: backgroundColor || "rgb(var(--color-secondary))" }}
      >
        <div className="text-2xl font-bold" style={{ color: textColor || "inherit" }}>
          {value ?? "—"}
        </div>
      </div>
    </div>
  );
}

export function OperationHeader({ operation, language }: OperationHeaderProps) {
  const { t } = useTranslation();

  const loc = (fr: string | null | undefined, en: string | null | undefined) =>
    (language === "fr" ? fr : en) ?? fr ?? "—";

  const status = statusCodeToEnum(operation.STATUT_CODE);

  const qtyLabel = operation.FMCODE?.includes("PRESS")
    ? t("order.qtyPressed")
    : operation.FMCODE?.includes("CNC")
    ? t("order.qtyMachined")
    : t("order.qtyProduced");

  return (
    <Card className="p-4 flex flex-col justify-start">
      <div className="grid gap-2 items-start" style={{ gridTemplateColumns: "80px 24px 12% 27.5% 8% 26% 1fr" }}>
        {/* Priority */}
        <div className="flex items-center justify-center h-full bg-muted rounded-lg">
          {(operation as unknown as Record<string, unknown>).DCPRIORITE != null ? (
            <span className="text-[1.95rem] font-bold text-blue-600">
              #{String((operation as unknown as Record<string, unknown>).DCPRIORITE)}
            </span>
          ) : null}
        </div>

        {/* Spacer */}
        <div />

        {/* Order */}
        <div className="space-y-1">
          <div className="text-xs text-muted-foreground uppercase tracking-wide">
            {t("order.title")}
          </div>
          <div className="text-2xl font-bold">{operation.NO_PROD}</div>
          <StatusBadge status={status} />
        </div>

        {/* Client + Product — share available width */}
        <div className="flex justify-evenly min-w-0">
          <div className="min-w-0 shrink-1">
            <Field label={t("order.client")} value={operation.NOM_CLIENT} />
            {operation.CONOPO && (
              <div className="text-sm text-muted-foreground mt-0.5">
                PO: {operation.CONOPO}
              </div>
            )}
          </div>

          <div className="min-w-0 shrink-1">
            <Field
              label={t("order.product")}
              value={
                <div>
                  <div>
                    {(operation as unknown as Record<string, unknown>).PRODUIT_CODE as string ?? "—"}
                    {operation.REVISION && (
                      <span className="text-xs text-muted-foreground ml-2">
                        Rev. {operation.REVISION}
                      </span>
                    )}
                  </div>
                  <div>{loc(operation.PRODUIT_P, operation.PRODUIT_S) || loc(operation.INVENTAIRE_P, operation.INVENTAIRE_S)}</div>
                </div>
              }
            />
          </div>
        </div>

        {/* Panel */}
        <div>
          {operation.Panneau && (
            <Field label={t("press.panel")} value={operation.Panneau} />
          )}
        </div>

        {/* Quantities */}
        <div className="flex items-start gap-[19px]">
          <QtyField
            label={t("order.qtyToMake")}
            value={pressQtyDisplay(operation.QTE_A_FAB, operation.DCQTE_A_PRESSER, operation.DCQTE_REJET, operation.FMCODE, operation.VBE_DCQTE_A_FAB)}
            backgroundColor="#F2F2F2"
          />
          <QtyField 
            label={qtyLabel} 
            value={operation.QTE_PRODUITE ?? 0}
            textColor="#008000"
            backgroundColor="#F2F2F2"
          />
          <QtyField
            label={t("order.qtyDefect")}
            value={operation.NOPQTESCRAP ?? 0}
            textColor="#BF0000"
            backgroundColor="#F2F2F2"
          />
          <QtyField
            label={t("order.qtyRemaining")}
            value={computeQteRestante(operation)}
            backgroundColor="#FFF88E"
          />
        </div>

        {/* Operation / Machine */}
        <div className="space-y-1.5">
          <div className="text-[1.15rem] font-medium px-3 py-1 rounded-lg bg-muted text-center">
            {loc(operation.OPERATION_P, operation.OPERATION_S) ?? "—"}
          </div>
          <div className="text-[1.15rem] font-medium px-3 py-1 rounded-lg bg-muted text-center">
            {loc(operation.MACHINE_P, operation.MACHINE_S) ?? "—"}
          </div>
        </div>


      </div>
    </Card>
  );
}
