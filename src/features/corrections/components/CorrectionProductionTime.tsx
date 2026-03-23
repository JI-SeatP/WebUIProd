import { useTranslation } from "react-i18next";
import { useSession } from "@/context/SessionContext";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DateTimeField } from "@/components/shared/DateTimeField";
import type { CorrectionData } from "@/types/corrections";

interface CorrectionProductionTimeProps {
  data: CorrectionData;
  startDate: string;
  endDate: string;
  operation: number;
  machine: number;
  employeeCode: string;
  onStartDateChange: (v: string) => void;
  onEndDateChange: (v: string) => void;
  onOperationChange: (v: number) => void;
  onMachineChange: (v: number) => void;
  onEmployeeCodeChange: (v: string) => void;
}

export function CorrectionProductionTime({
  data,
  startDate,
  endDate,
  operation,
  machine,
  employeeCode,
  onStartDateChange,
  onEndDateChange,
  onOperationChange,
  onMachineChange,
  onEmployeeCodeChange,
}: CorrectionProductionTimeProps) {
  const { t } = useTranslation();
  const { state } = useSession();
  const lang = state.language;

  return (
    <Card className="bg-white w-[40%]">
      <div className="py-1.5 px-6">
        <div className="border border-blue-400 bg-blue-50 rounded-lg px-3 py-1 text-2xl font-bold text-blue-900 uppercase tracking-wider w-fit">
          {t("corrections.productionTime")}
        </div>
      </div>
      <CardContent className="px-6 pt-0.5 pb-2 flex flex-col gap-3">
        {/* Row 0: Employee code + name | Status */}
        <div className="flex items-end justify-between gap-3 mb-[18px]">
          <div className="flex items-end gap-3 w-[65%]">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {t("timeTracking.employee")}
              </label>
              <Input
                type="number"
                value={employeeCode}
                onChange={(e) => onEmployeeCodeChange(e.target.value)}
                className="touch-target !text-lg font-bold text-foreground border-input w-[100px] text-center"
              />
            </div>
            {data.EMNOM && (
              <div className="touch-target flex items-center px-4 rounded-lg bg-gray-100 text-base font-semibold text-foreground flex-1">
                {data.EMNOM}
              </div>
            )}
          </div>
          <div className="flex flex-col gap-1 w-1/4">
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t("operation.status")}
            </label>
            <div className="rounded-lg px-3 py-2.5 text-center text-sm font-bold uppercase bg-gray-100 h-12 flex items-center justify-center">
              {data.MODEPROD_MPCODE}
            </div>
          </div>
        </div>

        {/* Row 1: Start + End (65%) | Duration */}
        <div className="flex items-end justify-between gap-3 mb-[18px]">
          <div className="flex items-end gap-3 w-[65%]">
            <div className="flex flex-col gap-1 flex-1">
              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {t("timeTracking.startTime")}
              </label>
              <DateTimeField
                value={startDate}
                onChange={onStartDateChange}
              />
            </div>
            <div className="flex flex-col gap-1 flex-1">
              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {t("timeTracking.endTime")}
              </label>
              <DateTimeField
                value={endDate}
                onChange={onEndDateChange}
                dateGrayed={
                  !!startDate && !!endDate &&
                  startDate.replace("T", " ").split(" ")[0] === endDate.replace("T", " ").split(" ")[0]
                }
              />
            </div>
          </div>
          <div className="flex flex-col gap-1 w-1/4">
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t("timeTracking.duration")}
            </label>
            <div
              className="rounded-lg px-3 py-2.5 text-center text-lg font-bold text-blue-700"
              style={{ backgroundColor: "#FFF88E" }}
            >
              {computeDuration(startDate, endDate)}
            </div>
          </div>
        </div>

        {/* Row 2: Operation (35%) + Machine (60%) */}
        <div className="flex items-end justify-between gap-3 w-full mb-[18px]">
          <div className="flex flex-col gap-1 w-[35%]">
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t("operation.title")}
            </label>
            <Select
              value={String(operation)}
              onValueChange={(v) => onOperationChange(Number(v))}
            >
              <SelectTrigger className="touch-target !text-lg text-foreground border-input bg-white !w-full">
                <SelectValue placeholder="--" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0" className="text-base">--</SelectItem>
                {data.operations.map((op) => (
                  <SelectItem key={op.OPSEQ} value={String(op.OPSEQ)} className="text-base">
                    {lang === "fr" ? op.OPDESC_P : op.OPDESC_S} ({op.OPCODE})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1 w-[60%]">
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t("operation.machine")}
            </label>
            <Select
              value={String(machine)}
              onValueChange={(v) => onMachineChange(Number(v))}
            >
              <SelectTrigger className="touch-target !text-lg text-foreground border-input bg-white !w-full">
                <SelectValue placeholder="--" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0" className="text-base">--</SelectItem>
                {data.machines.map((ma) => (
                  <SelectItem key={ma.MASEQ} value={String(ma.MASEQ)} className="text-base">
                    {lang === "fr" ? ma.MADESC_P : ma.MADESC_S} ({ma.MACODE})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function computeDuration(start: string, end: string): string {
  if (!start || !end) return "—";
  const s = new Date(start);
  const e = new Date(end);
  const diffMs = e.getTime() - s.getTime();
  if (diffMs <= 0) return "0:00";
  const totalMin = Math.floor(diffMs / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return `${h}:${m.toString().padStart(2, "0")}`;
}
