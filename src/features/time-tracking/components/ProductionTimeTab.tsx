import { useState, useEffect } from "react";
import { apiGet } from "@/api/client";
import { ProductionTimeFilters } from "./ProductionTimeFilters";
import { ProductionTimeTable } from "./ProductionTimeTable";
import { useProductionTime } from "../hooks/useProductionTime";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import type { TimeTrackingFilters } from "@/types/timeTracking";
import type { Department } from "@/types/department";
import type { Machine } from "@/types/machine";
import type { FilterOption } from "@/components/shared/MultiSelectFilter";

const today = new Date().toISOString().slice(0, 10);

export function ProductionTimeTab({ tabsList }: { tabsList?: React.ReactNode }) {
  const { entries, loading, fetchEntries, changeStatus } = useProductionTime();
  const [filters, setFilters] = useState<TimeTrackingFilters>({
    startDate: today,
    endDate: today,
    selectedOrders: [],
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
        setDeptOptions(res.data.map((d) => ({ value: d.DECODE, label: d.DEDESCRIPTION_P })));
      }
    });
    apiGet<Machine[]>("getMachines.cfm").then((res) => {
      if (res.success) {
        setMachineOptions(res.data.map((m) => ({ value: m.MACODE, label: `${m.MACODE} — ${m.MADESC_P}` })));
      }
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearch = () => {
    fetchEntries(filters);
  };

  // Client-side filtering
  const filteredEntries = entries.filter((e) => {
    if (filters.selectedOrders.length > 0 && !filters.selectedOrders.includes(e.NO_PROD)) return false;
    if (filters.selectedDepartments.length > 0 && !filters.selectedDepartments.includes(e.DECODE)) return false;
    if (filters.selectedMachines.length > 0 && !filters.selectedMachines.includes(e.MACODE)) return false;
    if (filters.showMode === "onlyQty" && e.QTE_BONNE <= 0 && e.QTE_DEFAUT <= 0) return false;
    return true;
  });

  // Unique values present in current entries (for enabling/disabling options)
  const orderNumbers = [...new Set(entries.map((e) => e.NO_PROD))].sort();
  const activeDepartments = new Set(entries.map((e) => e.DECODE));
  const activeMachines = new Set(entries.map((e) => e.MACODE));

  // Disabled = in the full list but NOT in the table
  const disabledDepts = new Set(deptOptions.map((o) => o.value).filter((v) => !activeDepartments.has(v)));
  const disabledMachines = new Set(machineOptions.map((o) => o.value).filter((v) => !activeMachines.has(v)));

  return (
    <div className="space-y-3">
      <ProductionTimeFilters
        filters={filters}
        onFiltersChange={setFilters}
        onSearch={handleSearch}
        tabsList={tabsList}
        orderNumbers={orderNumbers}
        deptOptions={deptOptions}
        machineOptions={machineOptions}
        disabledDepts={disabledDepts}
        disabledMachines={disabledMachines}
      />
      {loading ? (
        <LoadingSpinner />
      ) : (
        <div className="bg-white rounded-lg p-1.5">
          <ProductionTimeTable entries={filteredEntries} onStatusChange={changeStatus} />
        </div>
      )}
    </div>
  );
}
