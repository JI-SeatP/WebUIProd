import { useState, useEffect } from "react";
import { ProductionTimeFilters } from "./ProductionTimeFilters";
import { ProductionTimeTable } from "./ProductionTimeTable";
import { useProductionTime } from "../hooks/useProductionTime";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import type { TimeTrackingFilters } from "@/types/timeTracking";

const today = new Date().toISOString().slice(0, 10);

export function ProductionTimeTab() {
  const { entries, loading, fetchEntries, changeStatus } = useProductionTime();
  const [filters, setFilters] = useState<TimeTrackingFilters>({
    startDate: today,
    endDate: today,
    orderSearch: "",
    department: "",
    machine: "",
  });

  useEffect(() => {
    fetchEntries(filters);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearch = () => {
    fetchEntries(filters);
  };

  return (
    <div className="space-y-3">
      <ProductionTimeFilters
        filters={filters}
        onFiltersChange={setFilters}
        onSearch={handleSearch}
      />
      {loading ? (
        <LoadingSpinner />
      ) : (
        <ProductionTimeTable entries={entries} onStatusChange={changeStatus} />
      )}
    </div>
  );
}
