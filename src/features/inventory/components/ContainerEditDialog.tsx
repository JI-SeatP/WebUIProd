import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useSession } from "@/context/SessionContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Check, AlertTriangle } from "lucide-react";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { useContainerEdit } from "../hooks/useContainerEdit";

interface ContainerEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trseq: number | null;
}

export function ContainerEditDialog({
  open,
  onOpenChange,
  trseq,
}: ContainerEditDialogProps) {
  const { t } = useTranslation();
  const { state } = useSession();
  const lang = state.language;
  const { containers, loading, fetchContainers, saveQty } = useContainerEdit();
  const [editValues, setEditValues] = useState<Record<number, string>>({});

  useEffect(() => {
    if (open && trseq) {
      fetchContainers(trseq);
      setEditValues({});
    }
  }, [open, trseq, fetchContainers]);

  const handleSave = (cdseq: number) => {
    const val = editValues[cdseq];
    if (val !== undefined) {
      saveQty(cdseq, Number(val));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[700px]">
        <DialogHeader>
          <DialogTitle>{t("inventory.updateQty")}</DialogTitle>
        </DialogHeader>

        {/* Warning */}
        <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
          <AlertTriangle size={20} className="text-yellow-600 shrink-0 mt-0.5" />
          <p className="text-sm text-yellow-800">{t("inventory.countInstructions")}</p>
        </div>

        {loading ? (
          <LoadingSpinner />
        ) : (
          <div className="border rounded-md overflow-auto">
            <Table>
              <TableHeader>
                <TableRow className="h-[56px]">
                  <TableHead>{t("inventory.container")}</TableHead>
                  <TableHead>{t("order.product")}</TableHead>
                  <TableHead>{t("inventory.estimatedQty")}</TableHead>
                  <TableHead>{t("inventory.actualQty")}</TableHead>
                  <TableHead>{t("common.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {containers.map((c) => (
                  <TableRow key={c.CDSEQ} className="h-[56px]">
                    <TableCell>{c.CONTAINER}</TableCell>
                    <TableCell>
                      {c.PRODUIT_CODE} — {lang === "fr" ? c.PRODUIT_P : c.PRODUIT_S}
                    </TableCell>
                    <TableCell className="font-mono">{c.QTE_ESTIMEE}</TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={0}
                        value={editValues[c.CDSEQ] ?? String(c.QTE_REELLE)}
                        onChange={(e) =>
                          setEditValues((prev) => ({
                            ...prev,
                            [c.CDSEQ]: e.target.value,
                          }))
                        }
                        className="w-[100px] touch-target font-mono"
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="touch-target"
                        onClick={() => handleSave(c.CDSEQ)}
                      >
                        <Check size={18} />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
