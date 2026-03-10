import { useState, useEffect } from "react";
import { apiGet } from "@/api/client";
import type { OperationComponent } from "@/types/workOrder";

export function useOperationComponents(transac: string | number, copmachine: string | number) {
  const [components, setComponents] = useState<OperationComponent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetch = async () => {
      if (!transac || !copmachine) {
        setComponents([]);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const res = await apiGet<OperationComponent[]>(
          `getOperationComponents.cfm?transac=${transac}&copmachine=${copmachine}`
        );
        if (res.success) {
          setComponents(res.data || []);
        } else {
          setError(res.error ?? "Failed to load components");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load components");
      } finally {
        setLoading(false);
      }
    };

    fetch();
  }, [transac, copmachine]);

  return { components, loading, error };
}
