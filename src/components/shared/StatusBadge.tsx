import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

export type OperationStatus =
  | "READY"
  | "SETUP"
  | "PROD"
  | "PAUSE"
  | "STOP"
  | "COMP"
  | "ON_HOLD"
  | "DONE";

const statusConfig: Record<
  OperationStatus,
  { bg: string; text: string; labelKey: string }
> = {
  READY: { bg: "bg-slate-100 dark:bg-slate-800", text: "text-slate-700 dark:text-slate-300", labelKey: "status.ready" },
  SETUP: { bg: "bg-purple-100 dark:bg-purple-900", text: "text-purple-700 dark:text-purple-300", labelKey: "status.setup" },
  PROD: { bg: "bg-green-100 dark:bg-green-900", text: "text-green-700 dark:text-green-300", labelKey: "status.production" },
  PAUSE: { bg: "bg-amber-100 dark:bg-amber-900", text: "text-amber-700 dark:text-amber-300", labelKey: "status.pause" },
  STOP: { bg: "bg-red-100 dark:bg-red-900", text: "text-red-700 dark:text-red-300", labelKey: "status.stopped" },
  COMP: { bg: "bg-blue-100 dark:bg-blue-900", text: "text-blue-700 dark:text-blue-300", labelKey: "status.completed" },
  ON_HOLD: { bg: "bg-orange-100 dark:bg-orange-900", text: "text-orange-700 dark:text-orange-300", labelKey: "status.onHold" },
  DONE: { bg: "bg-emerald-100 dark:bg-emerald-900", text: "text-emerald-700 dark:text-emerald-300", labelKey: "status.done" },
};

interface StatusBadgeProps {
  status: OperationStatus;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const { t } = useTranslation();
  const config = statusConfig[status] ?? statusConfig.READY;

  return (
    <Badge
      variant="outline"
      className={cn(
        "text-sm font-medium border-0 no-select",
        config.bg,
        config.text,
        className
      )}
    >
      {t(config.labelKey)}
    </Badge>
  );
}

/** Map a numeric status code from the DB to an OperationStatus string */
export function statusCodeToEnum(code: number): OperationStatus {
  // Status codes based on legacy STATUT_CODE values
  const map: Record<number, OperationStatus> = {
    100: "READY",
    110: "SETUP",
    120: "PROD",
    123: "PAUSE",
    125: "STOP",
    126: "COMP",
    130: "ON_HOLD",
    200: "DONE",
  };
  return map[code] ?? "READY";
}

/** Get row background color class for a status (used in work order table rows) */
export function statusRowColor(status: OperationStatus): string {
  const map: Record<OperationStatus, string> = {
    READY: "",
    SETUP: "bg-purple-50 dark:bg-purple-950/30",
    PROD: "bg-green-50 dark:bg-green-950/30",
    PAUSE: "bg-amber-50 dark:bg-amber-950/30",
    STOP: "bg-red-50 dark:bg-red-950/30",
    COMP: "bg-blue-50 dark:bg-blue-950/30",
    ON_HOLD: "bg-orange-50 dark:bg-orange-950/30",
    DONE: "bg-emerald-50 dark:bg-emerald-950/30",
  };
  return map[status] ?? "";
}
