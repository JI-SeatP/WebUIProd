import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, Circle } from "lucide-react";
import { cn } from "@/lib/utils";
import { W_PRESS_SECTION } from "@/constants/widths";
import type { OperationData } from "../hooks/useOperation";

interface PressInfoSectionProps {
  operation: OperationData;
}

function MoldField({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="space-y-0.5">
      <div className="text-xs text-muted-foreground uppercase tracking-wide">{label}</div>
      <div className="text-sm font-medium">{value ?? "—"}</div>
    </div>
  );
}

function MoldQtyField({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="space-y-0.5">
      <div className="text-xs text-muted-foreground uppercase tracking-wide">{label}</div>
      <div className="rounded-lg bg-muted px-3 py-1 text-sm font-medium text-center">{value ?? "—"}</div>
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
      {/* Top row: Materials Ready + Machine Info + Mold Info */}
      <div className="flex gap-3">
        {/* Materials Ready */}
        <Card className={cn(W_PRESS_SECTION.materialsCard, "py-0 gap-0")}>
          <CardHeader className="py-2 px-4">
            <CardTitle className="text-[0.8rem]">{t("press.materialsReady")}</CardTitle>
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
        <Card className={cn(W_PRESS_SECTION.moldCard, "py-0 gap-0")}>
          <CardContent className="px-4 pt-3 pb-3">
            <div className="grid grid-cols-[29%_27%_22%_22%]">
              {/* Col 1: Code + Type */}
              <div className="space-y-2 min-w-0">
                <div className="space-y-0.5">
                  <div className="text-xs text-muted-foreground uppercase tracking-wide">{t("press.moldCode")}</div>
                  <div className="text-[1.3rem] font-bold leading-tight">{operation.MOULE_CODE ?? "—"}</div>
                </div>
                <MoldField label={t("press.moldType")} value={op.MOULE_TYPE as string} />
              </div>

              {/* Col 2: Pieces/Cavity + Cavities/Mold */}
              <div className="space-y-2 min-w-0">
                <MoldQtyField label={t("press.piecesPerCavity")} value={op.PANNEAU_CAVITE as string} />
                <MoldQtyField label={t("press.cavitiesPerMold")} value={op.MOULE_CAVITE as string} />
              </div>

              {/* Col 3: Gap */}
              <div className="space-y-2 min-w-0">
                <MoldField label={t("press.gap")} value={op.MOULE_ECART as string} />
              </div>

              {/* Col 4: Times */}
              <div className="space-y-2 min-w-0">
                <MoldField label={t("press.cookTime")} value={op.PRESSAGE_PRESSAGE as string} />
                <MoldField label={t("press.coolTime")} value={op.PRESSAGE_TEST_APRES as string} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
