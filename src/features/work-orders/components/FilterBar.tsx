import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useSession } from "@/context/SessionContext";
import { Input } from "@/components/ui/input";
import { MultiSelectFilter, type FilterOption } from "@/components/shared/MultiSelectFilter";
import { Search, X } from "lucide-react";
import { statusCodeToEnum } from "@/components/shared/StatusBadge";
import type { WorkOrder } from "@/types/workOrder";
import type { WorkOrderFilters } from "../hooks/useWorkOrders";

interface FilterBarProps {
  filters: WorkOrderFilters;
  onFiltersChange: (filters: WorkOrderFilters) => void;
  allOrders: WorkOrder[];
}

const OPERATION_TYPES: FilterOption[] = [
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

const ALL_STATUS_OPTIONS = [
  { value: "READY", labelKey: "status.ready" },
  { value: "SETUP", labelKey: "status.setup" },
  { value: "PROD", labelKey: "status.production" },
  { value: "PAUSE", labelKey: "status.pause" },
  { value: "STOP", labelKey: "status.stopped" },
  { value: "COMP", labelKey: "status.completed" },
  { value: "ON_HOLD", labelKey: "status.onHold" },
];

/** Check if a work order matches the given operation type filters */
function matchesOpTypes(wo: WorkOrder, opTypes?: string[]): boolean {
  if (!opTypes?.length) return true;
  const upper = opTypes.map((t) => t.toUpperCase());
  return upper.some((ot) => wo.FMCODE?.toUpperCase().includes(ot));
}

/** Check if a work order matches the given status filters */
function matchesStatuses(wo: WorkOrder, statuses?: string[]): boolean {
  if (!statuses?.length) return true;
  return statuses.includes(statusCodeToEnum(wo.STATUT_CODE));
}

/** Check if a work order matches the given machine filters */
function matchesMachines(wo: WorkOrder, machines?: number[]): boolean {
  if (!machines?.length) return true;
  return machines.includes(wo.MACHINE);
}

export function FilterBar({ filters, onFiltersChange, allOrders }: FilterBarProps) {
  const { t } = useTranslation();
  const { state } = useSession();
  const [searchInput, setSearchInput] = useState(filters.search ?? "");

  // Base orders excluding PRESS_NS (same exclusion as useWorkOrders)
  const baseOrders = useMemo(
    () => allOrders.filter((wo) => wo.MACODE !== "PRESS_NS"),
    [allOrders]
  );

  // Cascading: operation type options based on active status + machine filters
  const operationTypeOptions = useMemo(() => {
    const relevant = baseOrders.filter(
      (wo) =>
        matchesStatuses(wo, filters.statuses) &&
        matchesMachines(wo, filters.machines)
    );
    const presentCodes = new Set(
      relevant.map((wo) => wo.FMCODE?.toUpperCase()).filter(Boolean)
    );
    return OPERATION_TYPES.filter((opt) =>
      presentCodes.has(opt.value.toUpperCase()) ||
      [...presentCodes].some((code) => code!.includes(opt.value.toUpperCase()))
    );
  }, [baseOrders, filters.statuses, filters.machines]);

  // Cascading: status options based on active operation type + machine filters
  const statusOptions: FilterOption[] = useMemo(() => {
    const relevant = baseOrders.filter(
      (wo) =>
        matchesOpTypes(wo, filters.operationTypes) &&
        matchesMachines(wo, filters.machines)
    );
    const presentStatuses = new Set(
      relevant.map((wo) => statusCodeToEnum(wo.STATUT_CODE))
    );
    return ALL_STATUS_OPTIONS
      .filter((s) => presentStatuses.has(s.value))
      .map((s) => ({ value: s.value, label: t(s.labelKey) }));
  }, [baseOrders, filters.operationTypes, filters.machines, t]);

  // Cascading: machine options based on active operation type + status filters
  const machineOptions: FilterOption[] = useMemo(() => {
    const relevant = baseOrders.filter(
      (wo) =>
        matchesOpTypes(wo, filters.operationTypes) &&
        matchesStatuses(wo, filters.statuses)
    );
    const machineMap = new Map<number, WorkOrder>();
    for (const wo of relevant) {
      if (!machineMap.has(wo.MACHINE)) machineMap.set(wo.MACHINE, wo);
    }
    return [...machineMap.entries()]
      .map(([maseq, wo]) => ({
        value: String(maseq),
        label: `${wo.MACODE} — ${state.language === "fr" ? wo.MACHINE_P : wo.MACHINE_S}`,
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [baseOrders, filters.operationTypes, filters.statuses, state.language]);

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      onFiltersChange({ ...filters, search: searchInput || undefined });
    }
  };

  const handleSearchBlur = () => {
    if (searchInput !== (filters.search ?? "")) {
      onFiltersChange({ ...filters, search: searchInput || undefined });
    }
  };

  const handleOperationTypesChange = (values: string[]) => {
    onFiltersChange({
      ...filters,
      operationTypes: values.length ? values : undefined,
    });
  };

  const handleStatusesChange = (values: string[]) => {
    onFiltersChange({
      ...filters,
      statuses: values.length ? values : undefined,
    });
  };

  const handleMachinesChange = (values: string[]) => {
    onFiltersChange({
      ...filters,
      machines: values.length ? values.map(Number) : undefined,
    });
  };

  return (
    <div className="flex items-center gap-4">
      {/* Operation Type */}
      <MultiSelectFilter
        label={t("filters.operationType")}
        options={operationTypeOptions}
        selected={filters.operationTypes ?? []}
        onChange={handleOperationTypesChange}
        className="min-w-[195px]"
      />

      {/* Status */}
      <MultiSelectFilter
        label={t("operation.status")}
        options={statusOptions}
        selected={filters.statuses ?? []}
        onChange={handleStatusesChange}
        className="min-w-[130px]"
      />

      {/* Search */}
      <div className="relative">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
        />
        <Input
          className="h-[48px] pl-9 pr-9 text-base w-[330px] bg-white"
          placeholder={t("actions.search")}
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onKeyDown={handleSearchKeyDown}
          onBlur={handleSearchBlur}
        />
        {searchInput && (
          <button
            type="button"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            onClick={() => {
              setSearchInput("");
              onFiltersChange({ ...filters, search: undefined });
            }}
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Machine */}
      <MultiSelectFilter
        label={t("operation.machine")}
        options={machineOptions}
        selected={(filters.machines ?? []).map(String)}
        onChange={handleMachinesChange}
        className="w-[330px]"
        searchable
        popoverWidth="w-[330px]"
      />
    </div>
  );
}
