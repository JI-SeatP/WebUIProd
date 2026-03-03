import { useTranslation } from "react-i18next";
import { AlertTriangle } from "lucide-react";

interface DoNotPressAlertProps {
  itemCode?: string;
  panelCode?: string;
}

export function DoNotPressAlert({ itemCode, panelCode }: DoNotPressAlertProps) {
  const { t } = useTranslation();

  return (
    <div className="flex items-center gap-3 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
      <AlertTriangle size={24} className="text-amber-600 shrink-0" />
      <div>
        <div className="font-bold text-amber-700 dark:text-amber-400 text-lg">
          {t("messages.doNotPress")}
        </div>
        {itemCode && (
          <div className="text-sm text-amber-600 dark:text-amber-400">
            Item: {itemCode}
          </div>
        )}
        {panelCode && (
          <div className="text-sm text-amber-600 dark:text-amber-400">
            Panel: {panelCode}
          </div>
        )}
      </div>
    </div>
  );
}
