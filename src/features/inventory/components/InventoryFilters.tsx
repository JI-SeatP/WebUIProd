import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";

interface InventoryFiltersProps {
  transactionNo: string;
  productNo: string;
  contains: string;
  onTransactionNoChange: (v: string) => void;
  onProductNoChange: (v: string) => void;
  onContainsChange: (v: string) => void;
  onSearch: () => void;
}

export function InventoryFilters({
  transactionNo,
  productNo,
  contains,
  onTransactionNoChange,
  onProductNoChange,
  onContainsChange,
  onSearch,
}: InventoryFiltersProps) {
  const { t } = useTranslation();

  return (
    <div className="flex items-end gap-3 flex-wrap">
      <div className="flex flex-col gap-1">
        <Label className="text-sm text-muted-foreground">
          {t("inventory.transactionNo")} *
        </Label>
        <Input
          value={transactionNo}
          onChange={(e) => onTransactionNoChange(e.target.value)}
          placeholder={t("inventory.transactionNo")}
          className="touch-target"
        />
      </div>
      <div className="flex flex-col gap-1">
        <Label className="text-sm text-muted-foreground">{t("inventory.productNo")}</Label>
        <Input
          value={productNo}
          onChange={(e) => onProductNoChange(e.target.value)}
          placeholder={t("inventory.productNo")}
          className="touch-target"
        />
      </div>
      <div className="flex flex-col gap-1">
        <Label className="text-sm text-muted-foreground">{t("inventory.contains")}</Label>
        <Input
          value={contains}
          onChange={(e) => onContainsChange(e.target.value)}
          placeholder={t("inventory.contains")}
          className="touch-target"
        />
      </div>
      <Button
        className="touch-target gap-2"
        onClick={onSearch}
        disabled={!transactionNo.trim()}
      >
        <Search size={18} />
        {t("actions.search")}
      </Button>
    </div>
  );
}
