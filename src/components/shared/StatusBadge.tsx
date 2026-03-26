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
  { bg: string; text: string; border: string; labelKey: string }
> = {
  READY:   { bg: "bg-slate-100 dark:bg-slate-800",   text: "text-slate-700 dark:text-slate-300",   border: "border-slate-700 dark:border-slate-300",   labelKey: "status.ready" },
  SETUP:   { bg: "bg-purple-100 dark:bg-purple-900", text: "text-purple-700 dark:text-purple-300", border: "border-purple-700 dark:border-purple-300", labelKey: "status.setup" },
  PROD:    { bg: "bg-green-100 dark:bg-green-900",   text: "text-green-700 dark:text-green-300",   border: "border-green-700 dark:border-green-300",   labelKey: "status.production" },
  PAUSE:   { bg: "bg-amber-100 dark:bg-amber-900",   text: "text-amber-700 dark:text-amber-300",   border: "border-amber-700 dark:border-amber-300",   labelKey: "status.pause" },
  STOP:    { bg: "bg-red-100 dark:bg-red-900",       text: "text-red-700 dark:text-red-300",       border: "border-red-700 dark:border-red-300",       labelKey: "status.stopped" },
  COMP:    { bg: "bg-blue-100 dark:bg-blue-900",     text: "text-blue-700 dark:text-blue-300",     border: "border-blue-700 dark:border-blue-300",     labelKey: "status.completed" },
  ON_HOLD: { bg: "bg-orange-100 dark:bg-orange-900", text: "text-orange-700 dark:text-orange-300", border: "border-orange-700 dark:border-orange-300", labelKey: "status.onHold" },
  DONE:    { bg: "bg-emerald-100 dark:bg-emerald-900", text: "text-emerald-700 dark:text-emerald-300", border: "border-emerald-700 dark:border-emerald-300", labelKey: "status.done" },
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
        "text-sm font-medium no-select",
        config.bg,
        config.text,
        config.border,
        className
      )}
    >
      {t(config.labelKey)}
    </Badge>
  );
}

/** Map a status code from the DB to an OperationStatus string.
 *  Accepts both legacy numeric codes and the string codes the CF server returns. */
export function statusCodeToEnum(code: number | string): OperationStatus {
  // Numeric codes
  const numericMap: Record<number, OperationStatus> = {
    100: "READY",
    110: "SETUP",
    120: "PROD",
    123: "PAUSE",
    125: "STOP",
    126: "COMP",
    130: "ON_HOLD",
    200: "DONE",
  };

  if (typeof code === "number") return numericMap[code] ?? "READY";

  // String codes returned by ColdFusion (case-insensitive)
  const stringMap: Record<string, OperationStatus> = {
    ready:    "READY",
    pret:     "READY",
    prêt:     "READY",
    setup:    "SETUP",
    prod:     "PROD",
    production: "PROD",
    pause:    "PAUSE",
    break:    "PAUSE",
    stop:     "STOP",
    arrete:   "STOP",
    arrêté:   "STOP",
    comp:     "COMP",
    complete:  "COMP",
    completed: "COMP",
    complété:  "COMP",
    hold:     "ON_HOLD",
    on_hold:  "ON_HOLD",
    done:     "DONE",
  };

  return stringMap[String(code).toLowerCase()] ?? "READY";
}

/** Get row background color class for a status (used in work order table rows) */
export function statusRowColor(status: OperationStatus): string {
  const map: Record<OperationStatus, string> = {
    READY: "",
    SETUP: "bg-purple-100 dark:bg-purple-950/50",
    PROD: "bg-green-100 dark:bg-green-950/50",
    PAUSE: "bg-amber-100 dark:bg-amber-950/50",
    STOP: "bg-red-100 dark:bg-red-950/50",
    COMP: "bg-blue-100 dark:bg-blue-950/50",
    ON_HOLD: "bg-orange-100 dark:bg-orange-950/50",
    DONE: "bg-emerald-100 dark:bg-emerald-950/50",
  };
  return map[status] ?? "";
}
