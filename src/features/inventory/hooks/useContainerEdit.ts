import { useState, useCallback } from "react";
import { getContainerDetails, updateContainerQty } from "@/api/inventory";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import type { ContainerDetail } from "@/types/inventory";

export function useContainerEdit() {
  const { t } = useTranslation();
  const [containers, setContainers] = useState<ContainerDetail[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchContainers = useCallback(
    async (trseq: number) => {
      setLoading(true);
      try {
        const res = await getContainerDetails(trseq);
        if (res.success) {
          setContainers(res.data);
        }
      } catch {
        toast.error(t("dialogs.error"));
      } finally {
        setLoading(false);
      }
    },
    [t]
  );

  const saveQty = useCallback(
    async (cdseq: number, qty: number) => {
      try {
        const res = await updateContainerQty(cdseq, qty);
        if (res.success) {
          setContainers((prev) =>
            prev.map((c) =>
              c.CDSEQ === cdseq ? { ...c, QTE_REELLE: qty } : c
            )
          );
          toast.success(t("inventory.qtyUpdated"));
        }
      } catch {
        toast.error(t("dialogs.error"));
      }
    },
    [t]
  );

  return { containers, loading, fetchContainers, saveQty };
}
