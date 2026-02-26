import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { apiPost } from "@/api/client";
import type { Employee } from "@/types/employee";
import { useState } from "react";

export function AddHoursTab() {
  const { t } = useTranslation();
  const { form, updateField, duration, hoursWorked, loading, submit } = useAddHours();
  const [empNumpadOpen, setEmpNumpadOpen] = useState(false);
  const [effortNumpadOpen, setEffortNumpadOpen] = useState(false);

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

  const formatDuration = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h}h${m.toString().padStart(2, "0")}`;
  };

  return (
    <Card>
      <CardHeader className="py-3 px-4">
        <CardTitle className="text-base">{t("timeTracking.addHours")}</CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-4">
        {/* Employee */}
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Label className="text-sm text-muted-foreground shrink-0">
              {t("timeTracking.employeeCode")}:
            </Label>
            <Popover open={empNumpadOpen} onOpenChange={setEmpNumpadOpen}>
              <PopoverTrigger asChild>
                <Input
                  value={form.employeeCode}
                  readOnly
                  className="w-[150px] touch-target text-lg font-mono cursor-pointer"
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
          <span className="text-lg font-medium">{form.employeeName || "—"}</span>
        </div>

        {/* Date + Shift */}
        <div className="flex items-end gap-4 flex-wrap">
          <div className="flex flex-col gap-1">
            <Label className="text-sm text-muted-foreground">{t("timeTracking.dateStart")}</Label>
            <Input
              type="date"
              value={form.date}
              onChange={(e) => updateField("date", e.target.value)}
              className="touch-target"
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-sm text-muted-foreground">{t("timeTracking.shift")}</Label>
            <Select
              value={form.shift}
              onValueChange={(v) => updateField("shift", v)}
            >
              <SelectTrigger className="w-[150px] h-10">
                <SelectValue placeholder={t("timeTracking.shift")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">{t("timeTracking.shift1")}</SelectItem>
                <SelectItem value="2">{t("timeTracking.shift2")}</SelectItem>
                <SelectItem value="3">{t("timeTracking.shift3")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Start/End times */}
        <div className="flex items-end gap-4 flex-wrap">
          <div className="flex flex-col gap-1">
            <Label className="text-sm text-muted-foreground">{t("timeTracking.startTime")}</Label>
            <Input
              type="time"
              value={form.startTime}
              onChange={(e) => updateField("startTime", e.target.value)}
              className="touch-target"
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-sm text-muted-foreground">{t("timeTracking.endTime")}</Label>
            <Input
              type="time"
              value={form.endTime}
              onChange={(e) => updateField("endTime", e.target.value)}
              className="touch-target"
            />
          </div>
        </div>

        {/* Department / Machine */}
        <div className="flex items-end gap-4 flex-wrap">
          <div className="flex flex-col gap-1">
            <Label className="text-sm text-muted-foreground">{t("operation.department")}</Label>
            <Input
              value={form.department}
              onChange={(e) => updateField("department", e.target.value)}
              placeholder={t("operation.department")}
              className="touch-target"
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-sm text-muted-foreground">{t("operation.machine")}</Label>
            <Input
              value={form.machine}
              onChange={(e) => updateField("machine", e.target.value)}
              placeholder={t("operation.machine")}
              className="touch-target"
            />
          </div>
        </div>

        {/* Effort rate */}
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Label className="text-sm text-muted-foreground shrink-0">
              {t("timeTracking.effortRate")} (%):
            </Label>
            <Popover open={effortNumpadOpen} onOpenChange={setEffortNumpadOpen}>
              <PopoverTrigger asChild>
                <Input
                  value={form.effortRate}
                  readOnly
                  className="w-[100px] touch-target text-lg font-mono cursor-pointer"
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

          <div className="flex items-center gap-2">
            <Label className="text-sm text-muted-foreground">{t("timeTracking.duration")}:</Label>
            <span className="text-lg font-mono font-medium">{formatDuration(duration)}</span>
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-sm text-muted-foreground">{t("timeTracking.hoursWorked")}:</Label>
            <span className="text-lg font-mono font-medium">{hoursWorked.toFixed(2)}h</span>
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end pt-2">
          <Button
            className="touch-target gap-2 text-lg bg-green-600 hover:bg-green-700 text-white"
            onClick={submit}
            disabled={loading || !form.employeeCode || !form.startTime || !form.endTime}
          >
            <Check size={20} />
            {t("actions.submit")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
