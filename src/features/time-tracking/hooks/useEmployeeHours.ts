import { useState, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { getEmployeeHours, deleteEmployeeHours, updateEmployeeHours } from "@/api/timeTracking";
import type { EmployeeHoursEntry } from "@/types/timeTracking";

export function useEmployeeHours() {
  const { t } = useTranslation();
  const [entries, setEntries] = useState<EmployeeHoursEntry[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchHours = useCallback(
    async (employeeCode: number, date: string) => {
      setLoading(true);
      try {
        const res = await getEmployeeHours({ employeeCode, date });
        if (res.success) {
          setEntries(res.data);
        } else {
          toast.error(res.message ?? t("common.error"));
        }
      } catch {
        toast.error(t("common.error"));
      } finally {
        setLoading(false);
      }
    },
    [t]
  );

  const deleteEntry = useCallback(
    async (ehseq: number) => {
      try {
        const res = await deleteEmployeeHours(ehseq);
        if (res.success) {
          setEntries((prev) => prev.filter((e) => e.EHSEQ !== ehseq));
          toast.success(t("timeTracking.entryDeleted"));
        }
      } catch {
        toast.error(t("common.error"));
      }
    },
    [t]
  );

  const updateEntry = useCallback(
    async (payload: {
      ehseq: number;
      startTime: string;
      endTime: string;
      department: number;
      machine: number;
      effortRate: number;
    }) => {
      try {
        const res = await updateEmployeeHours(payload);
        if (res.success) {
          // Recalculate duration and hoursWorked locally
          const [sh, sm] = payload.startTime.split(":").map(Number);
          const [eh, em] = payload.endTime.split(":").map(Number);
          const duration = (eh * 60 + em) - (sh * 60 + sm);
          const hoursWorked = Math.round(duration * (payload.effortRate / 100));

          setEntries((prev) =>
            prev.map((e) =>
              e.EHSEQ === payload.ehseq
                ? {
                    ...e,
                    EHDEBUT: e.EHDEBUT.split(" ")[0] + " " + payload.startTime + ":00",
                    EHFIN: e.EHFIN.split(" ")[0] + " " + payload.endTime + ":00",
                    EHDUREE: duration,
                    DEPARTEMENT: payload.department,
                    MACHINE_P: e.MACHINE_P,
                    MACHINE_S: e.MACHINE_S,
                    EFFORTRATE: payload.effortRate,
                    HOURSWORKED: hoursWorked,
                  }
                : e
            )
          );
          toast.success(t("timeTracking.entryUpdated"));
          return true;
        }
      } catch {
        toast.error(t("common.error"));
      }
      return false;
    },
    [t]
  );

  const totals = useMemo(() => {
    const totalDuration = entries.reduce((sum, e) => sum + e.EHDUREE, 0);
    const totalHoursWorked = entries.reduce((sum, e) => sum + e.HOURSWORKED, 0);
    return { totalDuration, totalHoursWorked };
  }, [entries]);

  return { entries, loading, fetchHours, deleteEntry, updateEntry, totals };
}
