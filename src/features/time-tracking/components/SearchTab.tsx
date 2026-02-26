import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useSession } from "@/context/SessionContext";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search } from "lucide-react";
import { searchTimeEntries } from "@/api/timeTracking";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { W_TIME_TRACKING } from "@/constants/widths";
import type { TimeEntry, SearchFilters } from "@/types/timeTracking";

const today = new Date().toISOString().slice(0, 10);

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h${m.toString().padStart(2, "0")}`;
}

export function SearchTab() {
  const { t } = useTranslation();
  const { state } = useSession();
  const lang = state.language;
  const [filters, setFilters] = useState<SearchFilters>({
    startDate: today,
    endDate: today,
    department: "",
    machine: "",
    employee: "",
  });
  const [results, setResults] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(false);

  const updateFilter = <K extends keyof SearchFilters>(key: K, value: SearchFilters[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleSearch = useCallback(async () => {
    setLoading(true);
    try {
      const res = await searchTimeEntries({
        startDate: filters.startDate,
        endDate: filters.endDate,
        department: filters.department,
        machine: filters.machine,
        employee: filters.employee,
      });
      if (res.success) {
        setResults(res.data);
      }
    } catch {
      // handled by API
    } finally {
      setLoading(false);
    }
  }, [filters]);

  return (
    <div className="space-y-3">
      {/* Filters */}
      <div className="flex items-end gap-3 flex-wrap">
        <div className="flex flex-col gap-1">
          <Label className="text-sm text-muted-foreground">{t("timeTracking.dateStart")}</Label>
          <Input
            type="date"
            value={filters.startDate}
            onChange={(e) => updateFilter("startDate", e.target.value)}
            className="touch-target"
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label className="text-sm text-muted-foreground">{t("timeTracking.dateEnd")}</Label>
          <Input
            type="date"
            value={filters.endDate}
            onChange={(e) => updateFilter("endDate", e.target.value)}
            className="touch-target"
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label className="text-sm text-muted-foreground">{t("operation.department")}</Label>
          <Input
            value={filters.department}
            onChange={(e) => updateFilter("department", e.target.value)}
            placeholder={t("filters.allDepartments")}
            className="touch-target"
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label className="text-sm text-muted-foreground">{t("operation.machine")}</Label>
          <Input
            value={filters.machine}
            onChange={(e) => updateFilter("machine", e.target.value)}
            placeholder={t("filters.allMachines")}
            className="touch-target"
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label className="text-sm text-muted-foreground">{t("timeTracking.employee")}</Label>
          <Input
            value={filters.employee}
            onChange={(e) => updateFilter("employee", e.target.value)}
            placeholder={t("timeTracking.employee")}
            className="touch-target"
          />
        </div>
        <Button className="touch-target gap-2" onClick={handleSearch}>
          <Search size={18} />
          {t("actions.search")}
        </Button>
      </div>

      {/* Results */}
      {loading ? (
        <LoadingSpinner />
      ) : (
        <div className="border rounded-md overflow-auto">
          <Table>
            <TableHeader>
              <TableRow className="h-[56px]">
                <TableHead className={W_TIME_TRACKING.date}>{t("timeTracking.dateStart")}</TableHead>
                <TableHead className={W_TIME_TRACKING.employee}>{t("timeTracking.employee")}</TableHead>
                <TableHead className={W_TIME_TRACKING.duration}>{t("timeTracking.duration")}</TableHead>
                <TableHead className={W_TIME_TRACKING.status}>{t("operation.status")}</TableHead>
                <TableHead className={W_TIME_TRACKING.order}>{t("order.number")}</TableHead>
                <TableHead className={W_TIME_TRACKING.shift}>{t("timeTracking.smEpf")}</TableHead>
                <TableHead className={W_TIME_TRACKING.qty}>{t("timeTracking.deptOpMachine")}</TableHead>
                <TableHead className={W_TIME_TRACKING.qty}>{t("timeTracking.qtyGood")}</TableHead>
                <TableHead className={W_TIME_TRACKING.qty}>{t("timeTracking.qtyDefect")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {results.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground h-[56px]">
                    {t("common.noResults")}
                  </TableCell>
                </TableRow>
              ) : (
                results.map((entry) => (
                  <TableRow key={entry.TJSEQ} className="h-[56px]">
                    <TableCell>{entry.TJDATE}</TableCell>
                    <TableCell>{entry.EMNOM}</TableCell>
                    <TableCell>{formatDuration(entry.TJDUREE)}</TableCell>
                    <TableCell>{lang === "fr" ? entry.STATUT_P : entry.STATUT_S}</TableCell>
                    <TableCell>{entry.NO_PROD}</TableCell>
                    <TableCell>{entry.SM_EPF}</TableCell>
                    <TableCell>{entry.DECODE}/{entry.MACODE}</TableCell>
                    <TableCell className="font-mono">{entry.QTE_BONNE}</TableCell>
                    <TableCell className="font-mono">{entry.QTE_DEFAUT}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
