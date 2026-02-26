import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import {
  Wrench,
  Play,
  Pause,
  Square,
  SkipForward,
  AlertTriangle,
  ChevronUp,
} from "lucide-react";
import { statusCodeToEnum, type OperationStatus } from "@/components/shared/StatusBadge";
import { type StatusAction, useStatusChange } from "../hooks/useStatusChange";

interface StatusActionBarProps {
  transac: number;
  copmachine: number | null;
  statusCode: number;
}

interface ActionItem {
  action: StatusAction;
  icon: React.ReactNode;
  label: string;
  bgColor: string;
  active: boolean;
}

/** All actions always shown; only `active` ones are clickable and colored */
function getAllActions(status: OperationStatus, t: (key: string) => string): ActionItem[] {
  const notStarted = status === "READY";
  const inSetup    = status === "SETUP";
  const inProd     = status === "PROD";
  const paused     = status === "PAUSE";
  const stopped    = status === "STOP";

  return [
    {
      action: "SETUP",
      icon: <Wrench size={18} />,
      label: t("actions.setup"),
      bgColor: "#9333ea",
      active: notStarted || stopped,
    },
    {
      action: "PROD",
      icon: <Play size={18} />,
      label: t("actions.start"),
      bgColor: "#16a34a",
      active: inSetup || paused || stopped,
    },
    {
      action: "PAUSE",
      icon: <Pause size={18} />,
      label: t("actions.pause"),
      bgColor: "#d97706",
      active: inProd,
    },
    {
      action: "STOP",
      icon: <Square size={18} />,
      label: t("actions.stop"),
      bgColor: "#dc2626",
      active: inProd,
    },
    {
      action: "ON_HOLD",
      icon: <AlertTriangle size={18} />,
      label: t("actions.hold"),
      bgColor: "#ea580c",
      active: inProd,
    },
    {
      action: "COMP",
      icon: <SkipForward size={18} />,
      label: t("actions.complete"),
      bgColor: "#2563eb",
      active: inProd,
    },
  ];
}

const STATUS_DISPLAY: Record<OperationStatus, { labelKey: string; bgColor: string; textColor?: string }> = {
  READY:   { labelKey: "status.ready",      bgColor: "#dbeafe", textColor: "#1d4ed8" },
  SETUP:   { labelKey: "status.setup",      bgColor: "#9333ea" },
  PROD:    { labelKey: "status.production", bgColor: "#16a34a" },
  PAUSE:   { labelKey: "status.pause",      bgColor: "#d97706" },
  STOP:    { labelKey: "status.stopped",    bgColor: "#dc2626" },
  COMP:    { labelKey: "status.completed",  bgColor: "#2563eb" },
  ON_HOLD: { labelKey: "status.onHold",     bgColor: "#ea580c" },
  DONE:    { labelKey: "status.done",       bgColor: "#059669" },
};

export function StatusActionBar({ transac, copmachine, statusCode }: StatusActionBarProps) {
  const { t } = useTranslation();
  const status = statusCodeToEnum(statusCode);
  const { loading, confirmAction, requestChange, cancelChange, executeChange } = useStatusChange(transac, copmachine);

  const actions = getAllActions(status, t);

  const confirmLabels: Record<StatusAction, string> = {
    SETUP:       t("actions.setup"),
    PROD:        t("actions.start"),
    PAUSE:       t("actions.pause"),
    STOP:        t("actions.stop"),
    COMP:        t("actions.complete"),
    ON_HOLD:     t("actions.hold"),
    RESET_READY: t("actions.resetReady"),
  };

  return (
    <>
      {/* Floating action panel — fixed bottom-center */}
      <div
        className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 w-[250px] rounded-3xl px-4 py-3 flex flex-col gap-2 backdrop-blur border border-white/20"
        style={{ backgroundColor: "rgba(64, 75, 79, 0.65)", boxShadow: "0 8px 10px rgba(0,0,0,0.5)" }}
      >
        {/* Actions dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              className="w-full touch-target text-base gap-2 border-2 font-semibold"
              style={{
                backgroundColor: STATUS_DISPLAY[status].bgColor,
                borderColor: STATUS_DISPLAY[status].textColor ? "rgba(29,78,216,0.3)" : "rgba(255,255,255,0.4)",
                color: STATUS_DISPLAY[status].textColor ?? "#ffffff",
              }}
              disabled={loading}
            >
              <ChevronUp size={18} />
              {t(STATUS_DISPLAY[status].labelKey)}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            side="top"
            align="start"
            className="w-[220px] p-1"
          >
            {actions.map((action) => (
              <DropdownMenuItem
                key={action.action}
                onClick={() => action.active && requestChange(action.action)}
                className="gap-3 text-base py-3 px-4 rounded-md mb-0.5 last:mb-0 font-medium border-2"
                style={
                  action.active
                    ? { backgroundColor: action.bgColor, color: "#ffffff", borderColor: "rgba(255,255,255,0.6)", cursor: "pointer" }
                    : { backgroundColor: "#f3f4f6", color: "#374151", borderColor: "#e5e7eb", cursor: "not-allowed", opacity: 0.7 }
                }
              >
                <span
                  className="shrink-0"
                  style={action.active ? undefined : { opacity: 0.4 }}
                >
                  {action.icon}
                </span>
                <span>{action.label}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

      </div>

      {/* Confirm dialog */}
      <ConfirmDialog
        open={!!confirmAction}
        onOpenChange={(open) => !open && cancelChange()}
        title={t("dialogs.confirmation")}
        description={`${confirmAction ? confirmLabels[confirmAction] : ""} — ${t("order.title")} ${transac}?`}
        onConfirm={executeChange}
        variant={confirmAction === "STOP" ? "destructive" : "default"}
      />
    </>
  );
}
