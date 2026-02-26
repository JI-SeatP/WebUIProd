import { useTranslation } from "react-i18next";
import { useSession } from "@/context/SessionContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { W_CORRECTIONS } from "@/constants/widths";
import type { CorrectionData } from "@/types/corrections";

interface CorrectionOrderInfoProps {
  data: CorrectionData;
}

export function CorrectionOrderInfo({ data }: CorrectionOrderInfoProps) {
  const { t } = useTranslation();
  const { state } = useSession();
  const lang = state.language;

  const fields = [
    { label: t("order.number"), value: data.NO_PROD },
    { label: t("order.client"), value: data.NOM_CLIENT },
    { label: t("order.product"), value: lang === "fr" ? data.PRODUIT_P : data.PRODUIT_S },
  ];

  return (
    <Card>
      <CardHeader className="py-3 px-4">
        <CardTitle className="text-base">{t("corrections.orderInfo")}</CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-3">
        <div className="grid gap-2">
          {fields.map((f) => (
            <div key={f.label} className="flex items-center gap-2">
              <span className={`${W_CORRECTIONS.label} text-sm text-muted-foreground shrink-0`}>
                {f.label}:
              </span>
              <span className="text-base font-medium">{f.value}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
