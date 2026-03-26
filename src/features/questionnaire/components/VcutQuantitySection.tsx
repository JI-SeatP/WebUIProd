import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NumPad } from "@/components/shared/NumPad";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus } from "lucide-react";
import { apiGet, apiPost } from "@/api/client";
import type { OperationData } from "@/features/operation/hooks/useOperation";

export interface VcutComponent {
  niseq: number;
  niqte: number;
  inventaireM: number;
  code: string;
  desc_P: string;
  desc_S: string;
  copmachine: number;
  nopseq: number;
  cumQty: number;
  defaultQty: number;
}

export interface VcutContainer {
  conNumero: string;
  qty: number;
  entrepot: number;
  entrepotCode: string;
  entrepotDesc_P: string;
  entrepotDesc_S: string;
}

export interface ProducedItem {
  dtrseq: number;
  qty: number;
  container: string;
  code: string;
  desc_P: string;
  desc_S: string;
  epfTrno: string;
}

interface VcutQuantitySectionProps {
  operation: OperationData;
  language: "fr" | "en";
  onItemAdded: () => void;
  employeeSeq?: number;
}

export function VcutQuantitySection({ operation, language, onItemAdded, employeeSeq }: VcutQuantitySectionProps) {
  const { t } = useTranslation();
  const loc = (fr: string, en: string) => (language === "fr" ? fr : en) || fr;

  const [components, setComponents] = useState<VcutComponent[]>([]);
  const [containers, setContainers] = useState<VcutContainer[]>([]);
  const [loading, setLoading] = useState(true);
  const [rowLoading, setRowLoading] = useState<number | null>(null);

  // Per-component input state
  const [qtyInputs, setQtyInputs] = useState<Record<number, string>>({});
  const [defectInputs, setDefectInputs] = useState<Record<number, string>>({});
  const [containerInputs, setContainerInputs] = useState<Record<number, string>>({});
  const [activeNumpad, setActiveNumpad] = useState<string | null>(null);


  const transac = operation.TRANSAC;
  const nopseq = (operation as unknown as Record<string, unknown>).NOPSEQ as number;

  // Fetch VCUT components on mount
  const fetchComponents = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiGet<{
        components: VcutComponent[];
        containers: VcutContainer[];
        producedItems: ProducedItem[];
      }>(`getVcutComponents.cfm?transac=${transac}&nopseq=${nopseq}`);
      if (res.success && res.data) {
        setComponents(res.data.components);
        setContainers(res.data.containers);
        // Pre-fill qty inputs with defaultQty for components not yet modified
        const newQtyInputs: Record<number, string> = {};
        for (const comp of res.data.components) {
          if (!(comp.nopseq in qtyInputs) || qtyInputs[comp.nopseq] === "") {
            newQtyInputs[comp.nopseq] = String(comp.defaultQty || "");
          }
        }
        if (Object.keys(newQtyInputs).length > 0) {
          setQtyInputs(prev => ({ ...newQtyInputs, ...prev }));
        }
      }
    } catch (err) {
      console.error("Failed to fetch VCUT components:", err);
    } finally {
      setLoading(false);
    }
  }, [transac, nopseq]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchComponents();
  }, [fetchComponents]);

  // Handle "+" button for a component row
  const handleRowAdd = useCallback(async (comp: VcutComponent) => {
    // Use defaultQty if user hasn't modified the input (old software pre-fills with remaining qty)
    const qty = qtyInputs[comp.nopseq] || String(comp.defaultQty || 0);
    const defectQty = defectInputs[comp.nopseq] || "0";
    const container = containerInputs[comp.nopseq] || "";
    if (Number(qty) <= 0) return;

    setRowLoading(comp.nopseq);
    try {
      const res = await apiPost<{
        producedItems: ProducedItem[];
        tjseq: number;
        listeTjseq: string;
      }>("addVcutQty.cfm", {
        transac,
        copmachine: comp.copmachine,
        nopseq: comp.nopseq,
        mainNopseq: nopseq, // main operation NOPSEQ (old software: arguments.NOPSEQ)
        qty: Number(qty),
        defectQty: Number(defectQty),
        container,
        inventaireP: comp.inventaireM,
        niseq: comp.niseq,
        employeeSeq: employeeSeq || 0,
      });

      if (res.success) {
        // Clear inputs for this row
        setQtyInputs(prev => ({ ...prev, [comp.nopseq]: "" }));
        setDefectInputs(prev => ({ ...prev, [comp.nopseq]: "0" }));
        setContainerInputs(prev => ({ ...prev, [comp.nopseq]: "" }));
        // Notify parent to refresh produced items + trigger SM recalc
        onItemAdded();
        // Refresh components to get updated defaultQty
        await fetchComponents();
      }
    } catch (err) {
      console.error("Failed to add VCUT qty:", err);
    } finally {
      setRowLoading(null);
    }
  }, [transac, qtyInputs, defectInputs, containerInputs, onItemAdded, fetchComponents]);

  if (loading) {
    return (
      <Card className="min-h-[200px] bg-white">
        <CardContent className="flex items-center justify-center py-8">
          <span className="text-muted-foreground">{t("dialogs.loading")}</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {/* QUANTITÉ input table */}
      <Card className="bg-white">
        <div className="py-1.5 px-3">
          <div className="border border-blue-400 bg-blue-50 rounded-lg px-3 py-1 text-lg font-bold text-blue-900 uppercase tracking-wider inline-block">
            {t("order.quantity")}
          </div>
        </div>
        <CardContent className="pt-0.5 pb-2 px-3">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-200">
                <TableHead className="text-sm font-bold uppercase">{t("questionnaire.qtyGood")}</TableHead>
                <TableHead className="text-sm font-bold uppercase">{t("questionnaire.qtyDefective")}</TableHead>
                <TableHead className="text-sm font-bold uppercase">{t("questionnaire.container")}</TableHead>
                <TableHead className="text-sm font-bold uppercase">{t("questionnaire.productCode")}</TableHead>
                <TableHead className="text-sm font-bold uppercase w-[60px]">{t("questionnaire.action")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {components.map((comp) => (
                <TableRow key={comp.nopseq} className="h-[56px]">
                  {/* QTÉ BONNES */}
                  <TableCell className="w-[120px]">
                    <Popover
                      open={activeNumpad === `qty-${comp.nopseq}`}
                      onOpenChange={(open) => setActiveNumpad(open ? `qty-${comp.nopseq}` : null)}
                    >
                      <PopoverTrigger asChild>
                        <Input
                          value={qtyInputs[comp.nopseq] ?? String(comp.defaultQty || "")}
                          readOnly
                          className="touch-target !text-2xl font-bold cursor-pointer text-green-700 bg-white border-black w-[90px] h-[44px]"
                          placeholder="0"
                        />
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <NumPad
                          value={qtyInputs[comp.nopseq] ?? String(comp.defaultQty || "")}
                          onChange={(v) => setQtyInputs(prev => ({ ...prev, [comp.nopseq]: v }))}
                          onSubmit={() => setActiveNumpad(null)}
                          onClose={() => setActiveNumpad(null)}
                        />
                      </PopoverContent>
                    </Popover>
                  </TableCell>
                  {/* QTÉ DÉFECTUEUSES */}
                  <TableCell className="w-[120px]">
                    <Popover
                      open={activeNumpad === `def-${comp.nopseq}`}
                      onOpenChange={(open) => setActiveNumpad(open ? `def-${comp.nopseq}` : null)}
                    >
                      <PopoverTrigger asChild>
                        <Input
                          value={defectInputs[comp.nopseq] || "0"}
                          readOnly
                          className="touch-target !text-2xl font-bold cursor-pointer bg-white border-black w-[90px] h-[44px]"
                          placeholder="0"
                        />
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <NumPad
                          value={defectInputs[comp.nopseq] || "0"}
                          onChange={(v) => setDefectInputs(prev => ({ ...prev, [comp.nopseq]: v }))}
                          onSubmit={() => setActiveNumpad(null)}
                          onClose={() => setActiveNumpad(null)}
                        />
                      </PopoverContent>
                    </Popover>
                  </TableCell>
                  {/* CONTENANT */}
                  <TableCell className="w-[140px]">
                    <Input
                      value={containerInputs[comp.nopseq] || ""}
                      onChange={(e) => setContainerInputs(prev => ({ ...prev, [comp.nopseq]: e.target.value }))}
                      className="touch-target text-base bg-white border-black w-[120px] h-[36px]"
                      placeholder=""
                      type="number"
                    />
                  </TableCell>
                  {/* PRODUIT (CODE) */}
                  <TableCell className="text-base">
                    {loc(comp.desc_P, comp.desc_S)} ({comp.code})
                  </TableCell>
                  {/* ACTION "+" button */}
                  <TableCell>
                    <Button
                      variant="outline"
                      size="icon"
                      className="touch-target h-[38px] w-[50px] border-blue-500 text-blue-600 hover:bg-blue-50"
                      onClick={() => handleRowAdd(comp)}
                      disabled={rowLoading === comp.nopseq}
                    >
                      <Plus size={20} />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Big sheet info is shown in the SORTIE DE MATÉRIEL section, not as a separate input */}
    </div>
  );
}
