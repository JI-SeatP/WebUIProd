import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
import { StatusBadge, statusCodeToEnum } from "@/components/shared/StatusBadge";
import { cn } from "@/lib/utils";
import type { OperationData } from "../hooks/useOperation";

interface OperationHeaderProps {
  operation: OperationData;
  language: "fr" | "en";
}

function Field({ label, value, className }: { label: string; value: React.ReactNode; className?: string }) {
  return (
    <div className={cn("space-y-0.5", className)}>
      <div className="text-xs text-muted-foreground uppercase tracking-wide">{label}</div>
      <div className="text-base font-medium">{value ?? "—"}</div>
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
    <Card className="p-4">
      <div className="grid grid-cols-12 gap-4">
        {/* Order */}
        <div className="col-span-2 space-y-1">
          <div className="text-xs text-muted-foreground uppercase tracking-wide">
            {t("order.title")}
          </div>
          <div className="text-2xl font-bold">{operation.NO_PROD}</div>
        </div>

        {/* Client */}
        <div className="col-span-2">
          <Field label={t("order.client")} value={operation.NOM_CLIENT} />
          {operation.CONOPO && (
            <div className="text-xs text-muted-foreground mt-0.5">
              PO: {operation.CONOPO}
            </div>
          )}
        </div>

        {/* Product */}
        <div className="col-span-3">
          <Field
            label={t("order.product")}
            value={
              <div>
                <div>{loc(operation.PRODUIT_P, operation.PRODUIT_S) || loc(operation.INVENTAIRE_P, operation.INVENTAIRE_S)}</div>
                {operation.REVISION && (
                  <span className="text-xs text-muted-foreground">
                    Rev. {operation.REVISION}
                  </span>
                )}
              </div>
            }
          />
          {operation.Panneau && (
            <Field label={t("press.panel")} value={operation.Panneau} className="mt-2" />
          )}
        </div>

        {/* Quantities */}
        <div className="col-span-2 space-y-1">
          <Field label={t("order.qtyToMake")} value={operation.QTE_A_FAB} />
          <Field label={qtyLabel} value={operation.QTE_PRODUITE ?? 0} />
          <Field
            label={t("order.qtyRemaining")}
            value={
              <span className="font-bold">{operation.QTE_RESTANTE ?? "—"}</span>
            }
          />
        </div>

        {/* Operation / Machine */}
        <div className="col-span-2">
          <Field
            label={t("operation.title")}
            value={loc(operation.OPERATION_P, operation.OPERATION_S)}
          />
          <Field
            label={t("operation.machine")}
            value={loc(operation.MACHINE_P, operation.MACHINE_S)}
            className="mt-2"
          />
        </div>

        {/* Status */}
        <div className="col-span-1 flex items-start justify-end">
          <StatusBadge status={status} />
        </div>
      </div>
    </Card>
  );
}
