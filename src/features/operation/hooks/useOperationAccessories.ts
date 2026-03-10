import { useState, useEffect } from "react";
import { apiGet } from "@/api/client";
import type { OperationAccessory } from "@/types/workOrder";

export function useOperationAccessories(transac: string | number, copmachine: string | number) {
  const [accessories, setAccessories] = useState<OperationAccessory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetch = async () => {
      if (!transac || !copmachine) {
        setAccessories([]);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const res = await apiGet<OperationAccessory[]>(
          `getOperationAccessories.cfm?transac=${transac}&copmachine=${copmachine}`
        );
        if (res.success) {
          setAccessories(res.data || []);
        } else {
          setError(res.error ?? "Failed to load accessories");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load accessories");
      } finally {
        setLoading(false);
      }
    };

    fetch();
  }, [transac, copmachine]);

  return { accessories, loading, error };
}
