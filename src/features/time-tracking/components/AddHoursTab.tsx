import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/shared/DatePicker";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { NumPad } from "@/components/shared/NumPad";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check } from "lucide-react";
import { useAddHours } from "../hooks/useAddHours";
import { EmployeeHoursTable } from "./EmployeeHoursTable";
import { apiGet, apiPost } from "@/api/client";
import type { Employee } from "@/types/employee";
import type { Department } from "@/types/department";
import type { Machine } from "@/types/machine";

export function AddHoursTab({ tabsList }: { tabsList?: React.ReactNode }) {
  const { t } = useTranslation();
  const { form, updateField, duration, hoursWorked, loading, submit } = useAddHours();
  const [empNumpadOpen, setEmpNumpadOpen] = useState(false);
  const [effortNumpadOpen, setEffortNumpadOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);

  useEffect(() => {
    apiGet<Department[]>("getDepartments.cfm").then((res) => {
      if (res.success) setDepartments(res.data);
    });
    apiGet<Machine[]>("getMachines.cfm").then((res) => {
      if (res.success) setMachines(res.data);
    });
  }, []);
  const [timeNumpadField, setTimeNumpadField] = useState<"startTime" | "endTime" | null>(null);
  const [timeRaw, setTimeRaw] = useState("");
  const [timeIsPreloaded, setTimeIsPreloaded] = useState(false);

  const handleSubmit = useCallback(async () => {
    await submit();
    setRefreshTrigger((prev) => prev + 1);
  }, [submit]);

  const handleEmployeeLookup = useCallback(async () => {
    setEmpNumpadOpen(false);
    if (!form.employeeCode) return;
    try {
      const res = await apiPost<Employee>("validateEmployee.cfm", {
        employeeCode: Number(form.employeeCode),
      });
      if (res.success && res.data) {
        updateField("employeeName", res.data.EMNOM);
      }
    } catch {
      // ignore
    }
  }, [form.employeeCode, updateField]);

  const formatTimeRaw = (raw: string) => {
    const padded = raw.padStart(4, "0").slice(0, 4);
    return `${padded.slice(0, 2)}:${padded.slice(2)}`;
  };

  const formatTimeDisplay = (raw: string) => {
    if (raw.length === 0) return "HH:MM";
    if (raw.length === 1) return `_${raw}:__`;
    if (raw.length === 2) return `${raw}:__`;
    if (raw.length === 3) return `${raw.slice(0, 2)}:${raw.slice(2)}_`;
    return `${raw.slice(0, 2)}:${raw.slice(2)}`;
  };

  const openTimeNumpad = (field: "startTime" | "endTime") => {
    const current = form[field];
    setTimeRaw(current ? current.replace(":", "") : "");
    setTimeIsPreloaded(!!current);
    setTimeNumpadField(field);
  };

  const handleTimeNumpadSubmit = () => {
    if (timeNumpadField && timeRaw.length >= 3) {
      updateField(timeNumpadField, formatTimeRaw(timeRaw));
    }
    setTimeNumpadField(null);
    setTimeRaw("");
  };

  const handleTimeNumpadClose = () => {
    setTimeNumpadField(null);
    setTimeRaw("");
  };

  const formatDuration = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h}h${m.toString().padStart(2, "0")}`;
  };

  return (
  <div className="space-y-3">
    <div className="bg-white rounded-lg p-2 pt-4 pb-[14px] space-y-4">
      <div className="grid grid-cols-[35%_65%]">
        <div className="flex items-center pl-5">
          {form.employeeName && <span className="text-lg font-semibold">{form.employeeName}</span>}
        </div>
        <div className="flex items-center">{tabsList}</div>
      </div>
      <div className="flex items-end gap-3 flex-wrap">
        {/* Employee Code */}
        <div className="flex flex-col gap-1 ml-5">
          <Label className="text-sm text-muted-foreground">{t("timeTracking.employeeCode")}</Label>
          <Popover open={empNumpadOpen} onOpenChange={setEmpNumpadOpen}>
            <PopoverTrigger asChild>
              <Input
                value={form.employeeCode}
                readOnly
                className="w-[96px] touch-target !text-lg font-mono cursor-pointer"
                placeholder="0"
              />
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <NumPad
                value={form.employeeCode}
                onChange={(v) => updateField("employeeCode", v)}
                onSubmit={handleEmployeeLookup}
                onClose={() => setEmpNumpadOpen(false)}
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="w-[19px]" />

        {/* Date */}
        <div className="flex flex-col gap-1">
          <Label className="text-sm text-muted-foreground">{t("timeTracking.dateStart")}</Label>
          <DatePicker
            value={form.date}
            onChange={(v) => updateField("date", v)}
          />
        </div>

        {/* Department */}
        <div className="flex flex-col gap-1">
          <Label className="text-sm text-muted-foreground">{t("operation.department")}</Label>
          <Select
            value={form.department || "__none__"}
            onValueChange={(v) => updateField("department", v === "__none__" ? "" : v)}
          >
            <SelectTrigger className="w-[220px] !h-12">
              <SelectValue placeholder={t("operation.department")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">—</SelectItem>
              {departments.map((d) => (
                <SelectItem key={d.DESEQ} value={String(d.DESEQ)}>
                  {d.DEDESCRIPTION_P}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Machine */}
        <div className="flex flex-col gap-1">
          <Label className="text-sm text-muted-foreground">{t("operation.machine")}</Label>
          <Select
            value={form.machine || "__none__"}
            onValueChange={(v) => updateField("machine", v === "__none__" ? "" : v)}
          >
            <SelectTrigger className="w-[250px] !h-12">
              <SelectValue placeholder={t("operation.machine")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">—</SelectItem>
              {machines.map((m) => (
                <SelectItem key={m.MASEQ} value={String(m.MASEQ)}>
                  {m.MACODE} — {m.MADESC_P}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Shift */}
        <div className="flex flex-col gap-1">
          <Label className="text-sm text-muted-foreground">{t("timeTracking.shift")}</Label>
          <Select
            value={form.shift}
            onValueChange={(v) => updateField("shift", v)}
          >
            <SelectTrigger className="w-[150px] !h-12">
              <SelectValue placeholder={t("timeTracking.shift")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">{t("timeTracking.shift1")}</SelectItem>
              <SelectItem value="2">{t("timeTracking.shift2")}</SelectItem>
              <SelectItem value="3">{t("timeTracking.shift3")}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="w-[19px]" />

        {/* Start Time */}
        <div className="flex flex-col gap-1">
          <Label className="text-sm text-muted-foreground">{t("timeTracking.startTime")}</Label>
          <Popover open={timeNumpadField === "startTime"} onOpenChange={(open) => { if (open) openTimeNumpad("startTime"); else handleTimeNumpadClose(); }}>
            <PopoverTrigger asChild>
              <Input
                value={form.startTime || "—"}
                readOnly
                className="w-[100px] touch-target !text-lg font-mono cursor-pointer"
              />
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <NumPad
                value={timeRaw}
                displayValue={formatTimeDisplay(timeRaw)}
                onChange={(v) => {
                  if (timeIsPreloaded && v.length > timeRaw.length) {
                    setTimeRaw(v.slice(-1));
                    setTimeIsPreloaded(false);
                    return;
                  }
                  setTimeIsPreloaded(false);
                  if (v.length <= 4) setTimeRaw(v);
                }}
                onSubmit={handleTimeNumpadSubmit}
                onClose={handleTimeNumpadClose}
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* End Time */}
        <div className="flex flex-col gap-1">
          <Label className="text-sm text-muted-foreground">{t("timeTracking.endTime")}</Label>
          <Popover open={timeNumpadField === "endTime"} onOpenChange={(open) => { if (open) openTimeNumpad("endTime"); else handleTimeNumpadClose(); }}>
            <PopoverTrigger asChild>
              <Input
                value={form.endTime || "—"}
                readOnly
                className="w-[100px] touch-target !text-lg font-mono cursor-pointer"
              />
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <NumPad
                value={timeRaw}
                displayValue={formatTimeDisplay(timeRaw)}
                onChange={(v) => {
                  if (timeIsPreloaded && v.length > timeRaw.length) {
                    setTimeRaw(v.slice(-1));
                    setTimeIsPreloaded(false);
                    return;
                  }
                  setTimeIsPreloaded(false);
                  if (v.length <= 4) setTimeRaw(v);
                }}
                onSubmit={handleTimeNumpadSubmit}
                onClose={handleTimeNumpadClose}
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Effort Rate */}
        <div className="flex flex-col gap-1">
          <Label className="text-sm text-muted-foreground">{t("timeTracking.effortRate")} (%)</Label>
          <Popover open={effortNumpadOpen} onOpenChange={setEffortNumpadOpen}>
            <PopoverTrigger asChild>
              <Input
                value={form.effortRate}
                readOnly
                className="w-[80px] touch-target !text-lg font-mono cursor-pointer"
              />
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <NumPad
                value={form.effortRate}
                onChange={(v) => updateField("effortRate", v)}
                onSubmit={() => setEffortNumpadOpen(false)}
                onClose={() => setEffortNumpadOpen(false)}
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="w-[19px]" />

        {/* Hours Worked */}
        <div className="flex flex-col gap-1">
          <Label className="text-sm text-muted-foreground">{t("timeTracking.hoursWorked")}</Label>
          <div className="touch-target flex items-center px-3 rounded-md border bg-muted font-mono text-lg font-medium">{hoursWorked.toFixed(2)}h</div>
        </div>

        <div className="w-[19px]" />

        {/* Submit */}
        <Button
          className="touch-target gap-2 bg-green-600 hover:bg-green-700 text-white"
          onClick={handleSubmit}
          disabled={loading || !form.employeeCode || !form.startTime || !form.endTime}
        >
          {t("actions.submit")}
        </Button>
      </div>

    </div>

    <div className="bg-white rounded-lg p-1.5">
      <EmployeeHoursTable
        employeeCode={form.employeeCode}
        date={form.date}
        refreshTrigger={refreshTrigger}
      />
    </div>
  </div>
  );
}
