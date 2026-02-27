import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useSession } from "@/context/SessionContext";
import { CombinedTable } from "./CombinedTable";
import { useCombinedTab } from "../hooks/useCombinedTab";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";

const today = new Date().toISOString().slice(0, 10);

export function CombinedTab({ tabsList }: { tabsList?: React.ReactNode }) {
  const { t } = useTranslation();
  const { state } = useSession();
  const { entries, loading, fetchEntries, updateEntry, changeStatus } = useCombinedTab();

  const employeeCode = state.employee?.EMNOIDENT;
  const employeeName = state.employee?.EMNOM;

  useEffect(() => {
    if (employeeCode) {
      fetchEntries(employeeCode, today);
    }
  }, [employeeCode]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 bg-white rounded-lg p-2">
        {tabsList}
        {employeeName && (
          <span className="text-sm text-muted-foreground ml-2">
            {employeeName} — {today}
          </span>
        )}
      </div>

      {!employeeCode ? (
        <div className="text-center text-muted-foreground py-8">
          {t("timeTracking.employeeCode")}
        </div>
      ) : loading ? (
        <LoadingSpinner />
      ) : (
        <div className="bg-white rounded-lg p-1.5">
          <CombinedTable
            entries={entries}
            onStatusChange={changeStatus}
            onUpdateEntry={updateEntry}
          />
        </div>
      )}
    </div>
  );
}
