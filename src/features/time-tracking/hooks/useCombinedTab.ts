import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { getEmployeeProductionTime, updateTimeEntry, updateTimeStatus } from "@/api/timeTracking";
import type { TimeEntry, UpdateTimeEntryPayload } from "@/types/timeTracking";

export function useCombinedTab() {
  const { t } = useTranslation();
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchEntries = useCallback(
    async (employeeCode: number, date: string) => {
      setLoading(true);
      try {
        const res = await getEmployeeProductionTime({ employeeCode, date });
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

  const updateEntry = useCallback(
    async (payload: UpdateTimeEntryPayload) => {
      try {
        const res = await updateTimeEntry(payload);
        if (res.success) {
          setEntries((prev) =>
            prev.map((e) =>
              e.TJSEQ === payload.tjseq
                ? {
                    ...e,
                    ...(payload.qtyGood !== undefined && { QTE_BONNE: payload.qtyGood }),
                    ...(payload.qtyDefect !== undefined && { QTE_DEFAUT: payload.qtyDefect }),
                  }
                : e
            )
          );
          toast.success(t("timeTracking.entryUpdated"));
        }
      } catch {
        toast.error(t("common.error"));
      }
    },
    [t]
  );

  const changeStatus = useCallback(
    async (tjseq: number, statusCode: number) => {
      try {
        const res = await updateTimeStatus(tjseq, statusCode);
        if (res.success) {
          setEntries((prev) =>
            prev.map((e) =>
              e.TJSEQ === tjseq ? { ...e, STATUT_CODE: statusCode } : e
            )
          );
          toast.success(t("timeTracking.statusUpdated"));
        }
      } catch {
        toast.error(t("common.error"));
      }
    },
    [t]
  );

  return { entries, loading, fetchEntries, updateEntry, changeStatus };
}
