import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { apiPost } from "@/api/client";
import { useSession } from "@/context/SessionContext";

export type StatusAction = "SETUP" | "PROD" | "PAUSE" | "STOP" | "COMP" | "ON_HOLD" | "RESET_READY";

export interface UseStatusChangeOptions {
  /**
   * Optional gate run *after* the user accepts the existing confirm dialog
   * but *before* the changeStatus.cfm POST. Return false (or throw) to abort
   * the transition entirely — no API call happens and the status stays
   * where it was. Used by PQTT for the OPConfirm / EmployeeMismatch /
   * AddFinishedPieceBeforeClose modal sequence.
   */
  beforeCommit?: (action: StatusAction) => Promise<boolean> | boolean;
}

export function useStatusChange(
  transac: number,
  copmachine: number | null,
  currentStatus: string,
  onStatusChanged?: (newStatus: string) => void,
  options?: UseStatusChangeOptions,
) {
  const navigate = useNavigate();
  const { state } = useSession();
  const [loading, setLoading] = useState(false);
  const [confirmAction, setConfirmAction] = useState<StatusAction | null>(null);
  // Second dialog: "fill Setup Questionnaire?" after PROD-from-SETUP
  const [showSetupPrompt, setShowSetupPrompt] = useState(false);

  const requestChange = useCallback((action: StatusAction) => {
    setConfirmAction(action);
  }, []);

  const cancelChange = useCallback(() => {
    setConfirmAction(null);
  }, []);

  const executeChange = useCallback(async () => {
    if (!confirmAction) return;

    // PQTT/PROD gate: run an optional pre-commit hook. If it returns false,
    // abort without contacting the API and clear the confirm state.
    if (options?.beforeCommit) {
      try {
        const proceed = await options.beforeCommit(confirmAction);
        if (!proceed) {
          setConfirmAction(null);
          return;
        }
      } catch {
        setConfirmAction(null);
        return;
      }
    }

    setLoading(true);
    try {
      const res = await apiPost("changeStatus.cfm", {
        transac,
        copmachine,
        newStatus: confirmAction,
        employeeCode: state.employee?.EMSEQ ?? 0,
      });

      if (res.success) {
        // Update local status immediately
        onStatusChanged?.(confirmAction);

        // STOP / COMP / ON_HOLD navigate to questionnaire.
        // ON_HOLD reuses the STOP layout but writes the ON_HOLD target status.
        if (confirmAction === "STOP" || confirmAction === "COMP" || confirmAction === "ON_HOLD") {
          const type =
            confirmAction === "STOP" ? "stop" :
            confirmAction === "COMP" ? "comp" : "onhold";
          const copValue = copmachine ?? 0;
          navigate(`/orders/${transac}/questionnaire/${type}?copmachine=${copValue}&fromStatus=${encodeURIComponent(currentStatus)}`);
        }
        // PROD from SETUP: ask if worker wants to fill Setup Questionnaire
        else if (confirmAction === "PROD" && currentStatus === "SETUP") {
          setShowSetupPrompt(true);
        }
      }
    } finally {
      setLoading(false);
      setConfirmAction(null);
    }
  }, [confirmAction, transac, copmachine, currentStatus, state.employee, navigate, onStatusChanged, options]);

  const acceptSetupQuestionnaire = useCallback(() => {
    setShowSetupPrompt(false);
    const copValue = copmachine ?? 0;
    navigate(`/orders/${transac}/questionnaire/setup?copmachine=${copValue}`);
  }, [transac, copmachine, navigate]);

  const declineSetupQuestionnaire = useCallback(() => {
    setShowSetupPrompt(false);
  }, []);

  return {
    loading,
    confirmAction,
    showSetupPrompt,
    requestChange,
    cancelChange,
    executeChange,
    acceptSetupQuestionnaire,
    declineSetupQuestionnaire,
  };
}
