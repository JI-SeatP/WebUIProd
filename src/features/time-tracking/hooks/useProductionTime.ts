import { useState, useCallback } from "react";
import { getProductionTime, updateTimeStatus } from "@/api/timeTracking";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import type { TimeEntry, TimeTrackingFilters } from "@/types/timeTracking";

export function useProductionTime() {
  const { t } = useTranslation();
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchEntries = useCallback(async (filters: TimeTrackingFilters) => {
    setLoading(true);
    try {
      const res = await getProductionTime({
        startDate: filters.startDate,
        endDate: filters.endDate,
      });
      if (res.success) {
        setEntries(res.data);
      }
    } catch {
      toast.error(t("dialogs.error"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  const changeStatus = useCallback(async (tjseq: number, statusCode: number) => {
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
      toast.error(t("dialogs.error"));
    }
  }, [t]);

  return { entries, loading, fetchEntries, changeStatus };
}
