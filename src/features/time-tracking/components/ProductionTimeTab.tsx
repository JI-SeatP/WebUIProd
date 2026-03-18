import { useState, useEffect, useMemo } from "react";
import { apiGet } from "@/api/client";
import { ProductionTimeFilters } from "./ProductionTimeFilters";
import { ProductionTimeTable } from "./ProductionTimeTable";
import { useProductionTime } from "../hooks/useProductionTime";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import type { TimeTrackingFilters, TimeEntry } from "@/types/timeTracking";
import type { Department } from "@/types/department";
import type { Machine } from "@/types/machine";
import type { FilterOption } from "@/components/shared/MultiSelectFilter";

const today = new Date().toISOString().slice(0, 10);

/** Build a searchable string from all visible fields of an entry */
function entrySearchText(e: TimeEntry): string {
  return [
    e.TJDATE, e.TJDEBUT, e.TJFIN,
    e.NO_PROD, e.DECODE, e.MACODE,
    e.OPERATION_P, e.OPERATION_S,
    e.MACHINE_P, e.MACHINE_S,
    e.EMNO, e.EMNOM,
    e.SM_EPF, e.INNOINV, e.INDESC1, e.INDESC2,
    e.MODEPROD_MPCODE, e.STATUT_P, e.STATUT_S,
  ].join(" ").toLowerCase();
}

export function ProductionTimeTab({ tabsList }: { tabsList?: React.ReactNode }) {
  const { entries, totals, loading, loadingMore, hasMore, fetchEntries, fetchMore, changeStatus } = useProductionTime();
  const [filters, setFilters] = useState<TimeTrackingFilters>({
    startDate: today,
    endDate: today,
    searchText: "",
    selectedDepartments: [],
    selectedMachines: [],
    showMode: "all",
  });
  const [deptOptions, setDeptOptions] = useState<FilterOption[]>([]);
  const [machineOptions, setMachineOptions] = useState<FilterOption[]>([]);

  useEffect(() => {
    fetchEntries(filters);
    apiGet<Department[]>("getDepartments.cfm").then((res) => {
      if (res.success) {
        setDeptOptions(res.data.map((d) => ({ value: String(d.DESEQ), label: d.DEDESCRIPTION_P })));
      }
    });
    apiGet<Machine[]>("getMachines.cfm").then((res) => {
      if (res.success) {
        setMachineOptions(res.data.map((m) => ({ value: String(m.MASEQ), label: `${m.MACODE} — ${m.MADESC_P}` })));
      }
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearch = () => {
    fetchEntries(filters);
  };

  // Parse search terms: split on space or + for AND matching
  const searchTerms = useMemo(() => {
    const raw = filters.searchText.trim().toLowerCase();
    if (!raw) return [];
    return raw.split(/[\s+]+/).filter(Boolean);
  }, [filters.searchText]);

  // Client-side filtering
  const filteredEntries = useMemo(() => {
    return entries.filter((e) => {
      if (filters.showMode === "onlyQty" && e.QTE_BONNE <= 0 && e.QTE_DEFAUT <= 0) return false;
      if (searchTerms.length > 0) {
        const text = entrySearchText(e);
        if (!searchTerms.every((term) => text.includes(term))) return false;
      }
      return true;
    });
  }, [entries, filters.showMode, searchTerms]);

  // Unique values present in current entries (for enabling/disabling options)
  const activeDepartments = new Set(entries.map((e) => String(e.DEPARTEMENT)));
  const activeMachines = new Set(entries.map((e) => String(e.MACHINE)));

  // Only disable options when data IS loaded — when empty, allow all selections
  // so they can be sent as server-side WHERE clauses on the next search
  const hasData = entries.length > 0;
  const disabledDepts = hasData
    ? new Set(deptOptions.map((o) => o.value).filter((v) => !activeDepartments.has(v)))
    : undefined;
  const disabledMachines = hasData
    ? new Set(machineOptions.map((o) => o.value).filter((v) => !activeMachines.has(v)))
    : undefined;

  return (
    <div className="flex flex-col gap-3 flex-1 min-h-0">
      <ProductionTimeFilters
        filters={filters}
        onFiltersChange={setFilters}
        onSearch={handleSearch}
        tabsList={tabsList}
        deptOptions={deptOptions}
        machineOptions={machineOptions}
        disabledDepts={disabledDepts}
        disabledMachines={disabledMachines}
      />
      {loading ? (
        <LoadingSpinner />
      ) : (
        <div className="bg-white rounded-lg p-1.5 flex-1 min-h-0 flex flex-col">
          <ProductionTimeTable
            entries={filteredEntries}
            totals={totals}
            hasMore={hasMore}
            loadingMore={loadingMore}
            onLoadMore={fetchMore}
            onStatusChange={changeStatus}
            showYear={filters.startDate.slice(0, 4) !== filters.endDate.slice(0, 4)}
          />
        </div>
      )}
    </div>
  );
}
