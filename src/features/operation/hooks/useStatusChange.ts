import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { apiPost } from "@/api/client";
import { useSession } from "@/context/SessionContext";

export type StatusAction = "SETUP" | "PROD" | "PAUSE" | "STOP" | "COMP" | "ON_HOLD" | "RESET_READY";

export function useStatusChange(
  transac: number,
  copmachine: number | null,
  currentStatus: string,
  onStatusChanged?: (newStatus: string) => void
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

    setLoading(true);
    try {
      const res = await apiPost("changeStatus.cfm", {
        transac,
        copmachine,
        newStatus: confirmAction,
        employeeCode: state.employee?.EMSEQ ?? 0,
      });

      if (!res.success) {
        console.error("[StatusChange] API error:", res.error ?? res.message);
        alert(res.error ?? res.message ?? "Status change failed");
        return;
      }

      // Update local status immediately
      onStatusChanged?.(confirmAction);

      // STOP and COMP navigate to questionnaire
      if (confirmAction === "STOP" || confirmAction === "COMP") {
        const type = confirmAction === "STOP" ? "stop" : "comp";
        const copValue = copmachine ?? 0;
        navigate(`/orders/${transac}/questionnaire/${type}?copmachine=${copValue}&fromStatus=${encodeURIComponent(currentStatus)}`);
      }
      // PROD from SETUP: ask if worker wants to fill Setup Questionnaire
      else if (confirmAction === "PROD" && currentStatus === "SETUP") {
        setShowSetupPrompt(true);
      }
    } catch (err) {
      console.error("[StatusChange] Network error:", err);
      alert("Network error: could not change status. Please try again.");
    } finally {
      setLoading(false);
      setConfirmAction(null);
    }
  }, [confirmAction, transac, copmachine, currentStatus, state.employee, navigate, onStatusChanged]);

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
