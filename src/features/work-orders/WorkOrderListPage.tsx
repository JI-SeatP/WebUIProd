import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useSession } from "@/context/SessionContext";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { FiltersDrawer } from "./components/FiltersDrawer";
import { WorkOrderTable } from "./components/WorkOrderTable";
import { useWorkOrders, type WorkOrderFilters } from "./hooks/useWorkOrders";
import { RefreshCw } from "lucide-react";

export function WorkOrderListPage() {
  const { t } = useTranslation();
  const { state } = useSession();
  const [filters, setFilters] = useState<WorkOrderFilters>({
    departement: state.department?.DESEQ,
  });

  const {
    orders,
    loading,
    error,
    sortField,
    sortDirection,
    handleSort,
    refetch,
  } = useWorkOrders(filters);

  return (
    <div className="flex flex-col h-full gap-3">
      {/* Toolbar */}
      <div className="flex items-center gap-3 shrink-0">
        <h1 className="text-2xl font-bold">{t("order.title")}</h1>
        <span className="text-muted-foreground text-base">
          ({orders.length})
        </span>
        <div className="flex-1" />
        <FiltersDrawer filters={filters} onFiltersChange={setFilters} />
        <Button
          variant="outline"
          size="icon"
          className="touch-target"
          onClick={refetch}
        >
          <RefreshCw size={18} />
        </Button>
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
        <WorkOrderTable
          orders={orders}
          sortField={sortField}
          sortDirection={sortDirection}
          onSort={handleSort}
          language={state.language}
        />
      )}
    </div>
  );
}
