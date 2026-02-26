import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useSession } from "@/context/SessionContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Printer, Search } from "lucide-react";
import { searchLabels, printLabel } from "@/api/modals";
import { toast } from "sonner";
import type { LabelInfo } from "@/types/modals";

interface LabelPrintingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LabelPrintingModal({ open, onOpenChange }: LabelPrintingModalProps) {
  const { t } = useTranslation();
  const { state } = useSession();
  const lang = state.language;

  // Search mode
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<LabelInfo[]>([]);

  // Print qty
  const [printQty, setPrintQty] = useState<Record<number, string>>({});

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) return;
    try {
      const res = await searchLabels(searchQuery);
      if (res.success) {
        setSearchResults(res.data);
      }
    } catch {
      // handled
    }
  }, [searchQuery]);

  const handlePrint = useCallback(async (transac: number) => {
    const qty = Number(printQty[transac]) || 1;
    try {
      const res = await printLabel(transac, qty);
      if (res.success) {
        toast.success(t("modals.printLabel"));
      }
    } catch {
      toast.error(t("dialogs.error"));
    }
  }, [printQty, t]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[700px]">
        <DialogHeader>
          <DialogTitle>{t("modals.labelPrinting")}</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="search">
          <TabsList>
            <TabsTrigger value="search" className="touch-target">
              {t("actions.search")}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="search" className="space-y-3 mt-3">
            <div className="flex items-end gap-2">
              <div className="flex-1 flex flex-col gap-1">
                <Label className="text-sm text-muted-foreground">{t("actions.search")}</Label>
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  placeholder={t("order.number")}
                  className="touch-target"
                />
              </div>
              <Button className="touch-target gap-2" onClick={handleSearch}>
                <Search size={18} />
              </Button>
            </div>

            <div className="border rounded-md overflow-auto max-h-[300px]">
              <Table>
                <TableHeader>
                  <TableRow className="h-[56px]">
                    <TableHead>{t("order.number")}</TableHead>
                    <TableHead>{t("order.product")}</TableHead>
                    <TableHead>{t("order.client")}</TableHead>
                    <TableHead>{t("modals.qtyPerSkid")}</TableHead>
                    <TableHead>{t("common.actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {searchResults.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground h-[56px]">
                        {t("common.noResults")}
                      </TableCell>
                    </TableRow>
                  ) : (
                    searchResults.map((label) => (
                      <TableRow key={label.TRANSAC} className="h-[56px]">
                        <TableCell>{label.NO_PROD}</TableCell>
                        <TableCell>{lang === "fr" ? label.PRODUIT_P : label.PRODUIT_S}</TableCell>
                        <TableCell>{label.NOM_CLIENT}</TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min={1}
                            value={printQty[label.TRANSAC] ?? String(label.QTE_PAR_SKID)}
                            onChange={(e) =>
                              setPrintQty((prev) => ({
                                ...prev,
                                [label.TRANSAC]: e.target.value,
                              }))
                            }
                            className="w-[80px] touch-target font-mono"
                          />
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="touch-target"
                            onClick={() => handlePrint(label.TRANSAC)}
                          >
                            <Printer size={18} />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
