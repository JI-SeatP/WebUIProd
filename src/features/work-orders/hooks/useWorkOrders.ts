import { useState, useEffect, useCallback, useMemo } from "react";
import { apiGet } from "@/api/client";
import type { WorkOrder } from "@/types/workOrder";

export type SortField =
  | "NO_PROD"
  | "NOM_CLIENT"
  | "PRODUIT_P"
  | "GROUPE"
  | "QTE_A_FAB"
  | "QTE_PRODUITE"
  | "QTE_RESTANTE"
  | "OPERATION"
  | "STATUT_CODE";

export type SortDirection = "asc" | "desc";

export interface WorkOrderFilters {
  departement?: number;
  machines?: number[];
  search?: string;
  statuses?: number[];
  operationType?: string;
  datePreset?: string;
  dateStart?: string;
  dateEnd?: string;
}

export function useWorkOrders(filters: WorkOrderFilters) {
  const [orders, setOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>("NO_PROD");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filters.departement) params.set("departement", String(filters.departement));
      if (filters.search) params.set("search", filters.search);
      if (filters.statuses?.length) params.set("status", filters.statuses.join(","));

      const query = params.toString();
      const endpoint = query ? `getWorkOrders.cfm?${query}` : "getWorkOrders.cfm";
      const res = await apiGet<WorkOrder[]>(endpoint);

      if (res.success) {
        setOrders(res.data);
      } else {
        setError(res.error ?? "Failed to load work orders");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load work orders");
    } finally {
      setLoading(false);
    }
  }, [filters.departement, filters.search, filters.statuses]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleSort = useCallback(
    (field: SortField) => {
      if (sortField === field) {
        setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
      } else {
        setSortField(field);
        setSortDirection("asc");
      }
    },
    [sortField]
  );

  const filteredAndSorted = useMemo(() => {
    let result = [...orders];

    // Client-side machine filter
    if (filters.machines?.length) {
      result = result.filter((wo) => filters.machines!.includes(wo.MACHINE));
    }

    // Client-side operation type filter
    if (filters.operationType) {
      const opType = filters.operationType.toUpperCase();
      result = result.filter((wo) => wo.FMCODE?.toUpperCase().includes(opType));
    }

    // Filter out "0 Pressing not scheduled" machine (MACODE = "PRESS_NS")
    result = result.filter((wo) => wo.MACODE !== "PRESS_NS");

    // Sort
    result.sort((a, b) => {
      const aVal = a[sortField as keyof WorkOrder];
      const bVal = b[sortField as keyof WorkOrder];

      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;

      let comparison = 0;
      if (typeof aVal === "number" && typeof bVal === "number") {
        comparison = aVal - bVal;
      } else {
        comparison = String(aVal).localeCompare(String(bVal));
      }

      return sortDirection === "asc" ? comparison : -comparison;
    });

    return result;
  }, [orders, filters.machines, filters.operationType, sortField, sortDirection]);

  return {
    orders: filteredAndSorted,
    allOrders: orders,
    loading,
    error,
    sortField,
    sortDirection,
    handleSort,
    refetch: fetchOrders,
  };
}
