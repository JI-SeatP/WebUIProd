import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { StatusBadge, statusCodeToEnum } from "@/components/shared/StatusBadge";
import { cn, pressQtyDisplay, computeQteRestante } from "@/lib/utils";
import { useOrderOperations } from "../hooks/useOrderOperations";
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
        className="rounded-lg py-2.5 text-center min-w-[120px]"
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
  const navigate = useNavigate();
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const { operations } = useOrderOperations(operation.NO_PROD);

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
      <div className="grid gap-2 items-start" style={{ gridTemplateColumns: "80px 17px 10.8% 27.5% 7.2% auto 1fr" }}>
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
        <div className="flex items-start gap-[9px]">
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
          <Popover open={switcherOpen} onOpenChange={setSwitcherOpen}>
            <PopoverTrigger asChild>
              <div
                className="text-[1.15rem] font-medium px-3 py-1 rounded-lg bg-muted text-center cursor-pointer"
                role="button"
              >
                {loc(operation.OPERATION_P, operation.OPERATION_S) ?? "—"}
              </div>
            </PopoverTrigger>
            <PopoverContent className="w-[var(--radix-popper-anchor-width)] p-1" align="end" sideOffset={6}>
              {operations.length <= 1 ? (
                <div className="px-3 py-2 text-sm text-muted-foreground">
                  {t("operation.noOtherOperations", "No other operations")}
                </div>
              ) : (
                <div className="flex flex-col">
                  {operations.map((op) => {
                    const isCurrent = op.COPMACHINE === operation.COPMACHINE;
                    return (
                      <button
                        key={op.TRANSAC}
                        className={cn(
                          "flex flex-col items-start px-3 py-2 rounded-md text-left transition-colors",
                          isCurrent
                            ? "bg-muted font-semibold pointer-events-none"
                            : "hover:bg-accent hover:text-accent-foreground"
                        )}
                        onClick={() => {
                          setSwitcherOpen(false);
                          navigate(`/orders/${op.TRANSAC}/operation/${op.COPMACHINE ?? 0}`);
                        }}
                        disabled={isCurrent}
                      >
                        <span className="text-[1.15rem] font-medium leading-tight">
                          {loc(op.OPERATION_P, op.OPERATION_S)}
                        </span>
                        <span className="text-xs text-muted-foreground leading-tight mt-0.5">
                          {loc(op.MACHINE_P, op.MACHINE_S)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </PopoverContent>
          </Popover>

          <div className="text-[1.15rem] font-medium px-3 py-1 rounded-lg bg-muted text-center">
            {loc(operation.MACHINE_P, operation.MACHINE_S) ?? "—"}
          </div>
        </div>


      </div>
    </Card>
  );
}
