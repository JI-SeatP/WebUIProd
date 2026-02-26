import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useInventory } from "./hooks/useInventory";
import { InventoryFilters } from "./components/InventoryFilters";
import { InventoryTable } from "./components/InventoryTable";
import { ContainerEditDialog } from "./components/ContainerEditDialog";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";

export function InventoryPage() {
  const { t } = useTranslation();
  const { transactions, loading, fetchTransactions } = useInventory();

  const [transactionNo, setTransactionNo] = useState("");
  const [productNo, setProductNo] = useState("");
  const [contains, setContains] = useState("");

  const [editTrseq, setEditTrseq] = useState<number | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleSearch = useCallback(() => {
    fetchTransactions(transactionNo, productNo, contains);
  }, [fetchTransactions, transactionNo, productNo, contains]);

  const handleEdit = useCallback((trseq: number) => {
    setEditTrseq(trseq);
    setDialogOpen(true);
  }, []);

  return (
    <div className="flex flex-col h-full p-3">
      <h1 className="text-xl font-bold mb-3">{t("inventory.title")}</h1>

      <div className="space-y-3">
        <InventoryFilters
          transactionNo={transactionNo}
          productNo={productNo}
          contains={contains}
          onTransactionNoChange={setTransactionNo}
          onProductNoChange={setProductNo}
          onContainsChange={setContains}
          onSearch={handleSearch}
        />

        {loading ? (
          <LoadingSpinner />
        ) : (
          <InventoryTable transactions={transactions} onEdit={handleEdit} />
        )}
      </div>

      <ContainerEditDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        trseq={editTrseq}
      />
    </div>
  );
}
