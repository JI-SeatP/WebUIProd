import { useTranslation } from "react-i18next";
import { useSession } from "@/context/SessionContext";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge, statusCodeToEnum } from "@/components/shared/StatusBadge";
import type { CorrectionData } from "@/types/corrections";

interface CorrectionOrderInfoProps {
  data: CorrectionData;
}

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h${m.toString().padStart(2, "0")}`;
}

export function CorrectionOrderInfo({ data }: CorrectionOrderInfoProps) {
  const { t } = useTranslation();
  const { state } = useSession();
  const lang = state.language;

  const machine = `${data.MACODE} — ${lang === "fr" ? data.MACHINE_P : data.MACHINE_S}`;
  const product = lang === "fr" ? data.PRODUIT_P : data.PRODUIT_S;

  return (
    <div className="flex flex-col gap-1">
      {/* Pill label */}
      <div className="flex justify-center">
        <span className="text-[0.975rem] font-semibold text-muted-foreground bg-gray-100 rounded-full px-5 py-1">
          {t("corrections.title")}
        </span>
      </div>

      <Card className="!pt-5 !pb-3">
        <CardContent className="pt-0.5 pb-2 px-3">
          <div className="flex items-start justify-between w-full px-4">
            {/* Work Order */}
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground uppercase tracking-wide">{t("order.number")}</span>
              <span className="text-[1.8rem] font-bold leading-none">{data.NO_PROD}</span>
              <StatusBadge status={statusCodeToEnum(data.MODEPROD_MPCODE)} />
            </div>

            {/* Machine */}
            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground uppercase tracking-wide">{t("operation.machine")}</span>
              <span className="text-[1.6rem] text-muted-foreground leading-none">{machine}</span>
            </div>

            {/* Secondary info */}
            <div className="flex flex-col gap-1 text-base">
              <div className="flex items-center gap-1">
                <span className="text-muted-foreground shrink-0">{t("order.client")}:</span>
                <span className="font-medium">{data.NOM_CLIENT || "—"}</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-muted-foreground shrink-0">{t("order.product")}:</span>
                <span className="font-medium">{product || "—"}</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-muted-foreground shrink-0">{t("timeTracking.employee")}:</span>
                <span className="font-medium">{data.EMNOM} ({data.EMNOIDENT})</span>
              </div>
            </div>

            {/* Time info boxes */}
            <div className="flex items-start gap-4">
              <div className="flex flex-col items-center gap-1">
                <div className="text-xs font-semibold uppercase tracking-wide">{t("timeTracking.startTime")}</div>
                <div className="rounded-lg px-4 py-2.5 text-center min-w-[80px]" style={{ backgroundColor: "#F2F2F2" }}>
                  <div className="text-lg font-bold">{data.TJDEBUT}</div>
                </div>
              </div>
              <div className="flex flex-col items-center gap-1">
                <div className="text-xs font-semibold uppercase tracking-wide">{t("timeTracking.endTime")}</div>
                <div className="rounded-lg px-4 py-2.5 text-center min-w-[80px]" style={{ backgroundColor: "#F2F2F2" }}>
                  <div className="text-lg font-bold">{data.TJFIN}</div>
                </div>
              </div>
              <div className="flex flex-col items-center gap-1">
                <div className="text-xs font-semibold uppercase tracking-wide">{t("timeTracking.duration")}</div>
                <div className="rounded-lg px-4 py-2.5 text-center min-w-[80px]" style={{ backgroundColor: "#FFF88E" }}>
                  <div className="text-lg font-bold">{formatDuration(data.TJDUREE)}</div>
                </div>
              </div>
              <div className="flex flex-col items-center gap-1">
                <div className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#008000" }}>{t("timeTracking.qtyGood")}</div>
                <div className="rounded-lg px-4 py-2.5 text-center min-w-[80px]" style={{ backgroundColor: "#F2F2F2" }}>
                  <div className="text-2xl font-bold" style={{ color: "#008000" }}>{data.QTE_BONNE}</div>
                </div>
              </div>
              <div className="flex flex-col items-center gap-1">
                <div className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#BF0000" }}>{t("timeTracking.qtyDefect")}</div>
                <div className="rounded-lg px-4 py-2.5 text-center min-w-[80px]" style={{ backgroundColor: "#F2F2F2" }}>
                  <div className="text-2xl font-bold" style={{ color: "#BF0000" }}>{data.QTE_DEFAUT}</div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
