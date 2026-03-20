import React from "react";
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
import { useTranslation } from "react-i18next";
import { W_CONFIRM_DIALOG } from "@/constants/widths";
import { cn } from "@/lib/utils";

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  variant?: "default" | "destructive";
  /** Width grows with title content (e.g. two nowrap lines); still capped by viewport */
  fitContent?: boolean;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  cancelLabel,
  onConfirm,
  variant: _variant = "default",
  fitContent = false,
}: ConfirmDialogProps) {
  const { t } = useTranslation();

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent
        className={cn(
          fitContent ? W_CONFIRM_DIALOG.contentFit : W_CONFIRM_DIALOG.contentMax,
          "!p-[calc(1.5rem*1.15)] gap-[calc(1rem*1.15)]",
        )}
      >
        <AlertDialogHeader
          className={cn(
            fitContent && "w-full min-w-0 place-items-start text-left",
          )}
        >
          <AlertDialogTitle
            className={cn(
              "text-[calc(1.25rem*1.15)] leading-snug",
              fitContent && "min-w-0 w-full max-w-full overflow-x-auto",
            )}
          >
            {title}
          </AlertDialogTitle>
          <AlertDialogDescription
            className={description ? "text-[calc(1.125rem*1.15)]" : "sr-only"}
          >
            {description ?? "\u00a0"}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter
          className={cn("flex gap-[calc(0.75rem*1.15)]", fitContent && "w-full min-w-0")}
        >
          <AlertDialogCancel className="min-h-[calc(48px*1.15)] text-[calc(1.125rem*1.15)] flex-1">
            {cancelLabel ?? t("actions.cancel")}
          </AlertDialogCancel>
          <AlertDialogAction
            className="min-h-[calc(48px*1.15)] text-[calc(1.125rem*1.15)] flex-1"
            style={{ backgroundColor: "#16a34a", color: "white" }}
            onClick={onConfirm}
          >
            {confirmLabel ?? t("actions.confirm")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
