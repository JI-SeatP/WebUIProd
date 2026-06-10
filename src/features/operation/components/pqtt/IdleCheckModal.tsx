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
import { formatPieceTimer } from "../../hooks/usePieceTimer";

interface IdleCheckModalProps {
  open: boolean;
  /** Current elapsed seconds on the in-flight piece. */
  pieceSeconds: number;
  /** Target time per piece (seconds) — for context in the body text. */
  targetSeconds: number;
  /** User picks "Yes, still working" — keep the same PRDETSEQ, dismiss. */
  onContinue: () => void;
  /** User picks "No, close run" — close PRSEQ + flip status to PAUSE. */
  onStop: () => void;
}

/**
 * Fires when the in-flight piece timer exceeds 2 × target time per piece —
 * a strong signal that the operator may have walked away from the machine.
 * Two choices:
 *   - Continue: stays on the current PRDETSEQ, timer keeps ticking.
 *   - Close run: closes the PRSEQ and reverts the operation to PAUSE so the
 *     operator can decide what to do next.
 */
export function IdleCheckModal({
  open,
  pieceSeconds,
  targetSeconds,
  onContinue,
  onStop,
}: IdleCheckModalProps) {
  const { t } = useTranslation();

  return (
    <AlertDialog open={open} onOpenChange={(o) => !o && onContinue()}>
      <AlertDialogContent className="max-w-[520px] !top-8 !translate-y-0">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-xl">
            {t("pqtt.idle.title")}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-base">
            {t("pqtt.idle.body", {
              elapsed: formatPieceTimer(pieceSeconds),
              target: formatPieceTimer(targetSeconds),
            })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col gap-2 sm:flex-row">
          <Button
            className="min-h-[56px] text-base flex-1 font-semibold"
            style={{ backgroundColor: "#16a34a", color: "#ffffff" }}
            onClick={onContinue}
          >
            {t("pqtt.idle.continue")}
          </Button>
          <Button
            variant="outline"
            className="min-h-[56px] text-base flex-1"
            onClick={onStop}
          >
            {t("pqtt.idle.stop")}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
