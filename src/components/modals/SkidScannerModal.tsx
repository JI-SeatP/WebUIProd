import { useState, useCallback, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useSession } from "@/context/SessionContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { X } from "lucide-react";
import { getSkidInfo } from "@/api/modals";
import type { SkidInfo } from "@/types/modals";

interface SkidScannerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SkidScannerModal({ open, onOpenChange }: SkidScannerModalProps) {
  const { t } = useTranslation();
  const { state } = useSession();
  const lang = state.language;
  const inputRef = useRef<HTMLInputElement>(null);

  const [skidNo, setSkidNo] = useState("");
  const [info, setInfo] = useState<SkidInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setSkidNo("");
      setInfo(null);
      setError(null);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  const handleLookup = useCallback(async () => {
    if (!skidNo.trim()) return;
    setError(null);
    try {
      const res = await getSkidInfo(skidNo.trim());
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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleLookup();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{t("modals.enterScanSkid")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative">
            <Input
              ref={inputRef}
              value={skidNo}
              onChange={(e) => setSkidNo(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t("modals.scanSkid")}
              className="touch-target !text-[1.58rem] text-center font-bold pr-10"
              autoFocus
            />
            {skidNo && (
              <button
                type="button"
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-muted text-muted-foreground"
                onClick={() => { setSkidNo(""); setInfo(null); setError(null); inputRef.current?.focus(); }}
              >
                <X className="size-4" />
              </button>
            )}
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          {info && (
            <Card>
              <CardContent className="pt-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">{t("order.product")}:</span>
                  <span className="font-medium text-[1.08rem]">
                    {info.PRODUIT_CODE} — {lang === "fr" ? info.PRODUIT_P : info.PRODUIT_S}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">{t("order.quantity")}:</span>
                  <span className="font-mono font-bold text-[2rem]">{info.QTE}</span>
                </div>
                <div className="h-2" />
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">{t("production.warehouse")}:</span>
                  <span>
                    {info.ENTREPOT_CODE} — {lang === "fr" ? info.ENTREPOT_P : info.ENTREPOT_S}
                  </span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
