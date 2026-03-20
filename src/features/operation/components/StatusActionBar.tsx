import React from "react";
import { useTranslation, Trans } from "react-i18next";
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
import { W_STATUS_ACTION_BAR } from "@/constants/widths";
import { cn } from "@/lib/utils";

interface StatusActionBarProps {
  transac: number;
  copmachine: number | null;
  statusCode: number | string;
  orderNumber: string;
  /** Localized operation label (matches header) */
  operationLabel: string;
  /** Localized machine label (matches header) */
  machineLabel: string;
  onStatusChanged?: (newStatus: string) => void;
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
  const onHold     = status === "ON_HOLD";

  return [
    {
      action: "SETUP",
      icon: <Wrench className="size-[24px]" />,
      label: t("actions.setup"),
      bgColor: "#9333ea",
      active: notStarted || stopped || onHold,
    },
    {
      action: "PROD",
      icon: <Play className="size-[24px]" />,
      label: t("actions.start"),
      bgColor: "#16a34a",
      active: inSetup || paused || stopped || onHold,
    },
    {
      action: "PAUSE",
      icon: <Pause className="size-[24px]" />,
      label: t("actions.pause"),
      bgColor: "#d97706",
      active: inProd,
    },
    {
      action: "STOP",
      icon: <Square className="size-[24px]" />,
      label: t("actions.stop"),
      bgColor: "#dc2626",
      active: inProd,
    },
    {
      action: "ON_HOLD",
      icon: <AlertTriangle className="size-[24px]" />,
      label: t("actions.hold"),
      bgColor: "#ea580c",
      active: inProd,
    },
    {
      action: "COMP",
      icon: <SkipForward className="size-[24px]" />,
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

export function StatusActionBar({
  transac,
  copmachine,
  statusCode,
  orderNumber,
  operationLabel,
  machineLabel,
  onStatusChanged,
}: StatusActionBarProps) {
  const { t } = useTranslation();
  const status = statusCodeToEnum(statusCode);
  const {
    loading,
    confirmAction,
    showSetupPrompt,
    requestChange,
    cancelChange,
    executeChange,
    acceptSetupQuestionnaire,
    declineSetupQuestionnaire,
  } = useStatusChange(transac, copmachine, status, onStatusChanged);

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
        className={cn(
          "fixed bottom-5 left-5 z-50 rounded-3xl px-4 py-3 flex flex-col gap-2 backdrop-blur border border-white/20",
          W_STATUS_ACTION_BAR.container,
        )}
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
              <ChevronUp className="size-[24px]" />
              {t(STATUS_DISPLAY[status].labelKey)}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            side="top"
            align="center"
            className={cn(
              W_STATUS_ACTION_BAR.dropdownMenu,
              "p-4 !ml-0 shadow-[0_-6px_16px_-2px_rgba(0,0,0,0.34),0_-5px_56px_-14px_rgba(0,0,0,0.28)]",
            )}
          >
            {actions.map((action) => {
              const iconColor = action.active ? "#ffffff" : "#374151";
              return (
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
                  <span className="shrink-0">
                    {React.cloneElement(action.icon as React.ReactElement<any>, {
                      strokeWidth: 2,
                      style: { color: iconColor, stroke: iconColor },
                    })}
                  </span>
                  <span>{action.label}</span>
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>

      </div>

      {/* Confirm dialog */}
      <ConfirmDialog
        open={!!confirmAction}
        onOpenChange={(open) => !open && cancelChange()}
        title={
          confirmAction ? (
            <span className="block w-max max-w-full min-w-0 text-left">
              <span className="block whitespace-nowrap">
                <Trans
                  i18nKey="statusConfirm.line1"
                  values={{
                    action: confirmLabels[confirmAction],
                    operation: operationLabel,
                    machine: machineLabel,
                  }}
                  components={{
                    operation: <span className="text-blue-600" />,
                    machine: <span className="text-blue-600" />,
                  }}
                />
              </span>
              <span className="block whitespace-nowrap">
                <Trans
                  i18nKey="statusConfirm.line2"
                  values={{ order: orderNumber }}
                  components={{ orderLink: <span className="text-blue-600" /> }}
                />
              </span>
            </span>
          ) : (
            ""
          )
        }
        fitContent
        onConfirm={executeChange}
        variant={confirmAction === "STOP" ? "destructive" : "default"}
      />

      {/* Setup questionnaire prompt — shown after PROD from SETUP */}
      <ConfirmDialog
        open={showSetupPrompt}
        onOpenChange={(open) => !open && declineSetupQuestionnaire()}
        title={t("actions.setupQuestionnairePrompt")}
        onConfirm={acceptSetupQuestionnaire}
      />
    </>
  );
}
