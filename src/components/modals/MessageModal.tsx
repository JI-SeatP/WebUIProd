import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";
import { sendMessage } from "@/api/modals";
import { toast } from "sonner";

interface MessageModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MessageModal({ open, onOpenChange }: MessageModalProps) {
  const { t } = useTranslation();
  const [machine, setMachine] = useState("");
  const [station, setStation] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSend = useCallback(async () => {
    if (!message.trim()) return;
    setLoading(true);
    try {
      const res = await sendMessage({ machine, station, message });
      if (res.success) {
        toast.success(t("modals.messageSent"));
        setMachine("");
        setStation("");
        setMessage("");
        onOpenChange(false);
      }
    } catch {
      toast.error(t("dialogs.error"));
    } finally {
      setLoading(false);
    }
  }, [machine, station, message, onOpenChange, t]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{t("modals.sendMessage")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex flex-col gap-1">
            <Label className="text-sm text-muted-foreground">
              {t("modals.machineStation")}
            </Label>
            <div className="flex gap-2">
              <Input
                value={machine}
                onChange={(e) => setMachine(e.target.value)}
                placeholder={t("operation.machine")}
                className="touch-target"
              />
              <Input
                value={station}
                onChange={(e) => setStation(e.target.value)}
                placeholder="Station"
                className="touch-target"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <Label className="text-sm text-muted-foreground">
              {t("modals.problemMessage")}
            </Label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={t("modals.problemMessage")}
              rows={4}
              className="text-base"
            />
          </div>

          <div className="flex justify-end">
            <Button
              className="touch-target gap-2 text-lg"
              onClick={handleSend}
              disabled={loading || !message.trim()}
            >
              <Send size={18} />
              {t("modals.sendMessage")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
