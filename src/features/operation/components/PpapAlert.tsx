import { useTranslation } from "react-i18next";
import { ShieldAlert } from "lucide-react";

interface PpapAlertProps {
  description?: string;
  number?: string;
}

export function PpapAlert({ description, number }: PpapAlertProps) {
  const { t } = useTranslation();

  return (
    <div className="flex items-center gap-3 p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg">
      <ShieldAlert size={24} className="text-red-600 shrink-0" />
      <div>
        <div className="font-semibold text-red-700 dark:text-red-400">
          {t("messages.underPPAP")}
        </div>
        {description && (
          <div className="text-sm text-red-600 dark:text-red-400">
            {description} {number && `(#${number})`}
          </div>
        )}
        <div className="text-sm text-red-600 dark:text-red-400 mt-1">
          {t("dialogs.supervisorApproval")}
        </div>
      </div>
    </div>
  );
}
