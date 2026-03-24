import { useState, useEffect } from "react";
import { apiGet } from "@/api/client";
import type { VcutData } from "@/types/workOrder";

export function useVcutData(transac: number | null) {
  const [vcutData, setVcutData] = useState<VcutData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!transac) return;

    setLoading(true);
    setError(null);

    apiGet<VcutData>(`getVcutData.cfm?transac=${transac}`)
      .then((res) => {
        if (res.success) {
          setVcutData(res.data);
        } else {
          setError(res.error ?? "Failed to load VCUT data");
        }
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load VCUT data");
      })
      .finally(() => setLoading(false));
  }, [transac]);

  return { vcutData, loading, error };
}
