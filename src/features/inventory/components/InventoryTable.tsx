import { useTranslation } from "react-i18next";
import { useSession } from "@/context/SessionContext";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Pencil } from "lucide-react";
import { W_INVENTORY } from "@/constants/widths";
import type { InventoryTransaction } from "@/types/inventory";

interface InventoryTableProps {
  transactions: InventoryTransaction[];
  onEdit: (trseq: number) => void;
}

export function InventoryTable({ transactions, onEdit }: InventoryTableProps) {
  const { t } = useTranslation();
  const { state } = useSession();
  const lang = state.language;

  return (
    <div className="border rounded-md overflow-auto">
      <Table>
        <TableHeader>
          <TableRow className="h-[56px]">
            <TableHead className={W_INVENTORY.actions}>{t("common.actions")}</TableHead>
            <TableHead className={W_INVENTORY.product}>{t("inventory.productNo")}</TableHead>
            <TableHead className={W_INVENTORY.description}>{t("production.description")}</TableHead>
            <TableHead className={W_INVENTORY.warehouse}>{t("production.warehouse")}</TableHead>
            <TableHead className={W_INVENTORY.qtyEstimated}>{t("inventory.estimatedQty")}</TableHead>
            <TableHead className={W_INVENTORY.qtyActual}>{t("inventory.actualQty")}</TableHead>
            <TableHead className={W_INVENTORY.unit}>{t("inventory.unit")}</TableHead>
            <TableHead className={W_INVENTORY.date}>{t("inventory.dateVerified")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactions.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="text-center text-muted-foreground h-[56px]">
                {t("common.noResults")}
              </TableCell>
            </TableRow>
          ) : (
            transactions.map((tx) => (
              <TableRow key={tx.TRSEQ} className="h-[56px]">
                <TableCell className={W_INVENTORY.actions}>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="touch-target"
                    onClick={() => onEdit(tx.TRSEQ)}
                  >
                    <Pencil size={18} />
                  </Button>
                </TableCell>
                <TableCell className={W_INVENTORY.product}>{tx.PRODUIT_CODE}</TableCell>
                <TableCell className={W_INVENTORY.description}>
                  {lang === "fr" ? tx.PRODUIT_P : tx.PRODUIT_S}
                </TableCell>
                <TableCell className={W_INVENTORY.warehouse}>
                  {lang === "fr" ? tx.ENTREPOT_P : tx.ENTREPOT_S}
                </TableCell>
                <TableCell className={`${W_INVENTORY.qtyEstimated} font-mono`}>
                  {tx.QTE_ESTIMEE}
                </TableCell>
                <TableCell className={`${W_INVENTORY.qtyActual} font-mono`}>
                  {tx.QTE_REELLE}
                </TableCell>
                <TableCell className={W_INVENTORY.unit}>{tx.UNITE}</TableCell>
                <TableCell className={W_INVENTORY.date}>{tx.DATE_VERIF}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
