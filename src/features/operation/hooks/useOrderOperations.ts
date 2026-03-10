import { useState, useEffect } from "react";
import { apiGet } from "@/api/client";
import type { OrderOperation } from "@/types/workOrder";

export function useOrderOperations(noProd: string | null | undefined) {
  const [operations, setOperations] = useState<OrderOperation[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      if (!noProd) {
        setOperations([]);
        return;
      }
      setLoading(true);
      try {
        const res = await apiGet<OrderOperation[]>(
          `getOrderOperations.cfm?noProd=${encodeURIComponent(noProd)}`
        );
        if (res.success) setOperations(res.data || []);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [noProd]);

  return { operations, loading };
}
