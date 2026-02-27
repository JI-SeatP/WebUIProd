import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/shared/DatePicker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MultiSelectFilter } from "@/components/shared/MultiSelectFilter";
import type { FilterOption } from "@/components/shared/MultiSelectFilter";
import { Search } from "lucide-react";
import type { TimeTrackingFilters } from "@/types/timeTracking";

interface ProductionTimeFiltersProps {
  filters: TimeTrackingFilters;
  onFiltersChange: (filters: TimeTrackingFilters) => void;
  onSearch: () => void;
  tabsList?: React.ReactNode;
  orderNumbers?: string[];
  deptOptions?: FilterOption[];
  machineOptions?: FilterOption[];
  disabledDepts?: Set<string>;
  disabledMachines?: Set<string>;
}

export function ProductionTimeFilters({
  filters,
  onFiltersChange,
  onSearch,
  tabsList,
  orderNumbers = [],
  deptOptions = [],
  machineOptions = [],
  disabledDepts,
  disabledMachines,
}: ProductionTimeFiltersProps) {
  const { t } = useTranslation();

  const orderOptions = useMemo(
    () => orderNumbers.map((o) => ({ value: o, label: o })),
    [orderNumbers]
  );

  const updateFilter = <K extends keyof TimeTrackingFilters>(
    key: K,
    value: TimeTrackingFilters[K]
  ) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  return (
    <div className="bg-white rounded-lg p-2 pt-4 pb-[14px] space-y-4">
      <div className="grid grid-cols-[35%_65%]">
        <div />
        <div className="flex items-center">{tabsList}</div>
      </div>
      <div className="flex items-end gap-3 flex-wrap">
      <div className="flex flex-col gap-1 ml-5">
        <Label className="text-sm text-muted-foreground">{t("timeTracking.dateStart")}</Label>
        <DatePicker
          value={filters.startDate}
          onChange={(v) => updateFilter("startDate", v)}
        />
      </div>
      <div className="flex flex-col gap-1">
        <Label className="text-sm text-muted-foreground">{t("timeTracking.dateEnd")}</Label>
        <DatePicker
          value={filters.endDate}
          onChange={(v) => updateFilter("endDate", v)}
        />
      </div>
      <div className="flex flex-col gap-1">
        <Label className="text-sm text-muted-foreground">{t("timeTracking.orderSearch")}</Label>
        <MultiSelectFilter
          label={t("timeTracking.showAll")}
          options={orderOptions}
          selected={filters.selectedOrders}
          onChange={(v) => updateFilter("selectedOrders", v)}
          searchable
          popoverWidth="w-[250px]"
        />
      </div>
      <div className="flex flex-col gap-1">
        <Label className="text-sm text-muted-foreground">{t("operation.department")}</Label>
        <MultiSelectFilter
          label={t("filters.allDepartments")}
          options={deptOptions}
          selected={filters.selectedDepartments}
          onChange={(v) => updateFilter("selectedDepartments", v)}
          disabledValues={disabledDepts}
          searchable
          popoverWidth="w-[300px]"
        />
      </div>
      <div className="flex flex-col gap-1">
        <Label className="text-sm text-muted-foreground">{t("operation.machine")}</Label>
        <MultiSelectFilter
          label={t("filters.allMachines")}
          options={machineOptions}
          selected={filters.selectedMachines}
          onChange={(v) => updateFilter("selectedMachines", v)}
          disabledValues={disabledMachines}
          searchable
          popoverWidth="w-[330px]"
        />
      </div>
      <div className="flex flex-col gap-1">
        <Label className="text-sm text-muted-foreground">{t("timeTracking.show")}</Label>
        <Select
          value={filters.showMode}
          onValueChange={(v) => updateFilter("showMode", v as "all" | "onlyQty")}
        >
          <SelectTrigger className="w-[200px] !h-12">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("timeTracking.showAll")}</SelectItem>
            <SelectItem value="onlyQty">{t("timeTracking.showOnlyQty")}</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Button className="touch-target gap-2" onClick={onSearch}>
        <Search size={18} />
        {t("actions.search")}
      </Button>
      </div>
    </div>
  );
}
