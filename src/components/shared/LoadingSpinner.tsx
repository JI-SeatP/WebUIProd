import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

interface LoadingSpinnerProps {
  className?: string;
  message?: string;
}

export function LoadingSpinner({ className, message }: LoadingSpinnerProps) {
  const { t } = useTranslation();

  return (
    <div className={cn("flex flex-col items-center justify-center gap-3 py-8", className)}>
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
      <p className="text-sm text-muted-foreground">
        {message ?? t("dialogs.loading")}
      </p>
    </div>
  );
}
