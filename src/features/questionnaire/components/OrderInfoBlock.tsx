import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge, statusCodeToEnum } from "@/components/shared/StatusBadge";
import type { OperationData } from "@/features/operation/hooks/useOperation";

interface OrderInfoBlockProps {
  operation: OperationData;
  language: string;
}

export function OrderInfoBlock({ operation, language }: OrderInfoBlockProps) {
  const { t } = useTranslation();
  const isFr = language === "fr";

  const fields = [
    { label: t("order.number"), value: String(operation.TRANSAC) },
    { label: t("order.client"), value: operation.NOM_CLIENT },
    { label: t("order.clientPO"), value: operation.CONOPO ?? "—" },
    {
      label: t("order.product"),
      value: isFr ? operation.PRODUIT_P : operation.PRODUIT_S ?? operation.PRODUIT_P,
    },
    {
      label: t("operation.machine"),
      value: `${operation.MACODE} — ${isFr ? operation.MACHINE_P : operation.MACHINE_S}`,
    },
  ];

  return (
    <Card>
      <CardContent className="py-3 px-4">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          {fields.map((f) => (
            <div key={f.label} className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">{f.label}:</span>
              <span className="text-sm font-medium">{f.value ?? "—"}</span>
            </div>
          ))}
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">{t("operation.status")}:</span>
            <StatusBadge status={statusCodeToEnum(operation.STATUT_CODE)} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
