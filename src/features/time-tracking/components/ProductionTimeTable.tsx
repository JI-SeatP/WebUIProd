import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useSession } from "@/context/SessionContext";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Pencil } from "lucide-react";
import { W_TIME_TRACKING } from "@/constants/widths";
import type { TimeEntry } from "@/types/timeTracking";

interface ProductionTimeTableProps {
  entries: TimeEntry[];
  onStatusChange: (tjseq: number, statusCode: number) => void;
}

const statusOptions = [
  { code: 150, labelKey: "status.completed" },
  { code: 140, labelKey: "status.stopped" },
  { code: 130, labelKey: "status.pause" },
];

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h${m.toString().padStart(2, "0")}`;
}

export function ProductionTimeTable({
  entries,
  onStatusChange,
}: ProductionTimeTableProps) {
  const { t } = useTranslation();
  const { state } = useSession();
  const navigate = useNavigate();
  const lang = state.language;

  const totalQtyGood = entries.reduce((sum, e) => sum + e.QTE_BONNE, 0);
  const totalQtyDefect = entries.reduce((sum, e) => sum + e.QTE_DEFAUT, 0);

  return (
    <div className="border rounded-md overflow-auto">
      <Table>
        <TableHeader>
          <TableRow className="h-[56px]">
            <TableHead className={W_TIME_TRACKING.date}>{t("timeTracking.dateStart")}</TableHead>
            <TableHead className={W_TIME_TRACKING.duration}>{t("timeTracking.duration")}</TableHead>
            <TableHead className={W_TIME_TRACKING.status}>{t("operation.status")}</TableHead>
            <TableHead className={W_TIME_TRACKING.order}>{t("order.number")}</TableHead>
            <TableHead className={W_TIME_TRACKING.shift}>{t("timeTracking.smEpf")}</TableHead>
            <TableHead className={W_TIME_TRACKING.employee}>{t("timeTracking.deptOpMachine")}</TableHead>
            <TableHead className={W_TIME_TRACKING.qty}>{t("timeTracking.qtyGood")}</TableHead>
            <TableHead className={W_TIME_TRACKING.qty}>{t("timeTracking.qtyDefect")}</TableHead>
            <TableHead className={W_TIME_TRACKING.actions}>{t("common.actions")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.length === 0 ? (
            <TableRow>
              <TableCell colSpan={9} className="text-center text-muted-foreground h-[56px]">
                {t("common.noResults")}
              </TableCell>
            </TableRow>
          ) : (
            entries.map((entry) => (
              <TableRow key={entry.TJSEQ} className="h-[56px]">
                <TableCell className={W_TIME_TRACKING.date}>
                  {entry.TJDATE}
                </TableCell>
                <TableCell className={W_TIME_TRACKING.duration}>
                  {formatDuration(entry.TJDUREE)}
                </TableCell>
                <TableCell className={W_TIME_TRACKING.status}>
                  <Select
                    value={String(entry.STATUT_CODE)}
                    onValueChange={(v) => onStatusChange(entry.TJSEQ, Number(v))}
                  >
                    <SelectTrigger className="h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {statusOptions.map((opt) => (
                        <SelectItem key={opt.code} value={String(opt.code)}>
                          {t(opt.labelKey)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell className={W_TIME_TRACKING.order}>
                  {entry.NO_PROD}
                </TableCell>
                <TableCell className={W_TIME_TRACKING.shift}>
                  {entry.SM_EPF}
                </TableCell>
                <TableCell className={W_TIME_TRACKING.employee}>
                  {entry.DECODE}/{lang === "fr" ? entry.OPERATION_P : entry.OPERATION_S}/{entry.MACODE}
                </TableCell>
                <TableCell className={`${W_TIME_TRACKING.qty} font-mono text-lg font-bold`}>
                  {entry.QTE_BONNE}
                </TableCell>
                <TableCell className={`${W_TIME_TRACKING.qty} font-mono text-lg font-bold text-red-600`}>
                  {entry.QTE_DEFAUT}
                </TableCell>
                <TableCell className={W_TIME_TRACKING.actions}>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="touch-target"
                    onClick={() => navigate(`/corrections/${entry.TJSEQ}`)}
                  >
                    <Pencil size={18} />
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
        {entries.length > 0 && (
          <TableFooter>
            <TableRow className="h-[56px] font-bold">
              <TableCell colSpan={6}>{t("timeTracking.totalHours")}</TableCell>
              <TableCell className="font-mono text-lg">{totalQtyGood}</TableCell>
              <TableCell className="font-mono text-lg text-red-600">{totalQtyDefect}</TableCell>
              <TableCell />
            </TableRow>
          </TableFooter>
        )}
      </Table>
    </div>
  );
}
