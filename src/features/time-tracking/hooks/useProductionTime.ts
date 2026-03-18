import { useState, useCallback, useRef } from "react";
import { getProductionTime, updateTimeStatus } from "@/api/timeTracking";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import type { TimeEntry, TimeTrackingFilters, ProductionTimeTotals } from "@/types/timeTracking";

const PAGE_SIZE = 100;

export function useProductionTime() {
  const { t } = useTranslation();
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [totals, setTotals] = useState<ProductionTimeTotals | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const filtersRef = useRef<TimeTrackingFilters | null>(null);

  const fetchEntries = useCallback(async (filters: TimeTrackingFilters) => {
    filtersRef.current = filters;
    setLoading(true);
    setEntries([]);
    setTotals(null);
    setHasMore(false);
    try {
      const res = await getProductionTime({
        startDate: filters.startDate,
        endDate: filters.endDate,
        department: filters.selectedDepartments.length > 0
          ? filters.selectedDepartments.join(",")
          : undefined,
        machine: filters.selectedMachines.length > 0
          ? filters.selectedMachines.join(",")
          : undefined,
        offset: 0,
        limit: PAGE_SIZE,
      });
      if (res.success) {
        setEntries(res.data);
        setHasMore(res.hasMore);
        if (res.totals) setTotals(res.totals);
      }
    } catch {
      toast.error(t("dialogs.error"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  const fetchMore = useCallback(async () => {
    const filters = filtersRef.current;
    if (!filters || loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const res = await getProductionTime({
        startDate: filters.startDate,
        endDate: filters.endDate,
        department: filters.selectedDepartments.length > 0
          ? filters.selectedDepartments.join(",")
          : undefined,
        machine: filters.selectedMachines.length > 0
          ? filters.selectedMachines.join(",")
          : undefined,
        offset: entries.length,
        limit: PAGE_SIZE,
      });
      if (res.success) {
        setEntries((prev) => [...prev, ...res.data]);
        setHasMore(res.hasMore);
      }
    } catch {
      toast.error(t("dialogs.error"));
    } finally {
      setLoadingMore(false);
    }
  }, [entries.length, hasMore, loadingMore, t]);

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

  return { entries, totals, loading, loadingMore, hasMore, fetchEntries, fetchMore, changeStatus };
}
