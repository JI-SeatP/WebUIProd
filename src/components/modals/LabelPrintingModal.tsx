import { useState, useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useSession } from "@/context/SessionContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Printer, Search } from "lucide-react";
import { getOrderLabels, getOrderLabelsByNoProd, getLabelPdf } from "@/api/modals";
import { useKeyboard } from "@/context/KeyboardContext";
import { toast } from "sonner";
import type { FinishedProductLabel, OperationLabel } from "@/types/modals";

interface LabelPrintingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transac?: number;
  copmachine?: number;
}

export function LabelPrintingModal({ open, onOpenChange, transac, copmachine }: LabelPrintingModalProps) {
  const { t } = useTranslation();
  const { state } = useSession();
  const lang = state.language;
  const { isKeyboardOpen } = useKeyboard();

  const [searchQuery, setSearchQuery] = useState("");
  const [finishedProducts, setFinishedProducts] = useState<FinishedProductLabel[]>([]);
  const [operations, setOperations] = useState<OperationLabel[]>([]);
  const [noProd, setNoProd] = useState<string | null>(null);
  const [activeOpFilter, setActiveOpFilter] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState<string | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [previewPdfUrl, setPreviewPdfUrl] = useState<string | null>(null);
  const [isPdfLoading, setIsPdfLoading] = useState(false);
  const [activePreviewKey, setActivePreviewKey] = useState<string | null>(null);

  const formatDate = (iso: string | null | undefined) =>
    iso ? new Date(iso).toLocaleDateString(lang === "fr" ? "fr-CA" : "en-CA") : null;
  const formatTime = (iso: string | null | undefined) =>
    iso ? new Date(iso).toLocaleTimeString(lang === "fr" ? "fr-CA" : "en-CA", { hour: "2-digit", minute: "2-digit" }) : null;

  const loadLabels = useCallback((txn: number, cop?: number) => {
    getOrderLabels(txn, cop).then((res) => {
      if (res.success) {
        setFinishedProducts(res.data.finishedProducts);
        setOperations(res.data.operations);
        setNoProd(res.data.noProd);
        if (res.data.currentOpcode) {
          setActiveOpFilter(res.data.currentOpcode);
        }
      }
    });
  }, []);

  useEffect(() => {
    if (open && transac) {
      loadLabels(transac, copmachine);
    }
    if (!open) {
      setSearchQuery("");
      setFinishedProducts([]);
      setOperations([]);
      setActiveOpFilter(null);
      setDateFilter(null);
      setShowDatePicker(false);
      setPreviewPdfUrl(null);
      setActivePreviewKey(null);
      setNoProd(null);
    }
  }, [open, transac, copmachine, loadLabels]);

  const handleSearch = useCallback(async () => {
    const query = searchQuery.trim();
    if (!query) return;
    const res = await getOrderLabelsByNoProd(query);
    if (res.success) {
      setFinishedProducts(res.data.finishedProducts);
      setOperations(res.data.operations);
      setNoProd(res.data.noProd);
      if (res.data.currentOpcode) {
        setActiveOpFilter(res.data.currentOpcode);
      }
    } else {
      toast.info(t("common.noResults"));
    }
  }, [searchQuery, t]);

  const handlePreview = useCallback(async (type: "operation" | "pack", key: number) => {
    setIsPdfLoading(true);
    setPreviewPdfUrl(null);
    setActivePreviewKey(`${type}-${key}`);
    try {
      const res = await getLabelPdf(type, key, lang);
      if (res.success) {
        setPreviewPdfUrl(res.data.pdfUrl);
      } else {
        toast.error(t("dialogs.error"));
      }
    } catch {
      toast.error(t("dialogs.error"));
    } finally {
      setIsPdfLoading(false);
    }
  }, [lang, t]);

  const handlePrint = useCallback(() => {
    if (!previewPdfUrl) return;
    const win = window.open(previewPdfUrl, "_blank");
    if (win) {
      win.addEventListener("load", () => win.print());
    }
  }, [previewPdfUrl]);

  const EmptyRow = ({ colSpan }: { colSpan: number }) => (
    <TableRow>
      <TableCell colSpan={colSpan} className="text-center text-muted-foreground h-[56px]">
        {t("common.noResults")}
      </TableCell>
    </TableRow>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex flex-col"
        style={{
          maxWidth: "1380px",
          height: isKeyboardOpen ? undefined : "97vh",
          marginTop: "-2vh",
        }}
      >
        <DialogHeader>
          <DialogTitle>
            {t("modals.labelPrinting")}
            {noProd && <span className="text-blue-600 ml-2">{noProd}</span>}
          </DialogTitle>
        </DialogHeader>

        <div className="flex gap-4 flex-row flex-1 min-h-0">

        {/* ── Left: table area ── */}
        <div className="flex flex-col gap-4 overflow-y-auto pr-1 flex-1 min-h-0">
          {/* Search bar (only shown when no order context) */}
          {!transac && (
            <div className="flex gap-2">
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                placeholder={t("order.number")}
                className="touch-target"
              />
              <Button className="touch-target gap-2 shrink-0" onClick={handleSearch}>
                <Search className="size-[18px]" />
              </Button>
            </div>
          )}

          {/* Operation type buttons — PACK shows finished products, others show op labels */}
          {(() => {
            const opCodes = [...new Set(operations.map((o) => o.OPERATION_OPCODE))];
            const showPack = finishedProducts.length > 0 || opCodes.includes("PACK");
            const allCodes = [...opCodes.filter((c) => c !== "PACK"), ...(showPack ? ["PACK"] : [])];
            if (allCodes.length === 0) return null;

            return (
              <div className="flex flex-col gap-3 flex-1 min-h-0">
                <div className="flex gap-3 flex-wrap justify-center">
                  {allCodes.map((code) => {
                    const isActive = activeOpFilter === code;
                    return (
                      <button
                        key={code}
                        type="button"
                        onClick={() => { setActiveOpFilter(isActive ? null : code); setDateFilter(null); setShowDatePicker(false); setPreviewPdfUrl(null); setActivePreviewKey(null); }}
                        className="rounded-lg text-sm font-bold border-2 transition-all min-h-[44px]"
                        style={{
                          width: "180px",
                          backgroundColor: isActive ? "#aeffae" : "#f3f4f6",
                          color: "#000",
                          borderColor: isActive ? "#000" : "#d1d5db",
                        }}
                      >
                        {code}
                      </button>
                    );
                  })}
                </div>

                {/* PACK → Finished Products table */}
                {activeOpFilter === "PACK" && (
                  <div className="border rounded-md overflow-auto flex-1 min-h-0">
                    {(() => {
                      const fpDates = [...new Set(finishedProducts.map((fp) => formatDate(fp.PACK_DATE)).filter(Boolean))] as string[];
                      const fpFiltered = dateFilter ? finishedProducts.filter((fp) => formatDate(fp.PACK_DATE) === dateFilter) : finishedProducts;
                      return (
                        <>
                          {fpDates.length > 1 && (
                            <div className="flex gap-2 flex-wrap mb-2">
                              {fpDates.map((d) => (
                                <button key={d} type="button" onClick={() => setDateFilter(dateFilter === d ? null : d)}
                                  className="px-3 py-1 rounded border text-sm font-medium transition-all min-h-[36px]"
                                  style={{ backgroundColor: dateFilter === d ? "#aeffae" : "#f3f4f6", borderColor: dateFilter === d ? "#000" : "#d1d5db", color: "#000" }}>
                                  {d}
                                </button>
                              ))}
                            </div>
                          )}
                          <Table>
                            <TableHeader>
                              <TableRow className="h-[48px]">
                                <TableHead className="text-center">{lang === "fr" ? "Date" : "Date"}</TableHead>
                                <TableHead className="text-center">{lang === "fr" ? "Heure" : "Time"}</TableHead>
                                <TableHead className="w-[110px] text-center">SKID</TableHead>
                                <TableHead className="text-center">{lang === "fr" ? "No Série" : "Serial #"}</TableHead>
                                <TableHead>{lang === "fr" ? "Description" : "Description"}</TableHead>
                                <TableHead className="w-[70px] text-right">{lang === "fr" ? "Qté" : "Qty"}</TableHead>
                                <TableHead className="w-[60px]"></TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {fpFiltered.length === 0 ? (
                                <EmptyRow colSpan={7} />
                              ) : (
                                fpFiltered.map((fp) => (
                                  <TableRow key={`${fp.CONTENANT}-${fp.NO_SERIE_NSNO_SERIE}`} className="h-[56px] text-base" style={activePreviewKey === `pack-${fp.TRSEQ_EPF}` ? { backgroundColor: "#aeffae" } : undefined}>
                                    <TableCell className="text-center">{formatDate(fp.PACK_DATE) ?? "—"}</TableCell>
                                    <TableCell className="text-center">{formatTime(fp.PACK_DATE) ?? "—"}</TableCell>
                                    <TableCell className="text-[1.15em] font-bold text-center">{fp.CON_NUMERO}</TableCell>
                                    <TableCell className="text-center">{fp.NO_SERIE_NSNO_SERIE ?? "—"}</TableCell>
                                    <TableCell>{lang === "fr" ? fp.INDESC1 : fp.INDESC2}</TableCell>
                                    <TableCell className="text-[1.15em] font-bold text-right">{fp.DCO_QTE_INV}</TableCell>
                                    <TableCell className="pl-[40px]">
                                      <Button variant="ghost" size="icon" className="h-[40px] w-[40px]" onClick={() => handlePreview("pack", fp.TRSEQ_EPF)}>
                                        <Printer className="size-[18px]" />
                                      </Button>
                                    </TableCell>
                                  </TableRow>
                                ))
                              )}
                            </TableBody>
                            {fpFiltered.length > 0 && (
                              <TableFooter>
                                <TableRow className="h-[48px] font-bold text-base">
                                  <TableCell colSpan={5} className="text-right">{lang === "fr" ? "Total" : "Total"}</TableCell>
                                  <TableCell className="text-[1.15em] font-bold text-right">
                                    {fpFiltered.reduce((sum, fp) => sum + fp.DCO_QTE_INV, 0)}
                                  </TableCell>
                                  <TableCell />
                                </TableRow>
                              </TableFooter>
                            )}
                          </Table>
                        </>
                      );
                    })()}
                  </div>
                )}

                {/* PRESS / CNC / SAND → Operation labels table */}
                {activeOpFilter && activeOpFilter !== "PACK" && (
                  <div className="border rounded-md overflow-auto flex-1 min-h-0">
                    {(() => {
                      const opRows = operations.filter((o) => o.OPERATION_OPCODE === activeOpFilter);
                      const opDates = [...new Set(opRows.map((o) => formatDate(o.TJDEBUTDATE)).filter(Boolean))] as string[];
                      const opFiltered = dateFilter ? opRows.filter((o) => formatDate(o.TJDEBUTDATE) === dateFilter) : opRows;
                      return (
                        <>
                          {opDates.length > 1 && (
                            <div className="flex gap-2 flex-wrap p-2">
                              {opDates.map((d) => (
                                <button key={d} type="button" onClick={() => setDateFilter(dateFilter === d ? null : d)}
                                  className="px-3 py-1 rounded border text-sm font-medium transition-all min-h-[36px]"
                                  style={{ backgroundColor: dateFilter === d ? "#aeffae" : "#f3f4f6", borderColor: dateFilter === d ? "#000" : "#d1d5db", color: "#000" }}>
                                  {d}
                                </button>
                              ))}
                            </div>
                          )}
                          <Table>
                            <TableHeader>
                              <TableRow className="h-[48px]">
                                <TableHead className="text-center">{lang === "fr" ? "Date" : "Date"}</TableHead>
                                <TableHead className="text-center">{lang === "fr" ? "Heure" : "Time"}</TableHead>
                                <TableHead>{lang === "fr" ? "Machine" : "Machine"}</TableHead>
                                <TableHead className="w-[70px] text-right">{lang === "fr" ? "Qté" : "Qty"}</TableHead>
                                <TableHead className="w-[60px]"></TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {opFiltered.map((op) => (
                                <TableRow key={op.TJSEQ} className="h-[56px] text-base" style={activePreviewKey === `operation-${op.TJSEQ}` ? { backgroundColor: "#aeffae" } : undefined}>
                                  <TableCell className="text-center">{formatDate(op.TJDEBUTDATE) ?? "—"}</TableCell>
                                  <TableCell className="text-center">{formatTime(op.TJDEBUTDATE) ?? "—"}</TableCell>
                                  <TableCell>{lang === "fr" ? op.MACHINE_MADESC_P : op.MACHINE_MADESC_S}</TableCell>
                                  <TableCell className="text-[1.15em] font-bold text-right">{op.TJQTEPROD}</TableCell>
                                  <TableCell className="pl-[40px]">
                                    <Button variant="ghost" size="icon" className="h-[40px] w-[40px]" onClick={() => handlePreview("operation", op.TJSEQ)}>
                                      <Printer className="size-[18px]" />
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                            {opFiltered.length > 0 && (
                              <TableFooter>
                                <TableRow className="h-[48px] font-bold text-base">
                                  <TableCell colSpan={3} className="text-right">{lang === "fr" ? "Total" : "Total"}</TableCell>
                                  <TableCell className="text-[1.15em] font-bold text-right">
                                    {opFiltered.reduce((sum, op) => sum + op.TJQTEPROD, 0)}
                                  </TableCell>
                                  <TableCell />
                                </TableRow>
                              </TableFooter>
                            )}
                          </Table>
                        </>
                      );
                    })()}
                  </div>
                )}
              </div>
            );
          })()}
        </div>{/* end left table area */}

        {/* ── Right: label preview panel (always visible) ── */}
        <div className="flex flex-col border rounded-lg overflow-hidden shrink-0 bg-gray-100" style={{ width: "435px" }}>
          <div className="flex-1 min-h-0 relative">
            {isPdfLoading && (
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-muted-foreground text-sm">Loading...</span>
              </div>
            )}
            {previewPdfUrl && (
              <iframe
                src={`${previewPdfUrl}#toolbar=0&navpanes=0&scrollbar=0&view=FitH`}
                className="w-full h-full border-0"
                title="Label Preview"
              />
            )}
          </div>
          <div className="p-3 border-t flex justify-center shrink-0 bg-white">
            <Button
              className="gap-2 min-h-[48px] px-10 text-base font-bold"
              onClick={handlePrint}
              disabled={!previewPdfUrl}
            >
              <Printer className="size-[18px]" />
              PRINT
            </Button>
          </div>
        </div>

        </div>{/* end outer flex */}
      </DialogContent>
    </Dialog>
  );
}
