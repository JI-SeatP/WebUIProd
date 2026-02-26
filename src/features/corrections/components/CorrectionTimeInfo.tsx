import { useTranslation } from "react-i18next";
import { useSession } from "@/context/SessionContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { W_CORRECTIONS } from "@/constants/widths";
import type { CorrectionData } from "@/types/corrections";

interface CorrectionTimeInfoProps {
  data: CorrectionData;
}

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h${m.toString().padStart(2, "0")}`;
}

export function CorrectionTimeInfo({ data }: CorrectionTimeInfoProps) {
  const { t } = useTranslation();
  const { state } = useSession();
  const lang = state.language;

  const fields = [
    { label: t("timeTracking.startTime"), value: data.TJDEBUT },
    { label: t("timeTracking.endTime"), value: data.TJFIN },
    { label: t("timeTracking.duration"), value: formatDuration(data.TJDUREE) },
    { label: t("timeTracking.employee"), value: `${data.EMNOM} (${data.EMNOIDENT})` },
    { label: t("operation.machine"), value: `${data.MACODE} — ${lang === "fr" ? data.MACHINE_P : data.MACHINE_S}` },
    { label: t("operation.department"), value: data.DECODE },
  ];

  return (
    <Card>
      <CardHeader className="py-3 px-4">
        <CardTitle className="text-base">{t("corrections.productionTime")}</CardTitle>
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
