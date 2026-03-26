import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { apiPost } from "@/api/client";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

interface QuestionnairePayload {
  transac: number;
  copmachine: number | null;
  type: "stop" | "comp";
  employeeCode: string;
  primaryCause?: string;
  secondaryCause?: string;
  notes?: string;
  moldAction?: string;
  goodQty: string;
  defects: { qty: string; typeId: string; notes: string }[];
  finishedProducts?: { product: string; qty: string; container: string }[];
  nopseq?: number;
  isVcut?: boolean;
  listeTjseq?: string;
  listeEpfSeq?: string;
  smnotrans?: string;
}

interface ValidationErrors {
  employeeCode?: string;
  primaryCause?: string;
}

export function useQuestionnaireSubmit() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [showZeroConfirm, setShowZeroConfirm] = useState(false);
  const [pendingPayload, setPendingPayload] = useState<QuestionnairePayload | null>(null);

  const validate = useCallback(
    (payload: QuestionnairePayload): ValidationErrors | null => {
      const errors: ValidationErrors = {};

      if (!payload.employeeCode) {
        errors.employeeCode = t("questionnaire.employeeRequired");
      }
      if (payload.type === "stop" && !payload.primaryCause) {
        errors.primaryCause = t("questionnaire.causeRequired");
      }

      return Object.keys(errors).length > 0 ? errors : null;
    },
    [t]
  );

  const doSubmit = useCallback(
    async (payload: QuestionnairePayload) => {
      setLoading(true);
      try {
        const res = await apiPost("submitQuestionnaire.cfm", payload as unknown as Record<string, unknown>);
        if (res.success) {
          toast.success(t("questionnaire.submitSuccess"));
          navigate(`/orders/${payload.transac}/operation/${payload.copmachine ?? ""}`);
        } else {
          toast.error(res.error ?? t("questionnaire.submitError"));
        }
      } catch {
        toast.error(t("questionnaire.submitError"));
      } finally {
        setLoading(false);
        setPendingPayload(null);
      }
    },
    [navigate, t]
  );

  const submit = useCallback(
    (payload: QuestionnairePayload) => {
      const errors = validate(payload);
      if (errors) return errors;

      // Check zero-qty confirmation
      const totalGood = Number(payload.goodQty) || 0;
      const totalDefect = payload.defects.reduce(
        (sum, d) => sum + (Number(d.qty) || 0),
        0
      );

      if (totalGood === 0 && totalDefect === 0) {
        setPendingPayload(payload);
        setShowZeroConfirm(true);
        return null;
      }

      doSubmit(payload);
      return null;
    },
    [validate, doSubmit]
  );

  const confirmZero = useCallback(() => {
    setShowZeroConfirm(false);
    if (pendingPayload) doSubmit(pendingPayload);
  }, [pendingPayload, doSubmit]);

  const cancelZero = useCallback(() => {
    setShowZeroConfirm(false);
    setPendingPayload(null);
  }, []);

  const cancel = useCallback(
    (transac: number, copmachine: number | null) => {
      navigate(`/orders/${transac}/operation/${copmachine ?? ""}`);
    },
    [navigate]
  );

  return {
    loading,
    showZeroConfirm,
    submit,
    confirmZero,
    cancelZero,
    cancel,
    validate,
  };
}
