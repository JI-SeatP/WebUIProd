import { useState } from "react";
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Pencil } from "lucide-react";
import { NumPad } from "@/components/shared/NumPad";
import { W_TIME_TRACKING } from "@/constants/widths";
import type { TimeEntry, UpdateTimeEntryPayload } from "@/types/timeTracking";

interface CombinedTableProps {
  entries: TimeEntry[];
  onStatusChange: (tjseq: number, statusCode: number) => void;
  onUpdateEntry: (payload: UpdateTimeEntryPayload) => void;
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

function EditableQtyCell({
  value,
  onSave,
  className,
}: {
  value: number;
  onSave: (val: number) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [numpadValue, setNumpadValue] = useState(String(value));

  const handleOpen = (isOpen: boolean) => {
    if (isOpen) {
      setNumpadValue(String(value));
    }
    setOpen(isOpen);
  };

  const handleSubmit = () => {
    const num = Number(numpadValue) || 0;
    onSave(num);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={handleOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={`font-mono text-lg font-bold cursor-pointer hover:bg-muted rounded px-2 py-1 ${className ?? ""}`}
        >
          {value}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <NumPad
          value={numpadValue}
          onChange={setNumpadValue}
          onSubmit={handleSubmit}
          onClose={() => setOpen(false)}
        />
      </PopoverContent>
    </Popover>
  );
}

export function CombinedTable({
  entries,
  onStatusChange,
  onUpdateEntry,
}: CombinedTableProps) {
  const { t } = useTranslation();
  const { state } = useSession();
  const navigate = useNavigate();
  const lang = state.language;

  const totalDuration = entries.reduce((sum, e) => sum + e.TJDUREE, 0);
  const totalGood = entries.reduce((sum, e) => sum + e.QTE_BONNE, 0);
  const totalDefect = entries.reduce((sum, e) => sum + e.QTE_DEFAUT, 0);

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
                <TableCell className={W_TIME_TRACKING.qty}>
                  <EditableQtyCell
                    value={entry.QTE_BONNE}
                    onSave={(val) =>
                      onUpdateEntry({ tjseq: entry.TJSEQ, qtyGood: val })
                    }
                  />
                </TableCell>
                <TableCell className={W_TIME_TRACKING.qty}>
                  <EditableQtyCell
                    value={entry.QTE_DEFAUT}
                    onSave={(val) =>
                      onUpdateEntry({ tjseq: entry.TJSEQ, qtyDefect: val })
                    }
                    className="text-red-600"
                  />
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
              <TableCell>{t("timeTracking.totalHours")}</TableCell>
              <TableCell>{formatDuration(totalDuration)}</TableCell>
              <TableCell colSpan={4} />
              <TableCell className="font-mono text-lg">{totalGood}</TableCell>
              <TableCell className="font-mono text-lg text-red-600">{totalDefect}</TableCell>
              <TableCell />
            </TableRow>
          </TableFooter>
        )}
      </Table>
    </div>
  );
}
