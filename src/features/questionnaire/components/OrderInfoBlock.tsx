import { useTranslation } from "react-i18next";
import { ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge, statusCodeToEnum } from "@/components/shared/StatusBadge";
import { pressQtyDisplay } from "@/lib/utils";
import type { OperationStatus } from "@/components/shared/StatusBadge";
import type { OperationData } from "@/features/operation/hooks/useOperation";

interface OrderInfoBlockProps {
  operation: OperationData;
  language: string;
  label?: string;
  theme?: "modern" | "minimal" | "dense";
  targetStatus?: OperationStatus;
  /** The status BEFORE the change (e.g. "PROD", "SETUP", "PAUSE") — passed via URL param */
  fromStatus?: string;
}

export function OrderInfoBlock({ operation, language, label, theme = "modern", targetStatus, fromStatus }: OrderInfoBlockProps) {
  const { t } = useTranslation();
  const isFr = language === "fr";

  const fmcode = (operation.FMCODE ?? "").toUpperCase();
  const isPress = fmcode.includes("PRESS");
  const isCnc = fmcode.includes("CNC") || fmcode.includes("SAND");

  const machine = `${operation.MACODE} — ${isFr ? operation.MACHINE_P : operation.MACHINE_S}`;
  const product = isFr ? operation.PRODUIT_P : operation.PRODUIT_S ?? operation.PRODUIT_P;

  const showPanelBig = isPress && !!operation.Panneau;
  const showProductBig = isCnc;

  return (
    <div className="flex flex-col gap-1">
      {/* Pill label — sits above the card */}
      {label && (
        <div className="flex justify-center">
          <span className="text-[0.975rem] font-semibold text-muted-foreground bg-gray-100 rounded-full px-5 py-1">{label}</span>
        </div>
      )}

    <Card className={`!pt-5 !pb-3 ${theme === "dense" ? "border border-gray-200" : ""}`}>

      {/* Body: everything else */}
      <CardContent className="pt-0.5 pb-2 px-3">
        <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <div className="flex items-start justify-between w-full px-4">
            {/* Work Order — always big */}
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground uppercase tracking-wide">{t("order.number")}</span>
              <span className="text-[1.8rem] font-bold leading-none">{operation.NO_PROD}</span>
              {targetStatus ? (
                <div className="flex items-center gap-1.5">
                  {/* Left pill = previous status (before the change), passed via URL fromStatus param */}
                  <StatusBadge status={fromStatus ? statusCodeToEnum(fromStatus) : "production"} />
                  <ArrowRight className="size-4 text-muted-foreground shrink-0" />
                  <StatusBadge status={targetStatus} />
                </div>
              ) : (
                <StatusBadge status={statusCodeToEnum(operation.STATUT_CODE)} />
              )}
            </div>

            {/* Machine — always big */}
            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground uppercase tracking-wide">{t("operation.machine")}</span>
              <span className="text-[1.6rem] text-muted-foreground leading-none">{machine}</span>
            </div>

            {/* Panel — big for PRESS */}
            {showPanelBig && (
              <div className="flex flex-col">
                <span className="text-xs text-muted-foreground uppercase tracking-wide">{t("press.panel")}</span>
                <span className="text-[1.6rem] font-bold leading-none">{operation.Panneau}</span>
              </div>
            )}

            {/* Product — big for CNC */}
            {showProductBig && (
              <div className="flex flex-col">
                <span className="text-xs text-muted-foreground uppercase tracking-wide">{t("order.product")}</span>
                <span className="text-[1.6rem] font-bold leading-none">{product ?? "—"}</span>
              </div>
            )}

            {/* Secondary info: Client + small fields */}
            <div className="flex flex-col gap-1 text-base">
              <div className="flex items-center gap-1">
                <span className="text-muted-foreground shrink-0">{t("order.client")}:</span>
                <span className="font-medium">{operation.NOM_CLIENT ?? "—"}</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  <span className="text-muted-foreground shrink-0">{t("order.clientPO")}:</span>
                  <span className="font-medium">{operation.CONOPO ?? "—"}</span>
                </div>
                {!showProductBig && !isPress && (
                  <div className="flex items-center gap-1">
                    <span className="text-muted-foreground shrink-0">{t("order.product")}:</span>
                    <span className="font-medium">{product ?? "—"}</span>
                  </div>
                )}
                {!showPanelBig && operation.Panneau && (
                  <div className="flex items-center gap-1">
                    <span className="text-muted-foreground shrink-0">{t("press.panel")}:</span>
                    <span className="font-medium">{operation.Panneau}</span>
                  </div>
                )}
              </div>
              {isPress && (
                <div className="flex items-center gap-1">
                  <span className="text-muted-foreground shrink-0">{t("order.product")}:</span>
                  <span className="font-medium">
                    {product ?? "—"}
                    {operation.PRODUIT_CODE && (
                      <span className="text-muted-foreground font-normal"> ({operation.PRODUIT_CODE})</span>
                    )}
                  </span>
                </div>
              )}
            </div>

            {/* Quantity boxes */}
            <div className="flex items-start gap-4">
              <div className="flex flex-col items-center gap-1">
                <div className="text-xs font-semibold uppercase tracking-wide">{t("order.qtyToMake")}</div>
                <div className="rounded-lg px-6 py-2.5 text-center min-w-[80px]" style={{ backgroundColor: "#F2F2F2" }}>
                  <div className="text-2xl font-bold">{pressQtyDisplay(operation.QTE_A_FAB, operation.DCQTE_A_PRESSER, operation.DCQTE_REJET, operation.FMCODE, undefined, operation.PCS_PER_PANEL)}</div>
                </div>
              </div>
              <div className="flex flex-col items-center gap-1">
                <div className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#008000" }}>{t("order.qtyProduced")}</div>
                <div className="rounded-lg px-6 py-2.5 text-center min-w-[80px]" style={{ backgroundColor: "#F2F2F2" }}>
                  <div className="text-2xl font-bold" style={{ color: "#008000" }}>{operation.QTE_PRODUITE ?? "—"}</div>
                </div>
              </div>
              <div className="flex flex-col items-center gap-1">
                <div className="text-xs font-semibold uppercase tracking-wide">{t("order.qtyRemaining")}</div>
                <div className="rounded-lg px-6 py-2.5 text-center min-w-[80px]" style={{ backgroundColor: "#FFF88E" }}>
                  <div className="text-2xl font-bold">{operation.QTE_RESTANTE ?? "—"}</div>
                </div>
              </div>
              <div className="flex flex-col items-center gap-1">
                <div className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#BF0000" }}>{t("order.qtyDefect")}</div>
                <div className="rounded-lg px-6 py-2.5 text-center min-w-[80px]" style={{ backgroundColor: "#F2F2F2" }}>
                  <div className="text-2xl font-bold" style={{ color: "#BF0000" }}>{operation.QTY_REQ ?? "—"}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        </div>
      </CardContent>
    </Card>
    </div>
  );
}
