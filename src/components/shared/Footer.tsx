import { useTranslation } from "react-i18next";

export function Footer() {
  const { t } = useTranslation();

  return (
    <footer className="flex items-center justify-center px-3 py-1 border-t bg-muted/30 text-xs text-muted-foreground shrink-0">
      <span>
        {t("common.poweredBy")} <strong>AutoFAB</strong>
      </span>
    </footer>
  );
}
