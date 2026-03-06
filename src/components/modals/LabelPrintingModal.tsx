import { useState, useCallback, useEffect, useRef } from "react";
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
import { Filter, Printer, Search } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { getOrderLabels, getOrderLabelsByNoProd, getLabelData } from "@/api/modals";
import { useKeyboard } from "@/context/KeyboardContext";
import { toast } from "sonner";
import type { FinishedProductLabel, OperationLabel, PressLabelData, PackLabelData } from "@/types/modals";
import { PressingLabel } from "@/components/labels/PressingLabel";
import { CNCLabel } from "@/components/labels/CNCLabel";
import { PackLabel } from "@/components/labels/PackLabel";

/* ── Operator multiselect dropdown ───────────────────────────────────────── */
function ColFilterDropdown({
  operators,
  selected,
  onChange,
  lang,
}: {
  operators: string[];
  selected: string[];
  onChange: (v: string[]) => void;
  lang: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div ref={ref} className="relative inline-flex">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="relative p-1 rounded hover:bg-gray-200 transition-colors"
      >
        <Filter
          className="size-[13px]"
          style={{ color: selected.length > 0 ? "#2563eb" : undefined }}
        />
        {selected.length > 0 && (
          <span className="absolute top-0 right-0 w-[7px] h-[7px] bg-blue-500 rounded-full" />
        )}
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 z-[200] bg-white border rounded-md shadow-md p-2 w-[285px] flex flex-col gap-2">
          {operators.map((op) => (
            <label key={op} className="flex items-center gap-2 cursor-pointer min-h-[40px]">
              <Checkbox
                checked={selected.includes(op)}
                onCheckedChange={(checked) =>
                  onChange(checked ? [...selected, op] : selected.filter((o) => o !== op))
                }
              />
              <span className="text-lg leading-tight font-medium">{op}</span>
            </label>
          ))}
          {selected.length > 0 && (
            <button
              type="button"
              onClick={() => onChange([])}
              className="text-xs text-blue-600 hover:underline text-left mt-1"
            >
              {lang === "fr" ? "Effacer le filtre" : "Clear filter"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

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
  const [operatorFilter, setOperatorFilter] = useState<string[]>([]);
  const [shiftFilter, setShiftFilter] = useState<string[]>([]);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [labelData, setLabelData] = useState<PressLabelData | PackLabelData | null>(null);
  const [previewOpcode, setPreviewOpcode] = useState<string | null>(null);
  const [isLabelLoading, setIsLabelLoading] = useState(false);
  const [activePreviewKey, setActivePreviewKey] = useState<string | null>(null);
  const labelRef = useRef<HTMLDivElement>(null);

  const formatDate = (iso: string | null | undefined) =>
    iso ? new Date(iso).toLocaleDateString(lang === "fr" ? "fr-CA" : "en-CA") : null;
  const formatTime = (iso: string | null | undefined) =>
    iso ? new Date(iso).toLocaleTimeString(lang === "fr" ? "fr-CA" : "en-CA", { hour: "2-digit", minute: "2-digit" }) : null;
  const getShift = (iso: string | null | undefined): string => {
    if (!iso) return "—";
    const d = new Date(iso);
    const mins = d.getHours() * 60 + d.getMinutes();
    if (mins >= 7 * 60 && mins <= 15 * 60 + 30) return "Shift 1";
    if (mins >= 15 * 60 + 31)                   return "Shift 2";
    return "Shift 3"; // 0:00–6:59
  };

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
      setOperatorFilter([]);
      setShiftFilter([]);
      setShowDatePicker(false);
      setLabelData(null);
      setPreviewOpcode(null);
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

  const handlePreview = useCallback(async (
    type: "operation" | "pack",
    transac: number,
    nopseqOrContenant: number,
    tjseqOrInnoinv: number | string,
    opcode?: string,
  ) => {
    setIsLabelLoading(true);
    setLabelData(null);
    setPreviewOpcode(opcode ?? null);
    setActivePreviewKey(`${type}-${tjseqOrInnoinv}`);
    try {
      const res = type === "operation"
        ? await getLabelData("operation", transac, nopseqOrContenant as number, tjseqOrInnoinv as number)
        : await getLabelData("pack", transac, nopseqOrContenant as number, tjseqOrInnoinv as string);
      if (res.success) {
        setLabelData(res.data);
      } else {
        toast.error(t("dialogs.error"));
      }
    } catch {
      toast.error(t("dialogs.error"));
    } finally {
      setIsLabelLoading(false);
    }
  }, [t]);

  const handlePrint = useCallback(() => {
    if (!labelRef.current) return;
    const html = labelRef.current.innerHTML;
    const win = window.open("", "_blank", "width=450,height=700");
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head><title>Label</title>
      <style>* { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: sans-serif; } @media print { body { margin: 0; } }</style>
      </head><body>${html}</body></html>`);
    win.document.close();
    win.addEventListener("load", () => { win.focus(); win.print(); });
  }, []);

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
          maxWidth: "1587px",
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
                        onClick={() => { setActiveOpFilter(isActive ? null : code); setDateFilter(null); setOperatorFilter([]); setShiftFilter([]); setShowDatePicker(false); setLabelData(null); setPreviewOpcode(null); setActivePreviewKey(null); }}
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
                      const fpAfterDate = dateFilter ? finishedProducts.filter((fp) => formatDate(fp.PACK_DATE) === dateFilter) : finishedProducts;
                      const fpShifts = [...new Set(fpAfterDate.map((fp) => getShift(fp.PACK_DATE)).filter((s) => s !== "—"))].sort();
                      const fpFiltered = shiftFilter.length > 0 ? fpAfterDate.filter((fp) => shiftFilter.includes(getShift(fp.PACK_DATE))) : fpAfterDate;
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
                                <TableHead className="text-center">
                                  <div className="flex items-center justify-center gap-1">
                                    <span>{lang === "fr" ? "Quart" : "Shift"}</span>
                                    {fpShifts.length > 1 && (
                                      <ColFilterDropdown operators={fpShifts} selected={shiftFilter} onChange={setShiftFilter} lang={lang} />
                                    )}
                                  </div>
                                </TableHead>
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
                                <EmptyRow colSpan={8} />
                              ) : (
                                fpFiltered.map((fp, i) => (
                                  <TableRow key={`${fp.CONTENANT}-${fp.NO_SERIE_NSNO_SERIE}`} className="h-[56px] text-base" style={{
                                    ...(activePreviewKey === `pack-${fp.TRSEQ_EPF}` ? { backgroundColor: "#aeffae" } : {}),
                                    ...(i > 0 && formatDate(fp.PACK_DATE) !== formatDate(fpFiltered[i - 1].PACK_DATE) ? { borderTop: "2px solid #000" } : {}),
                                  }}>
                                    <TableCell className="text-center">{formatDate(fp.PACK_DATE) ?? "—"}</TableCell>
                                    <TableCell className="text-center">{getShift(fp.PACK_DATE)}</TableCell>
                                    <TableCell className="text-center">{formatTime(fp.PACK_DATE) ?? "—"}</TableCell>
                                    <TableCell className="text-[1.15em] font-bold text-center">{fp.CON_NUMERO}</TableCell>
                                    <TableCell className="text-center">{fp.NO_SERIE_NSNO_SERIE ?? "—"}</TableCell>
                                    <TableCell>{lang === "fr" ? fp.INDESC1 : fp.INDESC2}</TableCell>
                                    <TableCell className="text-[1.15em] font-bold text-right">{fp.DCO_QTE_INV}</TableCell>
                                    <TableCell className="pl-[40px]">
                                      <Button variant="ghost" size="icon" className="h-[40px] w-[40px]" onClick={() => handlePreview("pack", transac!, fp.CONTENANT, fp.INNOINV, "PACK")}>
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
                                  <TableCell colSpan={6} className="text-right">{lang === "fr" ? "Total" : "Total"}</TableCell>
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
                      const opOperators = ([...new Set(opRows.map((o) => o.EMPLOYE_EMNOM).filter(Boolean))] as string[]).sort();
                      const opAfterOp = operatorFilter.length > 0 ? opRows.filter((o) => operatorFilter.includes(o.EMPLOYE_EMNOM ?? "")) : opRows;
                      const opShifts = [...new Set(opAfterOp.map((o) => getShift(o.TJFINDATE)).filter((s) => s !== "—"))].sort();
                      const opAfterShift = shiftFilter.length > 0 ? opAfterOp.filter((o) => shiftFilter.includes(getShift(o.TJFINDATE))) : opAfterOp;
                      const opDates = [...new Set(opAfterShift.map((o) => formatDate(o.TJDEBUTDATE)).filter(Boolean))] as string[];
                      const opFiltered = dateFilter ? opAfterShift.filter((o) => formatDate(o.TJDEBUTDATE) === dateFilter) : opAfterShift;
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
                              <TableRow>
                                <TableHead className="text-center">{lang === "fr" ? "Date" : "Date"}</TableHead>
                                <TableHead className="text-center">
                                  <div className="flex items-center justify-center gap-1">
                                    <span>{lang === "fr" ? "Quart" : "Shift"}</span>
                                    {opShifts.length > 1 && (
                                      <ColFilterDropdown operators={opShifts} selected={shiftFilter} onChange={setShiftFilter} lang={lang} />
                                    )}
                                  </div>
                                </TableHead>
                                <TableHead className="text-center">{lang === "fr" ? "Heure" : "Time"}</TableHead>
                                <TableHead>{lang === "fr" ? "Machine" : "Machine"}</TableHead>
                                <TableHead className="w-[50px] text-center">ID</TableHead>
                                <TableHead className="w-[130px]">
                                  <div className="flex items-center gap-1">
                                    <span>{lang === "fr" ? "Opérateur" : "Operator"}</span>
                                    {opOperators.length > 1 && (
                                      <ColFilterDropdown
                                        operators={opOperators}
                                        selected={operatorFilter}
                                        onChange={setOperatorFilter}
                                        lang={lang}
                                      />
                                    )}
                                  </div>
                                </TableHead>
                                <TableHead className="w-[70px] text-right">{lang === "fr" ? "Qté" : "Qty"}</TableHead>
                                <TableHead className="w-[60px]"></TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {opFiltered.map((op, i) => (
                                <TableRow key={op.TJSEQ} className="h-[56px] text-base" style={{
                                  ...(activePreviewKey === `operation-${op.TJSEQ}` ? { backgroundColor: "#aeffae" } : {}),
                                  ...(i > 0 && formatDate(op.TJDEBUTDATE) !== formatDate(opFiltered[i - 1].TJDEBUTDATE) ? { borderTop: "2px solid #000" } : {}),
                                }}>
                                  <TableCell className="text-center">{formatDate(op.TJDEBUTDATE) ?? "—"}</TableCell>
                                  <TableCell className="text-center">{getShift(op.TJFINDATE)}</TableCell>
                                  <TableCell className="text-center">{op.TIME ?? "—"}</TableCell>
                                  <TableCell>{lang === "fr" ? op.MACHINE_MADESC_P : op.MACHINE_MADESC_S}</TableCell>
                                  <TableCell className="w-[50px] text-center">{op.EMPLOYE_EMNO ?? "—"}</TableCell>
                                  <TableCell className="w-[100px]">{op.EMPLOYE_EMNOM ?? "—"}</TableCell>
                                  <TableCell className="text-[1.15em] font-bold text-right">{op.TJQTEPROD}</TableCell>
                                  <TableCell className="pl-[40px]">
                                    <Button variant="ghost" size="icon" className="h-[40px] w-[40px]" onClick={() => handlePreview("operation", op.TRANSAC, op.CNOMENCOP, op.TJSEQ, op.OPERATION_OPCODE)}>
                                      <Printer className="size-[18px]" />
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                            {opFiltered.length > 0 && (
                              <TableFooter>
                                <TableRow className="h-[48px] font-bold text-base">
                                  <TableCell colSpan={6} className="text-right">{lang === "fr" ? "Total" : "Total"}</TableCell>
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
          <div className="flex-1 min-h-0 relative overflow-auto flex items-start justify-center p-3">
            {isLabelLoading && (
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-muted-foreground text-sm">Loading...</span>
              </div>
            )}
            {labelData && previewOpcode && (
              <div ref={labelRef}>
                {previewOpcode === "CNC" ? (
                  <CNCLabel data={labelData as PressLabelData} />
                ) : previewOpcode === "PACK" ? (
                  <PackLabel data={labelData as PackLabelData} lang={lang} />
                ) : (
                  <PressingLabel data={labelData as PressLabelData} opcode={previewOpcode} />
                )}
              </div>
            )}
          </div>
          <div className="p-3 border-t flex justify-center shrink-0 bg-white">
            <Button
              className="gap-2 min-h-[48px] px-10 text-base font-bold"
              onClick={handlePrint}
              disabled={!labelData}
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
