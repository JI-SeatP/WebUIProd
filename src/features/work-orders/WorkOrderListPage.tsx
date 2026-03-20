import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useSession } from "@/context/SessionContext";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { FilterBar } from "./components/FilterBar";
import { WorkOrderTable } from "./components/WorkOrderTable";
import { useWorkOrders, type WorkOrderFilters } from "./hooks/useWorkOrders";
import { useRegisterRefresh } from "@/context/RefreshContext";

export function WorkOrderListPage() {
  const { t } = useTranslation();
  const { state } = useSession();
  const [filters, setFilters] = useState<WorkOrderFilters>({
    departement: state.department?.DESEQ,
  });

  // Sync department filter when header dropdown changes
  useEffect(() => {
    setFilters((prev) => ({ ...prev, departement: state.department?.DESEQ }));
  }, [state.department?.DESEQ]);

  const {
    orders,
    allOrders,
    loading,
    error,
    sortField,
    sortDirection,
    handleSort,
    refetch,
  } = useWorkOrders(filters);

  // Register with global refresh so the Header refresh button re-fetches orders
  useRegisterRefresh(refetch);

  return (
    <div className="flex flex-col h-full gap-3">
      {/* Toolbar */}
      <div className="flex items-center gap-3 shrink-0 bg-white rounded-lg p-2">
        <h1 className="text-2xl font-bold shrink-0">{t("order.title")}</h1>
        <span className="text-muted-foreground text-base shrink-0">
          ({orders.length})
        </span>
        <FilterBar filters={filters} onFiltersChange={setFilters} allOrders={allOrders} onSearchSubmit={refetch} />
      </div>

      {/* Content */}
      {loading ? (
        <LoadingSpinner className="flex-1" />
      ) : error ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-3">
            <p className="text-lg text-destructive">{error}</p>
            <Button onClick={refetch}>{t("actions.refresh")}</Button>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg p-1.5 flex-1 min-h-0 flex flex-col">
          <WorkOrderTable
            orders={orders}
            sortField={sortField}
            sortDirection={sortDirection}
            onSort={handleSort}
            language={state.language}
          />
        </div>
      )}
    </div>
  );
}
