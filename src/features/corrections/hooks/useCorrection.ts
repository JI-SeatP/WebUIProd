import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { getCorrection, submitCorrection } from "@/api/corrections";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import type { CorrectionData, NewDefectRow } from "@/types/corrections";

export function useCorrection(tjseq: number) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [data, setData] = useState<CorrectionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Editable state — quantities
  const [goodQty, setGoodQty] = useState<number>(0);
  const [defectQtys, setDefectQtys] = useState<Record<number, number>>({});
  const [newDefects, setNewDefects] = useState<NewDefectRow[]>([]);
  const [fpQtys, setFpQtys] = useState<Record<number, number>>({});
  const [smQtys, setSmQtys] = useState<Record<number, number>>({});

  // Editable state — production time fields
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [operation, setOperation] = useState<number>(0);
  const [machine, setMachine] = useState<number>(0);
  const [employeeCode, setEmployeeCode] = useState("");

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

          const sq: Record<number, number> = {};
          res.data.materials.forEach((m) => { sq[m.id] = m.correctedQty; });
          setSmQtys(sq);

          // Production time fields
          setStartDate(res.data.TJDEBUT);
          setEndDate(res.data.TJFIN);
          setOperation(res.data.OPERATION_SEQ);
          setMachine(res.data.MACHINE_SEQ);
          setEmployeeCode(res.data.EMPLOYE_EMNO || "");
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

  const updateSmQty = useCallback((id: number, qty: number) => {
    setSmQtys((prev) => ({ ...prev, [id]: qty }));
  }, []);

  // Recalculate material output quantities — mirrors old calculeQteSM()
  // Branch A (ENTREPF=1, has finished product transaction):
  //   NouvelleQte = TotalProduit × NIQTE  (NIQTE = BOM ratio from cNOMENCLATURE)
  // Branch B (ENTREPF=0, no finished product tracking):
  //   LeRatio = TotalQteOrigine / QteBonne_new
  //   NouvelleQte = TotalQte_new / LeRatio  →  TotalQte_new × QteBonne_new / TotalQteOrigine
  // For VCUT: ceiling(NouvelleQte)
  const recalcSM = useCallback(() => {
    if (!data || data.materials.length === 0) return;
    const totalDefects = Object.values(defectQtys).reduce((s, v) => s + v, 0)
      + newDefects.filter((d) => d.typeId && Number(d.qty) > 0)
        .reduce((s, d) => s + Number(d.qty), 0);
    const totalProduit = goodQty + totalDefects;
    const originalTotal = data.QTE_BONNE + data.QTE_DEFAUT;
    const updated: Record<number, number> = {};
    data.materials.forEach((mat) => {
      let newQty: number;
      if (data.ENTREPF === 1 && mat.niqte > 0) {
        // Branch A: Has finished products → NouvelleQte = TotalProduit × NIQTE
        newQty = Math.abs(totalProduit * mat.niqte);
      } else if (data.ENTREPF === 0 && originalTotal > 0) {
        // Branch B: No finished products → scale SM proportionally
        // NouvelleQte = originalSM × (TotalProduit_new / TotalQteOrigine)
        newQty = Math.abs(mat.originalQty * (totalProduit / originalTotal));
      } else if (mat.niqte > 0) {
        // Fallback: NIQTE available but ENTREPF doesn't match cleanly
        newQty = Math.abs(totalProduit * mat.niqte);
      } else {
        return; // can't calculate
      }
      if (data.EST_VCUT) newQty = Math.ceil(newQty);
      updated[mat.id] = Math.round(newQty * 100000) / 100000; // match CF NumberFormat 0.99999
    });
    setSmQtys((prev) => ({ ...prev, ...updated }));
  }, [data, goodQty, defectQtys, newDefects]);

  const handleSubmit = useCallback(async () => {
    if (!data) return;
    setSubmitting(true);
    try {
      // Compute goodQty: sum of EPF qtys if finished products exist, else direct goodQty
      let computedGoodQty = goodQty;
      if (data.ENTREPF === 1 && data.finishedProducts.length > 0) {
        computedGoodQty = data.finishedProducts.reduce(
          (sum, fp) => sum + (fpQtys[fp.id] ?? fp.correctedQty),
          0
        );
      }

      // Build defects array: existing (with ddseq) + new (without ddseq)
      const allDefects: { ddseq?: number; qty: number; reasonId: number; note?: string }[] = [];

      // Existing defects
      data.defects.forEach((d) => {
        allDefects.push({
          ddseq: d.id,
          qty: defectQtys[d.id] ?? d.correctedQty,
          reasonId: d.typeId,
        });
      });

      // New defects
      newDefects
        .filter((d) => d.typeId && Number(d.qty) > 0)
        .forEach((d) => {
          allDefects.push({
            qty: Number(d.qty),
            reasonId: Number(d.typeId),
          });
        });

      const res = await submitCorrection({
        tjseq,
        employeeCode,
        employeeName: data.EMNOM,
        operation,
        machine,
        startDate,
        endDate,
        goodQty: computedGoodQty,
        defects: allDefects,
        finishedProducts: data.finishedProducts.map((fp) => ({
          dtrseq: fp.id,
          qty: fpQtys[fp.id] ?? fp.correctedQty,
        })),
        materials: data.materials.map((m) => ({
          dtrseq: m.id,
          qty: smQtys[m.id] ?? m.correctedQty,
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
  }, [data, tjseq, goodQty, defectQtys, newDefects, fpQtys, smQtys, startDate, endDate, operation, machine, employeeCode, navigate, t]);

  return {
    data,
    loading,
    submitting,
    goodQty,
    setGoodQty,
    defectQtys,
    updateDefectQty,
    newDefects,
    setNewDefects,
    fpQtys,
    updateFpQty,
    smQtys,
    updateSmQty,
    recalcSM,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    operation,
    setOperation,
    machine,
    setMachine,
    employeeCode,
    setEmployeeCode,
    handleSubmit,
  };
}
