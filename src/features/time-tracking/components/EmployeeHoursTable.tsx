import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { NumPad } from "@/components/shared/NumPad";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Trash2, Pencil, Check, X } from "lucide-react";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { W_EMPLOYEE_HOURS } from "@/constants/widths";
import { useEmployeeHours } from "../hooks/useEmployeeHours";
import { apiGet } from "@/api/client";
import type { Department } from "@/types/department";
import type { Machine } from "@/types/machine";

interface EmployeeHoursTableProps {
  employeeCode: string;
  date: string;
  refreshTrigger?: number;
}

interface EditState {
  ehseq: number;
  startTime: string;
  endTime: string;
  department: number;
  machine: number;
  effortRate: number;
}

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h${m.toString().padStart(2, "0")}`;
}

function formatTime(datetime: string): string {
  const parts = datetime.split(" ");
  if (parts.length >= 2) {
    return parts[1].slice(0, 5);
  }
  return datetime;
}

function calcDuration(startTime: string, endTime: string): number {
  const [sh, sm] = startTime.split(":").map(Number);
  const [eh, em] = endTime.split(":").map(Number);
  return (eh * 60 + em) - (sh * 60 + sm);
}

function formatTimeDisplay(raw: string) {
  if (raw.length === 0) return "HH:MM";
  if (raw.length === 1) return `_${raw}:__`;
  if (raw.length === 2) return `${raw}:__`;
  if (raw.length === 3) return `${raw.slice(0, 2)}:${raw.slice(2)}_`;
  return `${raw.slice(0, 2)}:${raw.slice(2)}`;
}

function formatTimeRaw(raw: string) {
  const padded = raw.padStart(4, "0").slice(0, 4);
  return `${padded.slice(0, 2)}:${padded.slice(2)}`;
}

export function EmployeeHoursTable({
  employeeCode,
  date,
  refreshTrigger,
}: EmployeeHoursTableProps) {
  const { t } = useTranslation();
  const { state } = useSession();
  const lang = state.language;
  const { entries, loading, fetchHours, deleteEntry, updateEntry, totals } = useEmployeeHours();
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);
  const [editing, setEditing] = useState<EditState | null>(null);

  // Reference data for dropdowns
  const [departments, setDepartments] = useState<Department[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);

  // Time numpad state
  const [timeNumpadField, setTimeNumpadField] = useState<"startTime" | "endTime" | null>(null);
  const [timeRaw, setTimeRaw] = useState("");
  const [timeIsPreloaded, setTimeIsPreloaded] = useState(false);

  // Effort numpad state
  const [effortNumpadOpen, setEffortNumpadOpen] = useState(false);

  useEffect(() => {
    if (employeeCode && date) {
      fetchHours(Number(employeeCode), date);
    }
  }, [employeeCode, date, refreshTrigger]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load departments and machines when editing starts
  useEffect(() => {
    if (editing && departments.length === 0) {
      apiGet<Department[]>("getDepartments.cfm").then((res) => {
        if (res.success) setDepartments(res.data);
      });
      apiGet<Machine[]>("getMachines.cfm").then((res) => {
        if (res.success) setMachines(res.data);
      });
    }
  }, [editing, departments.length]);

  const filteredMachines = editing
    ? machines.filter((m) => m.DEPARTEMENT === editing.department)
    : [];

  const startEdit = (entry: typeof entries[0]) => {
    setEditing({
      ehseq: entry.EHSEQ,
      startTime: formatTime(entry.EHDEBUT),
      endTime: formatTime(entry.EHFIN),
      department: entry.DEPARTEMENT,
      machine: 0, // Will be resolved from MACODE
      effortRate: entry.EFFORTRATE,
    });
    // Resolve machine MASEQ from MACODE once machines load
    if (machines.length > 0) {
      const found = machines.find((m) => m.MACODE === entry.MACODE);
      if (found) {
        setEditing((prev) => prev ? { ...prev, machine: found.MASEQ } : prev);
      }
    }
  };

  // Resolve machine MASEQ when machines load after edit starts
  useEffect(() => {
    if (editing && machines.length > 0 && editing.machine === 0) {
      const entry = entries.find((e) => e.EHSEQ === editing.ehseq);
      if (entry) {
        const found = machines.find((m) => m.MACODE === entry.MACODE);
        if (found) {
          setEditing((prev) => prev ? { ...prev, machine: found.MASEQ } : prev);
        }
      }
    }
  }, [editing, machines, entries]);

  const cancelEdit = () => {
    setEditing(null);
    setTimeNumpadField(null);
    setTimeRaw("");
    setEffortNumpadOpen(false);
  };

  const saveEdit = async () => {
    if (!editing) return;
    const success = await updateEntry(editing);
    if (success) {
      // Update local machine display names
      const machine = machines.find((m) => m.MASEQ === editing.machine);
      const dept = departments.find((d) => d.DESEQ === editing.department);
      if (machine || dept) {
        // Force refetch to get clean data
        if (employeeCode && date) {
          fetchHours(Number(employeeCode), date);
        }
      }
      setEditing(null);
    }
  };

  const openTimeNumpad = (field: "startTime" | "endTime") => {
    if (!editing) return;
    const current = editing[field];
    setTimeRaw(current ? current.replace(":", "") : "");
    setTimeIsPreloaded(!!current);
    setTimeNumpadField(field);
  };

  const handleTimeNumpadSubmit = () => {
    if (timeNumpadField && timeRaw.length >= 3 && editing) {
      setEditing({ ...editing, [timeNumpadField]: formatTimeRaw(timeRaw) });
    }
    setTimeNumpadField(null);
    setTimeRaw("");
  };

  const handleTimeNumpadClose = () => {
    setTimeNumpadField(null);
    setTimeRaw("");
  };

  if (!employeeCode) return null;

  if (loading) {
    return (
      <div className="text-center text-muted-foreground py-4">
        {t("common.loading")}...
      </div>
    );
  }

  const editDuration = editing ? calcDuration(editing.startTime, editing.endTime) : 0;
  const editHoursWorked = editing ? Math.round(editDuration * (editing.effortRate / 100)) : 0;

  return (
    <>
      <h3 className="text-base font-semibold mt-4 mb-2">
        {t("timeTracking.employeeHoursTitle")}
      </h3>
      <div className="border rounded-md overflow-auto">
        <Table>
          <TableHeader>
            <TableRow className="h-[56px]">
              <TableHead className={W_EMPLOYEE_HOURS.startEnd}>{t("timeTracking.startTime")}</TableHead>
              <TableHead className={W_EMPLOYEE_HOURS.startEnd}>{t("timeTracking.endTime")}</TableHead>
              <TableHead className={W_EMPLOYEE_HOURS.duration}>{t("timeTracking.duration")}</TableHead>
              <TableHead className={W_EMPLOYEE_HOURS.department}>{t("operation.department")}</TableHead>
              <TableHead className={W_EMPLOYEE_HOURS.machine}>{t("operation.machine")}</TableHead>
              <TableHead className={W_EMPLOYEE_HOURS.employee}>{t("timeTracking.employee")}</TableHead>
              <TableHead className={W_EMPLOYEE_HOURS.effortRate}>{t("timeTracking.effortRate")}</TableHead>
              <TableHead className={W_EMPLOYEE_HOURS.hoursWorked}>{t("timeTracking.hoursWorked")}</TableHead>
              <TableHead className={W_EMPLOYEE_HOURS.actions}>{t("common.actions")}</TableHead>
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
              entries.map((entry) => {
                const isEditing = editing?.ehseq === entry.EHSEQ;

                if (isEditing && editing) {
                  return (
                    <TableRow key={entry.EHSEQ} className="h-[56px] bg-muted/30 text-lg">
                      {/* Start Time */}
                      <TableCell>
                        <Popover
                          open={timeNumpadField === "startTime"}
                          onOpenChange={(open) => {
                            if (open) openTimeNumpad("startTime");
                            else handleTimeNumpadClose();
                          }}
                        >
                          <PopoverTrigger asChild>
                            <Input
                              value={editing.startTime}
                              readOnly
                              className="w-[90px] !text-base font-mono cursor-pointer"
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
                      </TableCell>
                      {/* End Time */}
                      <TableCell>
                        <Popover
                          open={timeNumpadField === "endTime"}
                          onOpenChange={(open) => {
                            if (open) openTimeNumpad("endTime");
                            else handleTimeNumpadClose();
                          }}
                        >
                          <PopoverTrigger asChild>
                            <Input
                              value={editing.endTime}
                              readOnly
                              className="w-[90px] !text-base font-mono cursor-pointer"
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
                      </TableCell>
                      {/* Duration (computed) */}
                      <TableCell className="font-mono">
                        {editDuration > 0 ? formatDuration(editDuration) : "—"}
                      </TableCell>
                      {/* Department */}
                      <TableCell>
                        <Select
                          value={String(editing.department)}
                          onValueChange={(v) => {
                            const deptSeq = Number(v);
                            // Reset machine when department changes
                            const deptMachines = machines.filter((m) => m.DEPARTEMENT === deptSeq);
                            setEditing({
                              ...editing,
                              department: deptSeq,
                              machine: deptMachines.length === 1 ? deptMachines[0].MASEQ : 0,
                            });
                          }}
                        >
                          <SelectTrigger className="w-[160px] !h-10">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {departments.map((d) => (
                              <SelectItem key={d.DESEQ} value={String(d.DESEQ)}>
                                {d.DEDESCRIPTION_P}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      {/* Machine */}
                      <TableCell>
                        <Select
                          value={editing.machine ? String(editing.machine) : ""}
                          onValueChange={(v) =>
                            setEditing({ ...editing, machine: Number(v) })
                          }
                        >
                          <SelectTrigger className="w-[160px] !h-10">
                            <SelectValue placeholder="—" />
                          </SelectTrigger>
                          <SelectContent>
                            {filteredMachines.map((m) => (
                              <SelectItem key={m.MASEQ} value={String(m.MASEQ)}>
                                {m.MACODE} — {lang === "fr" ? m.MADESC_P : m.MADESC_S}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      {/* Employee (read-only) */}
                      <TableCell>{entry.EMNOM}</TableCell>
                      {/* Effort Rate */}
                      <TableCell>
                        <Popover open={effortNumpadOpen} onOpenChange={setEffortNumpadOpen}>
                          <PopoverTrigger asChild>
                            <Input
                              value={`${editing.effortRate}%`}
                              readOnly
                              className="w-[80px] !text-base font-mono cursor-pointer"
                            />
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <NumPad
                              value={String(editing.effortRate)}
                              onChange={(v) =>
                                setEditing({ ...editing, effortRate: Number(v) || 0 })
                              }
                              onSubmit={() => setEffortNumpadOpen(false)}
                              onClose={() => setEffortNumpadOpen(false)}
                            />
                          </PopoverContent>
                        </Popover>
                      </TableCell>
                      {/* Hours Worked (computed) */}
                      <TableCell className="font-mono font-bold">
                        {editHoursWorked > 0 ? formatDuration(editHoursWorked) : "—"}
                      </TableCell>
                      {/* Actions: Save / Cancel */}
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="touch-target text-green-600 hover:text-green-700"
                            onClick={saveEdit}
                          >
                            <Check size={18} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="touch-target text-muted-foreground hover:text-foreground"
                            onClick={cancelEdit}
                          >
                            <X size={18} />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                }

                return (
                  <TableRow key={entry.EHSEQ} className="h-[56px] text-lg">
                    <TableCell className="font-mono">{formatTime(entry.EHDEBUT)}</TableCell>
                    <TableCell className="font-mono">{formatTime(entry.EHFIN)}</TableCell>
                    <TableCell className="font-mono">{formatDuration(entry.EHDUREE)}</TableCell>
                    <TableCell>{entry.DECODE}</TableCell>
                    <TableCell>{lang === "fr" ? entry.MACHINE_P : entry.MACHINE_S}</TableCell>
                    <TableCell>{entry.EMNOM}</TableCell>
                    <TableCell className="font-mono">{entry.EFFORTRATE}%</TableCell>
                    <TableCell className="font-mono font-bold">{formatDuration(entry.HOURSWORKED)}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="touch-target text-blue-600 hover:text-blue-700"
                          onClick={() => startEdit(entry)}
                          disabled={editing !== null}
                        >
                          <Pencil size={18} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="touch-target text-red-600 hover:text-red-700"
                          onClick={() => setDeleteTarget(entry.EHSEQ)}
                          disabled={editing !== null}
                        >
                          <Trash2 size={18} />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
          {entries.length > 0 && (
            <TableFooter>
              <TableRow className="h-[56px] font-bold text-lg">
                <TableCell colSpan={2}>{t("timeTracking.totalHours")}</TableCell>
                <TableCell className="font-mono">{formatDuration(totals.totalDuration)}</TableCell>
                <TableCell colSpan={4} />
                <TableCell className="font-mono">{formatDuration(totals.totalHoursWorked)}</TableCell>
                <TableCell />
              </TableRow>
            </TableFooter>
          )}
        </Table>
      </div>

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={t("timeTracking.confirmDelete")}
        description={t("timeTracking.confirmDelete")}
        onConfirm={() => {
          if (deleteTarget !== null) {
            deleteEntry(deleteTarget);
            setDeleteTarget(null);
          }
        }}
      />
    </>
  );
}
