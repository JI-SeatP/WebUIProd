import { useState, useCallback, useMemo } from "react";
import { addHours } from "@/api/timeTracking";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

interface AddHoursForm {
  employeeCode: string;
  employeeName: string;
  date: string;
  shift: string;
  startTime: string;
  endTime: string;
  department: string;
  machine: string;
  effortRate: string;
}

const initialForm: AddHoursForm = {
  employeeCode: "",
  employeeName: "",
  date: new Date().toISOString().slice(0, 10),
  shift: "",
  startTime: "",
  endTime: "",
  department: "",
  machine: "",
  effortRate: "100",
};

function detectShift(startTime: string): string {
  if (!startTime) return "";
  const hour = parseInt(startTime.split(":")[0], 10);
  if (hour >= 7 && hour < 15) return "1";
  if (hour >= 15 || hour === 0) return "2";
  return "3";
}

function calculateDuration(start: string, end: string): number {
  if (!start || !end) return 0;
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  let minutes = (eh * 60 + em) - (sh * 60 + sm);
  if (minutes < 0) minutes += 24 * 60;
  return minutes;
}

export function useAddHours() {
  const { t } = useTranslation();
  const [form, setForm] = useState<AddHoursForm>(initialForm);
  const [loading, setLoading] = useState(false);

  const updateField = useCallback(<K extends keyof AddHoursForm>(
    field: K,
    value: AddHoursForm[K]
  ) => {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      if (field === "startTime") {
        next.shift = detectShift(value);
      }
      return next;
    });
  }, []);

  const duration = useMemo(
    () => calculateDuration(form.startTime, form.endTime),
    [form.startTime, form.endTime]
  );

  const hoursWorked = useMemo(
    () => (duration / 60) * (Number(form.effortRate) / 100),
    [duration, form.effortRate]
  );

  const submit = useCallback(async () => {
    if (!form.employeeCode || !form.startTime || !form.endTime) return;
    setLoading(true);
    try {
      const res = await addHours({
        employeeCode: Number(form.employeeCode),
        date: form.date,
        shift: Number(form.shift),
        startTime: form.startTime,
        endTime: form.endTime,
        department: Number(form.department),
        machine: Number(form.machine),
        effortRate: Number(form.effortRate),
      });
      if (res.success) {
        toast.success(t("timeTracking.hoursSaved"));
        setForm(initialForm);
      }
    } catch {
      toast.error(t("dialogs.error"));
    } finally {
      setLoading(false);
    }
  }, [form, t]);

  const reset = useCallback(() => {
    setForm(initialForm);
  }, []);

  return { form, updateField, duration, hoursWorked, loading, submit, reset };
}
