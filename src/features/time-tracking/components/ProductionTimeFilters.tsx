import { useTranslation } from "react-i18next";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
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
import { W_TIME_TRACKING } from "@/constants/widths";

interface ProductionTimeFiltersProps {
  filters: TimeTrackingFilters;
  onFiltersChange: (filters: TimeTrackingFilters) => void;
  onSearch: () => void;
  tabsList?: React.ReactNode;
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
  deptOptions = [],
  machineOptions = [],
  disabledDepts,
  disabledMachines,
}: ProductionTimeFiltersProps) {
  const { t } = useTranslation();

  const updateFilter = <K extends keyof TimeTrackingFilters>(
    key: K,
    value: TimeTrackingFilters[K]
  ) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  return (
    <div className="overflow-hidden rounded-lg bg-white pb-[14px]">
      {tabsList ? (
        <div className="flex min-h-[52px] items-center justify-center bg-black px-3 py-2 rounded-t-lg">
          {tabsList}
        </div>
      ) : null}
      <div className="space-y-4 p-2 pt-4">
      <div className="flex w-full flex-wrap items-end gap-3">
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
      <div className="ml-[30px] mr-10 flex flex-col gap-1">
        <Label className="text-sm text-muted-foreground">{t("actions.search")}</Label>
        <Input
          className={`!h-12 ${W_TIME_TRACKING.productionFiltersSearch} !text-base`}
          placeholder={t("timeTracking.searchPlaceholder")}
          value={filters.searchText}
          onChange={(e) => updateFilter("searchText", e.target.value)}
        />
      </div>
      <div className="flex flex-wrap items-end gap-[18px]">
        <div className="flex flex-col gap-1">
          <Label className="text-sm text-muted-foreground">{t("operation.department")}</Label>
          <MultiSelectFilter
            label={t("filters.allDepartments")}
            options={deptOptions}
            selected={filters.selectedDepartments}
            onChange={(v) => updateFilter("selectedDepartments", v)}
            disabledValues={disabledDepts}
            searchable
            popoverWidth={W_TIME_TRACKING.productionFiltersDeptPopover}
            triggerWidth={W_TIME_TRACKING.productionFiltersDeptTriggerPx}
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
            popoverWidth={W_TIME_TRACKING.productionFiltersMachinePopover}
            triggerWidth={W_TIME_TRACKING.productionFiltersMachineTriggerPx}
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
      </div>
      <Button
        className={`touch-target text-[calc(1.125rem-1pt)] ml-auto mr-[20px] gap-2 ${W_TIME_TRACKING.productionFiltersSearchButtonMin}`}
        onClick={onSearch}
      >
        <Search size={18} />
        {t("actions.search")}
      </Button>
      </div>
      </div>
    </div>
  );
}
