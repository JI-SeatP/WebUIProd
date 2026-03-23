import { useState, useCallback, useMemo } from "react";
import { addHours } from "@/api/timeTracking";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

interface AddHoursForm {
  employeeCode: string;
  employeeName: string;
  employeeSeq: string;
  date: string;
  shift: string;
  startTime: string;
  endTime: string;
  department: string;
  machine: string;
  effortRate: string;
}

/** Detect current shift based on time of day */
function detectCurrentShift(): string {
  const now = new Date();
  const h = now.getHours();
  const m = now.getMinutes();
  const mins = h * 60 + m;
  if (mins >= 420 && mins < 930) return "1"; // 7:00-15:30
  if (mins >= 930 || mins < 0 + 1) return "2"; // 15:30-00:00 (or midnight)
  if (mins >= 0 && mins < 420) return "3"; // 00:00-07:00
  return "1"; // fallback
}

function getShiftTimes(shift: string): [string, string] {
  const shiftTimes: Record<string, [string, string]> = {
    "1": ["07:00", "15:30"],
    "2": ["15:30", "00:00"],
    "3": ["00:00", "07:00"],
  };
  return shiftTimes[shift] ?? ["", ""];
}

function getInitialForm(): AddHoursForm {
  const shift = detectCurrentShift();
  const [startTime, endTime] = getShiftTimes(shift);
  return {
    employeeCode: "",
    employeeName: "",
    employeeSeq: "",
    date: new Date().toISOString().slice(0, 10),
    shift,
    startTime,
    endTime,
    department: "",
    machine: "",
    effortRate: "100",
  };
}

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
  const [form, setForm] = useState<AddHoursForm>(getInitialForm());
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
      // Replicate changeDateDebutFin (sp_js.cfm:474-489):
      // When shift changes, auto-fill start/end times
      if (field === "shift") {
        const [startTime, endTime] = getShiftTimes(value);
        if (startTime && endTime) {
          next.startTime = startTime;
          next.endTime = endTime;
        }
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
    if (!form.employeeSeq || !form.startTime || !form.endTime) return;
    setLoading(true);
    try {
      const res = await addHours({
        employeeCode: Number(form.employeeSeq),
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
        setForm(getInitialForm());
      }
    } catch {
      toast.error(t("dialogs.error"));
    } finally {
      setLoading(false);
    }
  }, [form, t]);

  const reset = useCallback(() => {
    setForm(getInitialForm());
  }, []);

  return { form, updateField, duration, hoursWorked, loading, submit, reset };
}
