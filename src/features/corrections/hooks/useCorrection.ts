import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { getCorrection, submitCorrection } from "@/api/corrections";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import type { CorrectionData } from "@/types/corrections";

export function useCorrection(tjseq: number) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [data, setData] = useState<CorrectionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Editable state
  const [goodQty, setGoodQty] = useState<number>(0);
  const [defectQtys, setDefectQtys] = useState<Record<number, number>>({});
  const [fpQtys, setFpQtys] = useState<Record<number, number>>({});
  const [materialQtys, setMaterialQtys] = useState<Record<number, number>>({});

  useEffect(() => {
    setLoading(true);
    getCorrection(tjseq)
      .then((res) => {
        if (res.success && res.data) {
          setData(res.data);
          setGoodQty(res.data.QTE_BONNE);
          const dq: Record<number, number> = {};
          res.data.defects.forEach((d) => { dq[d.id] = d.correctedQty; });
          setDefectQtys(dq);
          const fq: Record<number, number> = {};
          res.data.finishedProducts.forEach((fp) => { fq[fp.id] = fp.correctedQty; });
          setFpQtys(fq);
          const mq: Record<number, number> = {};
          res.data.materials.forEach((m) => { mq[m.id] = m.correctedQty; });
          setMaterialQtys(mq);
        }
      })
      .catch(() => {
        toast.error(t("dialogs.error"));
      })
      .finally(() => {
        setLoading(false);
      });
  }, [tjseq, t]);

  const updateDefectQty = useCallback((id: number, qty: number) => {
    setDefectQtys((prev) => ({ ...prev, [id]: qty }));
  }, []);

  const updateFpQty = useCallback((id: number, qty: number) => {
    setFpQtys((prev) => ({ ...prev, [id]: qty }));
  }, []);

  const updateMaterialQty = useCallback((id: number, qty: number) => {
    setMaterialQtys((prev) => ({ ...prev, [id]: qty }));
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!data) return;
    setSubmitting(true);
    try {
      const res = await submitCorrection({
        tjseq,
        goodQty,
        defects: data.defects.map((d) => ({
          id: d.id,
          correctedQty: defectQtys[d.id] ?? d.correctedQty,
        })),
        finishedProducts: data.finishedProducts.map((fp) => ({
          id: fp.id,
          correctedQty: fpQtys[fp.id] ?? fp.correctedQty,
        })),
        materials: data.materials.map((m) => ({
          id: m.id,
          correctedQty: materialQtys[m.id] ?? m.correctedQty,
        })),
      });
      if (res.success) {
        toast.success(t("corrections.saved"));
        navigate("/time-tracking");
      } else {
        toast.error(t("corrections.saveError"));
      }
    } catch {
      toast.error(t("corrections.saveError"));
    } finally {
      setSubmitting(false);
    }
  }, [data, tjseq, goodQty, defectQtys, fpQtys, materialQtys, navigate, t]);

  return {
    data,
    loading,
    submitting,
    goodQty,
    setGoodQty,
    defectQtys,
    updateDefectQty,
    fpQtys,
    updateFpQty,
    materialQtys,
    updateMaterialQty,
    handleSubmit,
  };
}
