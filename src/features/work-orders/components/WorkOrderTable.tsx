import { useTranslation } from "react-i18next";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { W_WORK_ORDERS } from "@/constants/widths";
import {
  StatusBadge,
  statusCodeToEnum,
  statusRowColor,
} from "@/components/shared/StatusBadge";
import { ActionsDropdown } from "./ActionsDropdown";
import { OrderCommentsPopover } from "./OrderCommentsPopover";
import { ShieldAlert, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import type { WorkOrder } from "@/types/workOrder";
import type { SortField, SortDirection } from "../hooks/useWorkOrders";

interface WorkOrderTableProps {
  orders: WorkOrder[];
  sortField: SortField;
  sortDirection: SortDirection;
  onSort: (field: SortField) => void;
  language: "fr" | "en";
}

interface SortableHeaderProps {
  field: SortField;
  label: string;
  currentField: SortField;
  currentDirection: SortDirection;
  onSort: (field: SortField) => void;
  className?: string;
}

function SortableHeader({
  field,
  label,
  currentField,
  currentDirection,
  onSort,
  className,
}: SortableHeaderProps) {
  const isActive = currentField === field;
  return (
    <TableHead
      className={cn(className, "cursor-pointer select-none hover:bg-muted/50")}
      onClick={() => onSort(field)}
    >
      <div className="flex items-center gap-1">
        <span>{label}</span>
        {isActive ? (
          currentDirection === "asc" ? (
            <ArrowUp size={14} />
          ) : (
            <ArrowDown size={14} />
          )
        ) : (
          <ArrowUpDown size={14} className="opacity-30" />
        )}
      </div>
    </TableHead>
  );
}

export function WorkOrderTable({
  orders,
  sortField,
  sortDirection,
  onSort,
  language,
}: WorkOrderTableProps) {
  const { t } = useTranslation();

  const getLocalizedText = (fr: string | null, en: string | null) => {
    const text = language === "fr" ? fr : en;
    return text ?? fr ?? "";
  };

  return (
    <ScrollArea className="flex-1">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className={W_WORK_ORDERS.rowNumber}>#</TableHead>
            <TableHead className={W_WORK_ORDERS.actions}>
              {t("common.actions")}
            </TableHead>
            <SortableHeader
              field="NO_PROD"
              label={t("order.title")}
              currentField={sortField}
              currentDirection={sortDirection}
              onSort={onSort}
              className={W_WORK_ORDERS.orderNumber}
            />
            <SortableHeader
              field="NOM_CLIENT"
              label={t("order.client")}
              currentField={sortField}
              currentDirection={sortDirection}
              onSort={onSort}
              className={W_WORK_ORDERS.client}
            />
            <SortableHeader
              field="PRODUIT_P"
              label={t("order.product")}
              currentField={sortField}
              currentDirection={sortDirection}
              onSort={onSort}
              className={W_WORK_ORDERS.product}
            />
            <SortableHeader
              field="GROUPE"
              label={t("order.group")}
              currentField={sortField}
              currentDirection={sortDirection}
              onSort={onSort}
              className={W_WORK_ORDERS.group}
            />
            <TableHead className={W_WORK_ORDERS.panel}>
              {t("press.panel")}
            </TableHead>
            <TableHead className={W_WORK_ORDERS.mold}>
              {t("press.mold")}
            </TableHead>
            <SortableHeader
              field="QTE_A_FAB"
              label={t("order.qtyToMake")}
              currentField={sortField}
              currentDirection={sortDirection}
              onSort={onSort}
              className={cn(W_WORK_ORDERS.qtyTotal, "text-right")}
            />
            <SortableHeader
              field="QTE_PRODUITE"
              label={t("order.qtyProduced")}
              currentField={sortField}
              currentDirection={sortDirection}
              onSort={onSort}
              className={cn(W_WORK_ORDERS.qtyProduced, "text-right")}
            />
            <SortableHeader
              field="QTE_RESTANTE"
              label={t("order.qtyRemaining")}
              currentField={sortField}
              currentDirection={sortDirection}
              onSort={onSort}
              className={cn(W_WORK_ORDERS.qtyRemaining, "text-right")}
            />
            <SortableHeader
              field="OPERATION"
              label={t("operation.title")}
              currentField={sortField}
              currentDirection={sortDirection}
              onSort={onSort}
              className={W_WORK_ORDERS.operation}
            />
            <SortableHeader
              field="STATUT_CODE"
              label={t("operation.status")}
              currentField={sortField}
              currentDirection={sortDirection}
              onSort={onSort}
              className={W_WORK_ORDERS.status}
            />
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.length === 0 ? (
            <TableRow>
              <TableCell colSpan={13} className="h-32 text-center text-muted-foreground text-lg">
                {t("common.noResults")}
              </TableCell>
            </TableRow>
          ) : (
            orders.map((order, idx) => {
              const status = statusCodeToEnum(order.STATUT_CODE);
              const isPPAP = false; // PPAP flag not in current mock data — will be wired later
              const hasComments = false; // Same — comments will come from extended data

              return (
                <TableRow
                  key={`${order.TRANSAC}-${order.NOPSEQ}-${idx}`}
                  className={cn(
                    "h-[56px] cursor-pointer no-select",
                    statusRowColor(status)
                  )}
                >
                  <TableCell className={cn(W_WORK_ORDERS.rowNumber, "text-muted-foreground text-sm")}>
                    {idx + 1}
                  </TableCell>
                  <TableCell className={W_WORK_ORDERS.actions}>
                    <div className="flex items-center gap-0.5">
                      <ActionsDropdown order={order} />
                      {isPPAP && (
                        <ShieldAlert size={16} className="text-red-500" />
                      )}
                      {hasComments && <OrderCommentsPopover comments={[]} />}
                    </div>
                  </TableCell>
                  <TableCell className={cn(W_WORK_ORDERS.orderNumber, "font-semibold")}>
                    {order.NO_PROD}
                  </TableCell>
                  <TableCell className={W_WORK_ORDERS.client}>
                    <div className="truncate">{order.NOM_CLIENT}</div>
                    {order.CONOPO && (
                      <div className="text-xs text-muted-foreground truncate">
                        PO: {order.CONOPO}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className={W_WORK_ORDERS.product}>
                    <div className="truncate">
                      {order.NO_INVENTAIRE === "VCUT"
                        ? getLocalizedText(order.INVENTAIRE_P, order.INVENTAIRE_S)
                        : getLocalizedText(order.PRODUIT_P, order.PRODUIT_S) || "—"}
                    </div>
                  </TableCell>
                  <TableCell className={W_WORK_ORDERS.group}>
                    {order.GROUPE ?? "—"}
                  </TableCell>
                  <TableCell className={W_WORK_ORDERS.panel}>
                    {order.Panneau ?? "—"}
                  </TableCell>
                  <TableCell className={W_WORK_ORDERS.mold}>
                    {order.MOULE_CODE ?? "—"}
                  </TableCell>
                  <TableCell className={cn(W_WORK_ORDERS.qtyTotal, "text-right tabular-nums")}>
                    {order.QTE_A_FAB}
                  </TableCell>
                  <TableCell className={cn(W_WORK_ORDERS.qtyProduced, "text-right tabular-nums")}>
                    {order.QTE_PRODUITE ?? 0}
                  </TableCell>
                  <TableCell className={cn(W_WORK_ORDERS.qtyRemaining, "text-right tabular-nums font-semibold")}>
                    {order.QTE_RESTANTE ?? "—"}
                  </TableCell>
                  <TableCell className={W_WORK_ORDERS.operation}>
                    <div className="truncate">
                      {getLocalizedText(order.OPERATION_P, order.OPERATION_S)}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {getLocalizedText(order.MACHINE_P, order.MACHINE_S)}
                    </div>
                  </TableCell>
                  <TableCell className={W_WORK_ORDERS.status}>
                    <StatusBadge status={status} />
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </ScrollArea>
  );
}
