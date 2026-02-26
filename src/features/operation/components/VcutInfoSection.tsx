import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { OperationData } from "../hooks/useOperation";

interface VcutInfoSectionProps {
  operation: OperationData;
  language: "fr" | "en";
}

export function VcutInfoSection({ operation, language }: VcutInfoSectionProps) {
  const { t } = useTranslation();

  const loc = (fr: string | null | undefined, en: string | null | undefined) =>
    (language === "fr" ? fr : en) ?? fr ?? "—";

  return (
    <div className="space-y-3">
      {/* Big Sheet Info */}
      <Card className="py-0 gap-0">
        <CardHeader className="py-2 px-4">
          <CardTitle className="text-[0.8rem]">
            {loc("Grande feuille", "Big Sheet")}
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-3 space-y-2">
          <div className="flex items-baseline gap-4">
            <span className="text-sm text-muted-foreground">{t("order.quantity")}:</span>
            <span className="text-lg font-bold tabular-nums">{operation.QTE_A_FAB}</span>
          </div>
          <div className="flex items-baseline gap-4">
            <span className="text-sm text-muted-foreground">{t("production.description")}:</span>
            <span className="text-sm">
              {loc(operation.INVENTAIRE_P, operation.INVENTAIRE_S)}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Products Table placeholder */}
      <Card className="py-0 gap-0">
        <CardHeader className="py-2 px-4">
          <CardTitle className="text-[0.8rem]">{t("order.product")}</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-3">
          {operation.PRODUIT_CODE ? (
            <div className="space-y-1">
              <div className="flex gap-4">
                <span className="text-sm text-muted-foreground w-[100px]">Code:</span>
                <span className="text-sm font-medium">{operation.PRODUIT_CODE}</span>
              </div>
              <div className="flex gap-4">
                <span className="text-sm text-muted-foreground w-[100px]">{t("production.description")}:</span>
                <span className="text-sm">{loc(operation.PRODUIT_P, operation.PRODUIT_S)}</span>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{t("common.noResults")}</p>
          )}
        </CardContent>
      </Card>

      {/* Containers Table placeholder */}
      <Card className="py-0 gap-0">
        <CardHeader className="py-2 px-4">
          <CardTitle className="text-[0.8rem]">{t("inventory.container")}</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-3 text-sm text-muted-foreground">
          Container/SKID data will be loaded from operation details.
        </CardContent>
      </Card>
    </div>
  );
}
