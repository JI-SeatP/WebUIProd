import { useTranslation } from "react-i18next";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface EmployeeMismatchModalProps {
  open: boolean;
  /** EMP_NUM that was picked in the OPConfirmModal. */
  pickedEmpNum: string;
  /** EMP_NOM (name) of the picked employee. */
  pickedEmpNom: string;
  /** EMP_NUM of the currently logged-in user, for display. */
  sessionEmpNum: string;
  /** EMP_NOM of the currently logged-in user, for display. */
  sessionEmpNom: string;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Shown after OPConfirmModal when the picked operator differs from the
 * logged-in session user (#51). Yes → proceed; No → roll back.
 */
export function EmployeeMismatchModal({
  open,
  pickedEmpNum,
  pickedEmpNom,
  sessionEmpNum,
  sessionEmpNom,
  onConfirm,
  onCancel,
}: EmployeeMismatchModalProps) {
  const { t } = useTranslation();

  return (
    <AlertDialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <AlertDialogContent className="max-w-[520px] !top-8 !translate-y-0">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-xl">
            {t("pqtt.empMismatch.title")}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-base">
            {t("pqtt.empMismatch.body")}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="mt-1 text-base flex flex-col gap-1">
          <div className="flex items-baseline gap-2">
            <span className="text-muted-foreground shrink-0">
              {t("pqtt.empMismatch.pickedLabel")}
            </span>
            <span className="font-bold text-blue-700">{pickedEmpNum}</span>
            <span className="text-blue-900 truncate">{pickedEmpNom}</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-muted-foreground shrink-0">
              {t("pqtt.empMismatch.loggedInLabel")}
            </span>
            <span className="font-bold text-blue-700">{sessionEmpNum}</span>
            <span className="text-blue-900 truncate">{sessionEmpNom}</span>
          </div>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel
            className="min-h-[48px] text-base flex-1"
            onClick={onCancel}
          >
            {t("pqtt.empMismatch.no")}
          </AlertDialogCancel>
          <AlertDialogAction
            className="min-h-[48px] text-base flex-1"
            style={{ backgroundColor: "#16a34a", color: "#ffffff" }}
            onClick={onConfirm}
          >
            {t("pqtt.empMismatch.yes")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
