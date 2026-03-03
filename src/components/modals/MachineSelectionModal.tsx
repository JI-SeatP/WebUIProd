import { useTranslation } from "react-i18next";
import { useSession } from "@/context/SessionContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface MachineSelectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MachineSelectionModal({ open, onOpenChange }: MachineSelectionModalProps) {
  const { t } = useTranslation();
  const { state, dispatch } = useSession();
  const lang = state.language;

  const handleSelect = (maseq: string) => {
    const machine = state.machines.find((m) => m.MASEQ === Number(maseq));
    if (machine) {
      dispatch({ type: "SET_MACHINES", payload: { machines: [machine] } });
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[400px]">
        <DialogHeader>
          <DialogTitle>{t("modals.machineSelection")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex flex-col gap-2">
            <Label className="text-sm text-muted-foreground">
              {t("modals.selectMachine")}
            </Label>
            <Select onValueChange={handleSelect}>
              <SelectTrigger className="touch-target text-base">
                <SelectValue placeholder={t("modals.selectMachine")} />
              </SelectTrigger>
              <SelectContent>
                {state.machines.map((machine) => (
                  <SelectItem
                    key={machine.MASEQ}
                    value={String(machine.MASEQ)}
                    className="touch-target"
                  >
                    {machine.MACODE} — {lang === "fr" ? machine.MADESC_P : machine.MADESC_S}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {state.machines.length === 0 && (
            <p className="text-sm text-muted-foreground">{t("common.noResults")}</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
