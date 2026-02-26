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
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Check } from "lucide-react";
import { getTransferInfo, submitTransfer } from "@/api/modals";
import { toast } from "sonner";
import type { TransferInfo } from "@/types/modals";

interface WarehouseTransferModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function WarehouseTransferModal({ open, onOpenChange }: WarehouseTransferModalProps) {
  const { t } = useTranslation();
  const { state } = useSession();
  const lang = state.language;

  const [skidNo, setSkidNo] = useState("");
  const [info, setInfo] = useState<TransferInfo | null>(null);
  const [destination, setDestination] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setSkidNo("");
      setInfo(null);
      setDestination("");
      setError(null);
    }
  }, [open]);

  const handleLookup = useCallback(async () => {
    if (!skidNo.trim()) return;
    setError(null);
    try {
      const res = await getTransferInfo(skidNo.trim());
      if (res.success && res.data) {
        setInfo(res.data);
      } else {
        setInfo(null);
        setError(res.error ?? "SKID not found");
      }
    } catch {
      setError("Lookup failed");
    }
  }, [skidNo]);

  const handleTransfer = useCallback(async () => {
    if (!info || !destination.trim()) return;
    setLoading(true);
    try {
      const res = await submitTransfer(info.SKID, destination.trim());
      if (res.success) {
        toast.success(t("modals.transferComplete"));
        onOpenChange(false);
      }
    } catch {
      toast.error(t("dialogs.error"));
    } finally {
      setLoading(false);
    }
  }, [info, destination, onOpenChange, t]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{t("modals.warehouseTransfer")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* SKID input */}
          <div className="flex items-center gap-2">
            <Label className="shrink-0">{t("modals.skidNumber")}:</Label>
            <Input
              value={skidNo}
              onChange={(e) => setSkidNo(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLookup()}
              placeholder={t("modals.scanSkid")}
              className="touch-target text-lg font-mono"
              autoFocus
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          {/* Current location */}
          {info && (
            <>
              <Card>
                <CardContent className="pt-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">{t("modals.currentLocation")}:</span>
                    <span className="font-medium">
                      {info.CURRENT_ENTREPOT_CODE} — {lang === "fr" ? info.CURRENT_ENTREPOT_P : info.CURRENT_ENTREPOT_S}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Destination */}
              <div className="flex flex-col gap-1">
                <Label className="text-sm text-muted-foreground">{t("modals.destination")}:</Label>
                <Input
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  placeholder={t("modals.destination")}
                  className="touch-target"
                />
              </div>

              <div className="flex justify-end">
                <Button
                  className="touch-target gap-2 text-lg bg-green-600 hover:bg-green-700 text-white"
                  onClick={handleTransfer}
                  disabled={loading || !destination.trim()}
                >
                  <Check size={20} />
                  OK
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
