import { useTranslation } from "react-i18next";
import { useRef, useState } from "react";
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn, pressQtyDisplay, computeQteRestante } from "@/lib/utils";
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
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isScrolled, setIsScrolled] = useState(false);

  const getLocalizedText = (fr: string | null, en: string | null) => {
    const text = language === "fr" ? fr : en;
    return text ?? fr ?? "";
  };

  return (
    <div
      ref={scrollRef}
      className="flex-1 min-h-0 overflow-y-auto overflow-x-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-track]:bg-transparent"
      onScroll={(e) => setIsScrolled((e.currentTarget as HTMLDivElement).scrollTop > 0)}
    >
      <table className="w-full caption-bottom text-sm">
        <TableHeader className={cn(
          "sticky top-0 z-10 bg-background transition-shadow duration-200",
          isScrolled ? "shadow-[0_2px_6px_0_rgba(0,0,0,0.12)]" : ""
        )}>
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
            <SortableHeader
              field="MOULE_CODE"
              label={t("press.mold")}
              currentField={sortField}
              currentDirection={sortDirection}
              onSort={onSort}
              className={W_WORK_ORDERS.mold}
            />
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
                    "h-[56px] cursor-pointer hover:!bg-[#aeffae]",
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
                  <TableCell className={cn(W_WORK_ORDERS.orderNumber, "font-semibold text-xl")}>
                    {order.NO_PROD}
                  </TableCell>
                  <TableCell className={cn(W_WORK_ORDERS.client, "text-base")}>
                    <div className="truncate">{order.NOM_CLIENT}</div>
                    {order.CONOPO && (
                      <div className="text-base text-muted-foreground truncate -mt-0.5">
                        PO: {order.CONOPO}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className={cn(W_WORK_ORDERS.product, "text-base")}>
                    {(() => {
                      // Match old software cascading logic for PRODUIT column
                      if (order.NO_INVENTAIRE === "VCUT") {
                        return (
                          <>
                            <div className="truncate font-semibold">{order.NO_INVENTAIRE}</div>
                            <div className="text-base text-muted-foreground truncate -mt-0.5">
                              {getLocalizedText(order.INVENTAIRE_P, order.INVENTAIRE_S)}
                            </div>
                          </>
                        );
                      }
                      if (order.PRODUIT_CODE) {
                        // OPERATION_SEQ=2 → show product; otherwise show material
                        if (order.OPERATION_SEQ === 2) {
                          return (
                            <>
                              <div className="truncate font-semibold">{order.PRODUIT_CODE}</div>
                              <div className="text-base text-muted-foreground truncate -mt-0.5">
                                {getLocalizedText(order.PRODUIT_P, order.PRODUIT_S)}
                              </div>
                            </>
                          );
                        }
                        return (
                          <>
                            <div className="truncate font-semibold">{order.MATERIEL_CODE || order.PRODUIT_CODE}</div>
                            <div className="text-base text-muted-foreground truncate -mt-0.5">
                              {getLocalizedText(order.MATERIEL_P ?? order.PRODUIT_P, order.MATERIEL_S ?? order.PRODUIT_S)}
                            </div>
                          </>
                        );
                      }
                      if (order.NO_INVENTAIRE) {
                        return (
                          <>
                            <div className="truncate font-semibold">{order.NO_INVENTAIRE}</div>
                            <div className="text-base text-muted-foreground truncate -mt-0.5">
                              {getLocalizedText(order.INVENTAIRE_P, order.INVENTAIRE_S)}
                            </div>
                          </>
                        );
                      }
                      if (order.MATERIEL_CODE) {
                        return (
                          <>
                            <div className="truncate font-semibold">{order.MATERIEL_CODE}</div>
                            <div className="text-base text-muted-foreground truncate -mt-0.5">
                              {getLocalizedText(order.MATERIEL_P, order.MATERIEL_S)}
                            </div>
                          </>
                        );
                      }
                      return <div className="truncate font-semibold">—</div>;
                    })()}
                  </TableCell>
                  <TableCell className={cn(W_WORK_ORDERS.group, "text-base")}>
                    {order.GROUPE ?? "—"}
                  </TableCell>
                  <TableCell className={cn(W_WORK_ORDERS.panel, "text-base font-semibold")}>
                    {order.Panneau ?? "—"}
                  </TableCell>
                  <TableCell className={cn(W_WORK_ORDERS.mold, "text-base")}>
                    {order.MOULE_CODE ?? "—"}
                  </TableCell>
                  <TableCell className={cn(W_WORK_ORDERS.qtyTotal, "text-right tabular-nums text-base")}>
                    {pressQtyDisplay(order.QTE_A_FAB, order.DCQTE_A_PRESSER, order.DCQTE_REJET, order.FMCODE, order.VBE_DCQTE_A_FAB, order.PCS_PER_PANEL)}
                  </TableCell>
                  <TableCell className={cn(W_WORK_ORDERS.qtyProduced, "text-right tabular-nums text-base")}>
                    {order.QTE_PRODUITE ?? 0}
                  </TableCell>
                  <TableCell className={cn(W_WORK_ORDERS.qtyRemaining, "text-right tabular-nums text-base font-semibold")}>
                    {computeQteRestante(order)}
                  </TableCell>
                  <TableCell className={cn(W_WORK_ORDERS.operation, "text-base")}>
                    <div className="truncate">
                      {getLocalizedText(order.OPERATION_P, order.OPERATION_S)}
                    </div>
                    <div className="text-base text-muted-foreground truncate -mt-0.5">
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
      </table>
    </div>
  );
}
