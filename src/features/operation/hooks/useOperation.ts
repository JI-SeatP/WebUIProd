import { useState, useEffect, useCallback } from "react";
import { apiGet } from "@/api/client";
import type { WorkOrder } from "@/types/workOrder";
import type { WorkOrderDetail } from "@/types/workOrder";

export type OperationData = WorkOrder & Partial<WorkOrderDetail>;

export function useOperation(transac: string, copmachine: string) {
  const [operation, setOperation] = useState<OperationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOperation = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiGet<OperationData>(
        `getOperation.cfm?transac=${transac}&copmachine=${copmachine}`
      );
      if (res.success) {
        setOperation(res.data);
      } else {
        setError(res.error ?? "Failed to load operation");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load operation");
    } finally {
      setLoading(false);
    }
  }, [transac, copmachine]);

  useEffect(() => {
    fetchOperation();
  }, [fetchOperation]);

  return { operation, loading, error, refetch: fetchOperation };
}
