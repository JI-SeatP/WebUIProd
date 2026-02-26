import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import type { TimeTrackingFilters } from "@/types/timeTracking";

interface ProductionTimeFiltersProps {
  filters: TimeTrackingFilters;
  onFiltersChange: (filters: TimeTrackingFilters) => void;
  onSearch: () => void;
}

export function ProductionTimeFilters({
  filters,
  onFiltersChange,
  onSearch,
}: ProductionTimeFiltersProps) {
  const { t } = useTranslation();

  const updateFilter = <K extends keyof TimeTrackingFilters>(
    key: K,
    value: TimeTrackingFilters[K]
  ) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  return (
    <div className="flex items-end gap-3 flex-wrap">
      <div className="flex flex-col gap-1">
        <Label className="text-sm text-muted-foreground">{t("timeTracking.dateStart")}</Label>
        <Input
          type="date"
          value={filters.startDate}
          onChange={(e) => updateFilter("startDate", e.target.value)}
          className="touch-target"
        />
      </div>
      <div className="flex flex-col gap-1">
        <Label className="text-sm text-muted-foreground">{t("timeTracking.dateEnd")}</Label>
        <Input
          type="date"
          value={filters.endDate}
          onChange={(e) => updateFilter("endDate", e.target.value)}
          className="touch-target"
        />
      </div>
      <div className="flex flex-col gap-1">
        <Label className="text-sm text-muted-foreground">{t("timeTracking.orderSearch")}</Label>
        <Input
          value={filters.orderSearch}
          onChange={(e) => updateFilter("orderSearch", e.target.value)}
          placeholder={t("order.number")}
          className="touch-target"
        />
      </div>
      <div className="flex flex-col gap-1">
        <Label className="text-sm text-muted-foreground">{t("operation.department")}</Label>
        <Input
          value={filters.department}
          onChange={(e) => updateFilter("department", e.target.value)}
          placeholder={t("filters.allDepartments")}
          className="touch-target"
        />
      </div>
      <div className="flex flex-col gap-1">
        <Label className="text-sm text-muted-foreground">{t("operation.machine")}</Label>
        <Input
          value={filters.machine}
          onChange={(e) => updateFilter("machine", e.target.value)}
          placeholder={t("filters.allMachines")}
          className="touch-target"
        />
      </div>
      <Button className="touch-target gap-2" onClick={onSearch}>
        <Search size={18} />
        {t("actions.search")}
      </Button>
    </div>
  );
}
