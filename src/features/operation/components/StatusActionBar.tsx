import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import {
  ArrowLeft,
  Wrench,
  Play,
  Pause,
  Square,
  SkipForward,
  AlertTriangle,
  RotateCcw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { statusCodeToEnum, type OperationStatus } from "@/components/shared/StatusBadge";
import { type StatusAction, useStatusChange } from "../hooks/useStatusChange";

interface StatusActionBarProps {
  transac: number;
  copmachine: number | null;
  statusCode: number;
}

interface ActionButton {
  action: StatusAction;
  icon: React.ReactNode;
  label: string;
  color: string;
  visible: boolean;
}

/** Determine which buttons are visible based on current status */
function getVisibleActions(status: OperationStatus, t: (key: string) => string): ActionButton[] {
  const notStarted = status === "READY";
  const inSetup = status === "SETUP";
  const inProd = status === "PROD";
  const paused = status === "PAUSE";
  const stopped = status === "STOP";

  return [
    {
      action: "SETUP",
      icon: <Wrench size={20} />,
      label: t("actions.setup"),
      color: "bg-purple-600 hover:bg-purple-700 text-white",
      visible: notStarted || stopped,
    },
    {
      action: "PROD",
      icon: <Play size={20} />,
      label: t("actions.start"),
      color: "bg-green-600 hover:bg-green-700 text-white",
      visible: notStarted || inSetup || paused || stopped,
    },
    {
      action: "PAUSE",
      icon: <Pause size={20} />,
      label: t("actions.pause"),
      color: "bg-amber-500 hover:bg-amber-600 text-white",
      visible: inProd || inSetup,
    },
    {
      action: "STOP",
      icon: <Square size={20} />,
      label: t("actions.stop"),
      color: "bg-red-600 hover:bg-red-700 text-white",
      visible: inProd || inSetup || paused,
    },
    {
      action: "COMP",
      icon: <SkipForward size={20} />,
      label: t("actions.complete"),
      color: "bg-blue-600 hover:bg-blue-700 text-white",
      visible: inProd || inSetup || paused,
    },
    {
      action: "ON_HOLD",
      icon: <AlertTriangle size={20} />,
      label: t("actions.hold"),
      color: "bg-orange-500 hover:bg-orange-600 text-white",
      visible: inProd || inSetup || paused,
    },
    {
      action: "RESET_READY",
      icon: <RotateCcw size={20} />,
      label: t("actions.resetReady"),
      color: "bg-slate-500 hover:bg-slate-600 text-white",
      visible: inSetup || stopped,
    },
  ];
}

export function StatusActionBar({ transac, copmachine, statusCode }: StatusActionBarProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const status = statusCodeToEnum(statusCode);
  const { loading, confirmAction, requestChange, cancelChange, executeChange } = useStatusChange(transac, copmachine);

  const actions = getVisibleActions(status, t);
  const visibleActions = actions.filter((a) => a.visible);

  const confirmLabels: Record<StatusAction, string> = {
    SETUP: t("actions.setup"),
    PROD: t("actions.start"),
    PAUSE: t("actions.pause"),
    STOP: t("actions.stop"),
    COMP: t("actions.complete"),
    ON_HOLD: t("actions.hold"),
    RESET_READY: t("actions.resetReady"),
  };

  return (
    <>
      <div className="flex items-center gap-3 px-3 py-2 border-t bg-background shrink-0">
        {/* Back button */}
        <Button
          variant="outline"
          className="touch-target gap-2 text-lg"
          onClick={() => navigate("/orders")}
        >
          <ArrowLeft size={20} />
          {t("actions.back")}
        </Button>

        <div className="flex-1" />

        {/* Status action buttons */}
        {visibleActions.map((action) => (
          <Button
            key={action.action}
            className={cn("touch-target gap-2 text-lg", action.color)}
            onClick={() => requestChange(action.action)}
            disabled={loading}
          >
            {action.icon}
            {action.label}
          </Button>
        ))}
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
