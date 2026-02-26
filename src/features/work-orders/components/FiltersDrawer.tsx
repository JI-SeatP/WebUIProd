import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useSession } from "@/context/SessionContext";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SlidersHorizontal, Search, X } from "lucide-react";
import type { WorkOrderFilters } from "../hooks/useWorkOrders";
import { MachineFilterChips } from "./MachineFilterChips";

interface FiltersDrawerProps {
  filters: WorkOrderFilters;
  onFiltersChange: (filters: WorkOrderFilters) => void;
}

const DATE_PRESETS = [
  { value: "today", labelKey: "filters.today" },
  { value: "week", labelKey: "filters.thisWeek" },
  { value: "month", labelKey: "filters.thisMonth" },
  { value: "custom", labelKey: "filters.customDates" },
];

const OPERATION_TYPES = [
  { value: "__all__", label: "All" },
  { value: "PRESS", label: "Press" },
  { value: "CNC", label: "CNC" },
  { value: "TableSaw", label: "Table Saw / VCUT" },
  { value: "PACK", label: "Packaging" },
  { value: "ASSEMBLY", label: "Assembly" },
  { value: "VENPR", label: "Veneer Prep" },
  { value: "FlatPress", label: "Flat Press" },
  { value: "Laser", label: "Laser" },
  { value: "FLIFT", label: "Forklift" },
];

const STATUS_OPTIONS = [
  { code: 100, labelKey: "status.ready" },
  { code: 110, labelKey: "status.setup" },
  { code: 120, labelKey: "status.production" },
  { code: 123, labelKey: "status.pause" },
  { code: 125, labelKey: "status.stopped" },
  { code: 130, labelKey: "status.onHold" },
];

export function FiltersDrawer({ filters, onFiltersChange }: FiltersDrawerProps) {
  const { t } = useTranslation();
  const { state } = useSession();
  const [open, setOpen] = useState(false);
  const [searchInput, setSearchInput] = useState(filters.search ?? "");
  const [datePreset, setDatePreset] = useState(filters.datePreset ?? "");

  const activeFilterCount = [
    filters.search,
    filters.machines?.length,
    filters.operationType,
    filters.statuses?.length,
    filters.datePreset,
  ].filter(Boolean).length;

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      onFiltersChange({ ...filters, search: searchInput || undefined });
    }
  };

  const handleSearchClear = () => {
    setSearchInput("");
    onFiltersChange({ ...filters, search: undefined });
  };

  const handleStatusToggle = (code: number, checked: boolean) => {
    const current = filters.statuses ?? [];
    const updated = checked
      ? [...current, code]
      : current.filter((c) => c !== code);
    onFiltersChange({ ...filters, statuses: updated.length ? updated : undefined });
  };

  const handleMachinesChange = (machines: number[]) => {
    onFiltersChange({ ...filters, machines: machines.length ? machines : undefined });
  };

  const handleOperationTypeChange = (value: string) => {
    onFiltersChange({ ...filters, operationType: value === "__all__" ? undefined : value });
  };

  const handleDatePresetChange = (value: string) => {
    setDatePreset(value);
    onFiltersChange({ ...filters, datePreset: value || undefined });
  };

  const handleClearAll = () => {
    setSearchInput("");
    setDatePreset("");
    onFiltersChange({
      departement: filters.departement,
    });
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" className="gap-2 touch-target">
          <SlidersHorizontal size={18} />
          {t("actions.filter")}
          {activeFilterCount > 0 && (
            <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
              {activeFilterCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[400px] sm:w-[450px] flex flex-col">
        <SheetHeader>
          <SheetTitle className="text-xl">{t("actions.filter")}</SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-auto space-y-5 py-4">
          {/* Search */}
          <div className="space-y-2">
            <Label className="text-base font-semibold">
              {t("actions.search")}
            </Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="h-[48px] pl-9 text-lg"
                  placeholder={t("actions.search")}
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={handleSearchKeyDown}
                />
              </div>
              {searchInput && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="touch-target shrink-0"
                  onClick={handleSearchClear}
                >
                  <X size={18} />
                </Button>
              )}
            </div>
          </div>

          <Separator />

          {/* Date Preset */}
          <div className="space-y-2">
            <Label className="text-base font-semibold">
              {t("filters.dateRange")}
            </Label>
            <Select value={datePreset} onValueChange={handleDatePresetChange}>
              <SelectTrigger className="h-[48px] text-base">
                <SelectValue placeholder={t("filters.dateRange")} />
              </SelectTrigger>
              <SelectContent>
                {DATE_PRESETS.map((preset) => (
                  <SelectItem key={preset.value} value={preset.value} className="text-base py-2">
                    {t(preset.labelKey)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {datePreset === "custom" && (
              <div className="flex gap-2 mt-2">
                <Input
                  type="date"
                  className="h-[48px] text-base flex-1"
                  value={filters.dateStart ?? ""}
                  onChange={(e) =>
                    onFiltersChange({ ...filters, dateStart: e.target.value })
                  }
                />
                <Input
                  type="date"
                  className="h-[48px] text-base flex-1"
                  value={filters.dateEnd ?? ""}
                  onChange={(e) =>
                    onFiltersChange({ ...filters, dateEnd: e.target.value })
                  }
                />
              </div>
            )}
          </div>

          <Separator />

          {/* Operation Type */}
          <div className="space-y-2">
            <Label className="text-base font-semibold">
              {t("filters.operationType")}
            </Label>
            <Select
              value={filters.operationType ?? ""}
              onValueChange={handleOperationTypeChange}
            >
              <SelectTrigger className="h-[48px] text-base">
                <SelectValue placeholder={t("filters.operationType")} />
              </SelectTrigger>
              <SelectContent>
                {OPERATION_TYPES.map((op) => (
                  <SelectItem key={op.value} value={op.value} className="text-base py-2">
                    {op.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* Status Multi-Select */}
          <div className="space-y-2">
            <Label className="text-base font-semibold">
              {t("operation.status")}
            </Label>
            <div className="grid grid-cols-2 gap-2">
              {STATUS_OPTIONS.map((opt) => (
                <label
                  key={opt.code}
                  className="flex items-center gap-2 p-2 rounded-md hover:bg-muted cursor-pointer"
                >
                  <Checkbox
                    checked={filters.statuses?.includes(opt.code) ?? false}
                    onCheckedChange={(checked) =>
                      handleStatusToggle(opt.code, !!checked)
                    }
                  />
                  <span className="text-base">{t(opt.labelKey)}</span>
                </label>
              ))}
            </div>
          </div>

          <Separator />

          {/* Machine Chips */}
          <div className="space-y-2">
            <Label className="text-base font-semibold">
              {t("operation.machine")}
            </Label>
            <MachineFilterChips
              departement={state.department?.DESEQ}
              selectedMachines={filters.machines ?? []}
              onMachinesChange={handleMachinesChange}
              language={state.language}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 pt-3 border-t">
          <Button
            variant="outline"
            className="flex-1 touch-target text-lg"
            onClick={handleClearAll}
          >
            <X size={18} className="mr-1" />
            Clear
          </Button>
          <Button
            className="flex-1 touch-target text-lg"
            onClick={() => {
              onFiltersChange({ ...filters, search: searchInput || undefined });
              setOpen(false);
            }}
          >
            <Search size={18} className="mr-1" />
            {t("actions.filter")}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
