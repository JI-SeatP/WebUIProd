import { useTranslation } from "react-i18next";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

interface AddFinishedPieceBeforeCloseModalProps {
  open: boolean;
  /** User chose +1 Good. */
  onAddGood: () => void;
  /** User chose +1 Defective. */
  onAddDef: () => void;
  /** User chose No (close without logging a piece). */
  onSkip: () => void;
}

/**
 * Shown when the operator changes status away from PROD with a piece still
 * in flight (#19). Three buttons:
 *   +1 Good     (green)
 *   +1 Defective (red)
 *   No          (neutral)
 */
export function AddFinishedPieceBeforeCloseModal({
  open,
  onAddGood,
  onAddDef,
  onSkip,
}: AddFinishedPieceBeforeCloseModalProps) {
  const { t } = useTranslation();

  return (
    <AlertDialog open={open} onOpenChange={(o) => !o && onSkip()}>
      <AlertDialogContent className="max-w-[520px]">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-xl">
            {t("pqtt.addPieceBeforeClose.title")}
          </AlertDialogTitle>
          <AlertDialogDescription className="sr-only">
            {t("pqtt.addPieceBeforeClose.title")}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col gap-2 sm:flex-row">
          <Button
            className="min-h-[56px] text-base flex-1 border-2 font-semibold"
            style={{ backgroundColor: "#C1F6CA", color: "#000", borderColor: "#000" }}
            onClick={onAddGood}
          >
            {t("pqtt.addPieceBeforeClose.addGood")}
          </Button>
          <Button
            className="min-h-[56px] text-base flex-1 border-2 font-semibold"
            style={{ backgroundColor: "#F8CECC", color: "#000", borderColor: "#000" }}
            onClick={onAddDef}
          >
            {t("pqtt.addPieceBeforeClose.addDef")}
          </Button>
          <Button
            variant="outline"
            className="min-h-[56px] text-base flex-1"
            onClick={onSkip}
          >
            {t("pqtt.addPieceBeforeClose.no")}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
