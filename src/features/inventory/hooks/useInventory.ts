import { useState, useCallback } from "react";
import { getInventoryTransactions } from "@/api/inventory";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import type { InventoryTransaction } from "@/types/inventory";

export function useInventory() {
  const { t } = useTranslation();
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchTransactions = useCallback(
    async (transactionNo: string, productNo: string, contains: string) => {
      if (!transactionNo.trim()) {
        setTransactions([]);
        return;
      }
      setLoading(true);
      try {
        const res = await getInventoryTransactions({
          transactionNo,
          productNo: productNo || undefined,
          contains: contains || undefined,
        });
        if (res.success) {
          setTransactions(res.data);
        }
      } catch {
        toast.error(t("dialogs.error"));
      } finally {
        setLoading(false);
      }
    },
    [t]
  );

  return { transactions, loading, fetchTransactions };
}
