import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, Circle } from "lucide-react";
import { cn } from "@/lib/utils";
import { W_MOLD_INFO } from "@/constants/widths";
import type { OperationData } from "../hooks/useOperation";

interface PressInfoSectionProps {
  operation: OperationData;
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline gap-2 py-1">
      <span className={cn(W_MOLD_INFO.label, "text-sm text-muted-foreground shrink-0")}>{label}</span>
      <span className={cn(W_MOLD_INFO.value, "text-sm font-medium")}>{value ?? "—"}</span>
    </div>
  );
}

function ReadyCheck({ ready, label }: { ready: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2 py-1">
      {ready ? (
        <CheckCircle size={20} className="text-green-500" />
      ) : (
        <Circle size={20} className="text-muted-foreground" />
      )}
      <span className="text-sm">{label}</span>
    </div>
  );
}

export function PressInfoSection({ operation }: PressInfoSectionProps) {
  const { t } = useTranslation();

  // These fields come from the extended operation data
  // In mock mode they may be undefined — show placeholders
  const op = operation as Record<string, unknown>;

  return (
    <div className="space-y-3">
      {/* Materials Ready */}
      <Card>
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-base">{t("press.materialsReady")}</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-3 space-y-1">
          <ReadyCheck
            ready={!!op.MATERIEL_EN_PLACE}
            label={t("material.rawMaterial")}
          />
          <ReadyCheck
            ready={!!op.MOULE_EN_PLACE}
            label={t("press.mold")}
          />
        </CardContent>
      </Card>

      {/* Mold Info */}
      <Card>
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-base">{t("press.mold")}</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-3">
          <InfoRow label={t("press.moldCode")} value={operation.MOULE_CODE} />
          <InfoRow label={t("press.moldType")} value={op.MOULE_TYPE as string} />
          <InfoRow label={t("press.piecesPerCavity")} value={op.PANNEAU_CAVITE as string} />
          <InfoRow label={t("press.gap")} value={op.MOULE_ECART as string} />
          <InfoRow label={t("press.thickness")} value={op.EPAISSEUR as string} />
          <InfoRow label={t("press.cookTime")} value={op.PRESSAGE_PRESSAGE as string} />
          <InfoRow label={t("press.coolTime")} value={op.PRESSAGE_TEST_APRES as string} />
        </CardContent>
      </Card>
    </div>
  );
}
