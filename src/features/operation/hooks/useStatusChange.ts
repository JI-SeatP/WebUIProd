import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { apiPost } from "@/api/client";
import { useSession } from "@/context/SessionContext";

export type StatusAction = "SETUP" | "PROD" | "PAUSE" | "STOP" | "COMP" | "ON_HOLD" | "RESET_READY";

export function useStatusChange(
  transac: number,
  copmachine: number | null,
  onStatusChanged?: (newStatus: string) => void
) {
  const navigate = useNavigate();
  const { state } = useSession();
  const [loading, setLoading] = useState(false);
  const [confirmAction, setConfirmAction] = useState<StatusAction | null>(null);

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
        employeeCode: state.employee?.EMNOIDENT ?? 0,
      });

      if (res.success) {
        // Update local status immediately
        onStatusChanged?.(confirmAction);

        // STOP and COMP navigate to questionnaire
        if (confirmAction === "STOP" || confirmAction === "COMP") {
          const type = confirmAction === "STOP" ? "stop" : "comp";
          navigate(`/orders/${transac}/questionnaire/${type}`);
        }
      }
    } finally {
      setLoading(false);
      setConfirmAction(null);
    }
  }, [confirmAction, transac, copmachine, state.employee, navigate, onStatusChanged]);

  return {
    loading,
    confirmAction,
    requestChange,
    cancelChange,
    executeChange,
  };
}
