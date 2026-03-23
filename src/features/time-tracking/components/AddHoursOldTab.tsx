/**
 * AddHoursOldTab — Exact replica of the old ColdFusion "Emploi Du Temps" tab layout.
 * Uses the same API endpoints as AddHoursTab but with the old table-based form structure.
 * Source: operation.cfc lines 1351-1440 (entry form) + 5560-5734 (employee results table)
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSession } from "@/context/SessionContext";
import { toast } from "sonner";
import { Trash2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { apiGet, apiPost } from "@/api/client";
import { addHours, getEffortRate, getEmployeeHours, deleteEmployeeHours, updateEmployeeHours } from "@/api/timeTracking";
import type { Employee } from "@/types/employee";
import type { Department } from "@/types/department";
import type { Machine } from "@/types/machine";
import type { EmployeeHoursEntry } from "@/types/timeTracking";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Format minutes as HH:MM (old CF style: NumberFormat(h,'00'):NumberFormat(m,'00')) */
function fmtHHMM(totalMinutes: number): string {
  if (totalMinutes < 0) return "Negative";
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** Detect current shift based on time (operation.cfc:1197-1228) */
function detectCurrentShift(): string {
  const now = new Date();
  const h = now.getHours();
  const m = now.getMinutes();
  const mins = h * 60 + m;
  if (mins >= 420 && mins < 930) return "07:00 - 15:30"; // 7:00-15:30
  if (mins >= 930 || mins < 0 + 1) return "15:30 - 00:00"; // 15:30-00:00 (or midnight)
  if (mins >= 0 && mins < 420) return "00:00 - 07:00"; // 00:00-07:00
  return "08:00 - 16:30"; // fallback
}

/** Parse shift string "HH:MM - HH:MM" into start/end times (sp_js.cfm:474-489) */
function parseShiftTimes(shift: string, date: string): { start: string; end: string } {
  const parts = shift.split(" - ");
  const startTime = parts[0]?.trim() || "00:00";
  const endTime = parts[1]?.trim() || "00:00";

  let endDate = date;
  if (endTime.startsWith("00:")) {
    const d = new Date(date);
    d.setDate(d.getDate() + 1);
    endDate = d.toISOString().slice(0, 10);
  }

  return {
    start: `${date}T${startTime}`,
    end: `${endDate}T${endTime}`,
  };
}

/** Calculate duration in minutes between two datetime-local values */
function calcMinutes(start: string, end: string): number {
  if (!start || !end) return 0;
  const s = new Date(start.replace("T", " "));
  const e = new Date(end.replace("T", " "));
  return Math.round((e.getTime() - s.getTime()) / 60000);
}

/** Format datetime string to "HH:MM" for display */
function timeOnly(datetime: string): string {
  if (!datetime) return "";
  // Handle both "2026-03-23T07:00" and "2026-03-23 07:00:00"
  const tIdx = datetime.indexOf("T");
  const spaceIdx = datetime.indexOf(" ");
  const sep = tIdx !== -1 ? tIdx : spaceIdx;
  if (sep === -1) return datetime;
  return datetime.slice(sep + 1, sep + 6);
}

// ─── Styles (matching old CF inline styles) ───────────────────────────────────

const inputStyle: React.CSSProperties = {
  fontSize: "24px",
  height: "36px",
  borderColor: "#2B78E4",
  color: "#2B78E4",
};

const selectStyle: React.CSSProperties = {
  height: "44px",
  borderColor: "#2B78E4",
  color: "#2B78E4",
  fontSize: "24px",
  marginTop: 0,
};

const displayStyle: React.CSSProperties = {
  fontSize: "24px",
  height: "36px",
  color: "#2B78E4",
  display: "flex",
  alignItems: "center",
};

const thStyle: React.CSSProperties = {
  fontSize: "18px",
  borderBottom: "1px black solid",
};

// ─── Component ────────────────────────────────────────────────────────────────

export function AddHoursOldTab({ tabsList }: { tabsList?: React.ReactNode }) {
  const { t } = useTranslation();
  const { state } = useSession();
  const lang = state.language;

  // ─── Reference data ─────────────────────────────────────────────────────────
  const [departments, setDepartments] = useState<Department[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);

  useEffect(() => {
    apiGet<Department[]>("getDepartments.cfm").then((r) => { if (r.success) setDepartments(r.data); });
    apiGet<Machine[]>("getMachines.cfm").then((r) => { if (r.success) setMachines(r.data); });
  }, []);

  // ─── Row 1: Employee / Date / Shift ─────────────────────────────────────────
  const [employeeCode, setEmployeeCode] = useState("");
  const [employeeName, setEmployeeName] = useState("");
  const [employeeSeq, setEmployeeSeq] = useState(0);
  const [dateJour, setDateJour] = useState(new Date().toISOString().slice(0, 10));
  const [quartJour, setQuartJour] = useState(detectCurrentShift);

  // ─── Row 2: New entry form ──────────────────────────────────────────────────
  const [dateDebut, setDateDebut] = useState("");
  const [dateFin, setDateFin] = useState("");
  const [dept, setDept] = useState("0");
  const [machine, setMachine] = useState("0");
  const [effort, setEffort] = useState("100");

  // Auto-fill start/end from date+shift (changeDateDebutFin: sp_js.cfm:474-489)
  useEffect(() => {
    if (dateJour && quartJour) {
      const { start, end } = parseShiftTimes(quartJour, dateJour);
      setDateDebut(start);
      setDateFin(end);
    }
  }, [dateJour, quartJour]);

  const durationMin = useMemo(() => calcMinutes(dateDebut, dateFin), [dateDebut, dateFin]);
  const effortMin = useMemo(() => Math.round(durationMin * (Number(effort) / 100)), [durationMin, effort]);

  // ─── Employee lookup (afficheNomEmploye: sp_js.cfm:612-638) ────────────────
  const lookupEmployee = useCallback(async () => {
    if (!employeeCode) return;
    try {
      const res = await apiPost<Employee>("validateEmployee.cfm", { employeeCode: Number(employeeCode) });
      if (res.success && res.data) {
        setEmployeeName(res.data.EMNOM);
        setEmployeeSeq(res.data.EMSEQ);
      } else {
        setEmployeeName("");
        setEmployeeSeq(0);
      }
    } catch { /* ignore */ }
  }, [employeeCode]);

  // ─── Machine cascade: fetch effort rate (trouveEffort: sp_js.cfm:580-591) ──
  const handleMachineChange = useCallback(async (maseq: string) => {
    setMachine(maseq);
    if (maseq && maseq !== "0") {
      try {
        const res = await getEffortRate(Number(maseq));
        if (res.success && res.data) {
          setEffort(String(Math.round(res.data.effortRate)));
        }
      } catch { /* ignore */ }
    }
  }, []);

  const filteredMachines = useMemo(
    () => dept && dept !== "0" ? machines.filter((m) => m.DEPARTEMENT === Number(dept)) : machines,
    [machines, dept],
  );

  // ─── Submit new entry (AjouteModifieTempsHomme('0',''): sp_js.cfm:795-840) ─
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = useCallback(async () => {
    // Validation (sp_js.cfm:802-821)
    if (!dateDebut) { toast.error("Date début manquante"); return; }
    if (!dateFin) { toast.error("Date fin manquante"); return; }
    if (!dept || dept === "0") { toast.error("Département manquant"); return; }
    if (!machine || machine === "0") { toast.error("Machine manquante"); return; }
    if (!employeeSeq) { toast.error("Employé manquant"); return; }

    setSubmitting(true);
    try {
      const res = await addHours({
        employeeCode: employeeSeq,
        date: dateJour,
        shift: 0,
        startTime: dateDebut.includes("T") ? dateDebut.split("T")[1] : dateDebut,
        endTime: dateFin.includes("T") ? dateFin.split("T")[1] : dateFin,
        department: Number(dept),
        machine: Number(machine),
        effortRate: Number(effort),
      });
      if (res.success) {
        toast.success(t("timeTracking.hoursSaved"));
        setMachine("0"); // Clear machine after submit (sp_js.cfm:833)
        setRefresh((p) => p + 1);
      } else {
        toast.error(res.message || "Erreur: doublon ou durée négative");
      }
    } catch {
      toast.error("Erreur");
    } finally {
      setSubmitting(false);
    }
  }, [dateDebut, dateFin, dept, machine, effort, employeeSeq, dateJour, t]);

  // ─── Employee results table ─────────────────────────────────────────────────
  const [entries, setEntries] = useState<EmployeeHoursEntry[]>([]);
  const [loadingEntries, setLoadingEntries] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [lastEHSEQ, setLastEHSEQ] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);

  // Fetch employee hours when employee/date change
  useEffect(() => {
    if (!employeeSeq || !dateJour) { setEntries([]); return; }
    setLoadingEntries(true);
    getEmployeeHours({ employeeCode: employeeSeq, date: dateJour })
      .then((res) => { if (res.success) setEntries(res.data); })
      .catch(() => {})
      .finally(() => setLoadingEntries(false));
  }, [employeeSeq, dateJour, refresh]);

  // Totals (operation.cfc:5648-5649, 5712-5715)
  const totalDuration = useMemo(() => entries.reduce((s, e) => s + e.EHDUREE, 0), [entries]);
  const totalEffort = useMemo(() => entries.reduce((s, e) => s + e.HOURSWORKED, 0), [entries]);

  // ─── Inline edit state for each row ─────────────────────────────────────────
  const [rowEdits, setRowEdits] = useState<Record<number, {
    dateDebut: string; dateFin: string; dept: string; machine: string; effort: string;
  }>>({});

  // Initialize row edits when entries load
  useEffect(() => {
    const edits: typeof rowEdits = {};
    for (const e of entries) {
      edits[e.EHSEQ] = {
        dateDebut: e.EHDEBUT.replace(" ", "T").slice(0, 16),
        dateFin: e.EHFIN.replace(" ", "T").slice(0, 16),
        dept: String(e.DEPARTEMENT),
        machine: String(e.MACHINE),
        effort: String(e.EFFORTRATE),
      };
    }
    setRowEdits(edits);
  }, [entries]);

  const updateRowEdit = useCallback((ehseq: number, field: string, value: string) => {
    setRowEdits((prev) => ({
      ...prev,
      [ehseq]: { ...prev[ehseq], [field]: value },
    }));
  }, []);

  const handleRowMachineChange = useCallback(async (ehseq: number, maseq: string) => {
    updateRowEdit(ehseq, "machine", maseq);
    if (maseq && maseq !== "0") {
      try {
        const res = await getEffortRate(Number(maseq));
        if (res.success && res.data) {
          updateRowEdit(ehseq, "effort", String(Math.round(res.data.effortRate)));
        }
      } catch { /* ignore */ }
    }
  }, [updateRowEdit]);

  // Save row (AjouteModifieTempsHomme(EMPHSEQ, 'EMP_'): sp_js.cfm:795-840)
  const handleRowSave = useCallback(async (ehseq: number) => {
    const row = rowEdits[ehseq];
    if (!row) return;
    try {
      const res = await updateEmployeeHours({
        ehseq,
        startTime: row.dateDebut,
        endTime: row.dateFin,
        department: Number(row.dept),
        machine: Number(row.machine),
        effortRate: Number(row.effort),
      });
      if (res.success) {
        toast.success(t("timeTracking.entryUpdated"));
        setLastEHSEQ(ehseq);
        setRefresh((p) => p + 1);
      } else {
        toast.error(res.message || "Erreur: doublon ou durée négative");
      }
    } catch {
      toast.error("Erreur");
    }
  }, [rowEdits, t]);

  // Delete row (retireTempsHomme: sp_js.cfm:780-789)
  const handleDelete = useCallback(async (ehseq: number) => {
    try {
      const res = await deleteEmployeeHours(ehseq);
      if (res.success) {
        toast.success(t("timeTracking.entryDeleted"));
        setRefresh((p) => p + 1);
      }
    } catch {
      toast.error("Erreur");
    }
    setDeleteTarget(null);
  }, [t]);

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div>
      {/* Tab header bar */}
      <div className="relative flex min-h-[52px] items-center justify-center bg-black px-3 py-2 rounded-t-lg">
        {employeeName ? (
          <div className="pointer-events-none absolute left-5 top-1/2 z-10 max-w-[min(38%,260px)] -translate-y-1/2 truncate text-left">
            <span className="text-lg font-semibold text-white">{employeeName}</span>
          </div>
        ) : null}
        <div className="flex shrink-0 items-center">{tabsList}</div>
      </div>

      <div className="bg-white rounded-b-lg p-3">
        {/* ═══ ROW 1: Employee / Date / Shift (operation.cfc:1354-1381) ═══ */}
        <div className="flex items-center gap-4 flex-wrap mb-4">
          <div className="flex items-center gap-2">
            <b className="text-sm uppercase whitespace-nowrap">{t("timeTracking.employee")}:</b>
            <input
              type="text"
              className="form-control border rounded px-2"
              style={{ ...inputStyle, width: "100px" }}
              value={employeeCode}
              onChange={(e) => setEmployeeCode(e.target.value)}
              onBlur={lookupEmployee}
              onKeyDown={(e) => { if (e.key === "Enter") lookupEmployee(); }}
            />
            <div style={{ color: "#2B78E4", fontSize: "24px", minWidth: 150 }}>{employeeName}</div>
          </div>

          <div className="flex items-center gap-2">
            <b className="text-sm uppercase whitespace-nowrap">{t("timeTracking.day") || "JOUR"}:</b>
            <input
              type="date"
              className="form-control border rounded px-2"
              style={{ ...inputStyle, width: "200px" }}
              value={dateJour}
              onChange={(e) => setDateJour(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2">
            <b className="text-sm uppercase whitespace-nowrap">{t("timeTracking.shift")}:</b>
            <select
              className="form-control border rounded px-2"
              style={{ ...selectStyle, width: "350px" }}
              value={quartJour}
              onChange={(e) => setQuartJour(e.target.value)}
            >
              <option value="07:00 - 15:30">QUART 1 (07:00 - 15:30)</option>
              <option value="15:30 - 00:00">QUART 2 (15:30 - 00:00)</option>
              <option value="00:00 - 07:00">QUART 3 (00:00 - 07:00)</option>
            </select>
          </div>
        </div>

        {/* ═══ ROW 2: Entry form table (operation.cfc:1382-1436) ═══ */}
        <table className="w-full border-collapse border text-left mb-4" style={{ borderColor: "#dee2e6" }}>
          <thead>
            <tr style={{ backgroundColor: "#c3e6cb" }}>
              <th style={{ ...thStyle, width: "10%" }}>{t("timeTracking.dateStart").toUpperCase()}</th>
              <th style={{ ...thStyle, width: "10%" }}>{t("timeTracking.dateEnd").toUpperCase()}</th>
              <th style={{ ...thStyle, width: "10%" }}>{t("timeTracking.duration").toUpperCase()}</th>
              <th style={{ ...thStyle, width: "15%" }}>{t("operation.department").toUpperCase()}</th>
              <th style={{ ...thStyle, width: "30%" }}>{t("operation.machine").toUpperCase()}</th>
              <th style={{ ...thStyle, width: "5%" }}>{t("timeTracking.effortRate").toUpperCase()}</th>
              <th style={{ ...thStyle, width: "10%" }}>{t("timeTracking.hoursWorked").toUpperCase()}</th>
              <th style={{ ...thStyle, width: "10%" }}>ACTION</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border p-1">
                <input type="datetime-local" className="form-control border rounded w-full" style={inputStyle}
                  value={dateDebut} onChange={(e) => setDateDebut(e.target.value)} />
              </td>
              <td className="border p-1">
                <input type="datetime-local" className="form-control border rounded w-full" style={inputStyle}
                  value={dateFin} onChange={(e) => setDateFin(e.target.value)} />
              </td>
              <td className="border p-1">
                <div style={displayStyle}>{fmtHHMM(durationMin)}</div>
              </td>
              <td className="border p-1">
                <select className="form-control border rounded" style={{ ...selectStyle, width: "250px" }}
                  value={dept} onChange={(e) => { setDept(e.target.value); setMachine("0"); }}>
                  <option value="0">--</option>
                  {departments.map((d) => (
                    <option key={d.DESEQ} value={d.DESEQ}>
                      {lang === "en" ? d.DEDESCRIPTION_S : d.DEDESCRIPTION_P}
                    </option>
                  ))}
                </select>
              </td>
              <td className="border p-1">
                <select className="form-control border rounded" style={{ ...selectStyle, width: "100%" }}
                  value={machine} onChange={(e) => handleMachineChange(e.target.value)}>
                  <option value="0">--</option>
                  {filteredMachines.map((m) => (
                    <option key={m.MASEQ} value={m.MASEQ}>
                      {lang === "en" ? m.MADESC_S : m.MADESC_P}
                    </option>
                  ))}
                </select>
              </td>
              <td className="border p-1">
                <input type="number" className="form-control border rounded" style={{ ...inputStyle, width: "80px" }}
                  value={effort} onChange={(e) => setEffort(e.target.value)} />
              </td>
              <td className="border p-1">
                <div style={displayStyle}>{fmtHHMM(effortMin)}</div>
              </td>
              <td className="border p-1 text-center">
                <button
                  className="border rounded px-4 font-bold"
                  style={{ height: 38, fontSize: 16, borderColor: "#28a745", color: "#28a745", backgroundColor: "white" }}
                  onClick={handleSubmit}
                  disabled={submitting}
                >
                  OK
                </button>
              </td>
            </tr>
          </tbody>
        </table>

        {/* ═══ ROW 3: Employee hours results (afficheTempsEmploye: operation.cfc:5560-5734) ═══ */}
        {employeeSeq > 0 && (
          <div>
            <h2 className="text-xl font-bold mb-2">
              {entries.length} RÉSULTAT{entries.length !== 1 ? "S" : ""} POUR {employeeName}
            </h2>

            {loadingEntries ? (
              <div className="text-center py-4 text-gray-500">{t("common.loading")}...</div>
            ) : (
              <table className="w-full border-collapse border text-left" style={{ borderColor: "#dee2e6" }}>
                <thead>
                  <tr style={{ backgroundColor: "#e9ecef" }}>
                    <th style={{ ...thStyle, width: "10%" }}>{t("timeTracking.dateStart").toUpperCase()}</th>
                    <th style={{ ...thStyle, width: "10%" }}>{t("timeTracking.dateEnd").toUpperCase()}</th>
                    <th style={{ ...thStyle, width: "5%" }}>{t("timeTracking.duration").toUpperCase()}</th>
                    <th style={{ ...thStyle, width: "25%" }}>{t("operation.department").toUpperCase()}</th>
                    <th style={{ ...thStyle, width: "30%" }}>{t("operation.machine").toUpperCase()}</th>
                    <th style={{ ...thStyle, width: "5%" }}>{t("timeTracking.effortRate").toUpperCase()}</th>
                    <th style={{ ...thStyle, width: "5%" }}>{t("timeTracking.hoursWorked").toUpperCase()}</th>
                    <th style={{ ...thStyle, width: "10%" }}>ACTION</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry) => {
                    const row = rowEdits[entry.EHSEQ];
                    if (!row) return null;
                    const rowDuration = calcMinutes(row.dateDebut, row.dateFin);
                    const rowEffort = Math.round(rowDuration * (Number(row.effort) / 100));
                    const bgColor = lastEHSEQ === entry.EHSEQ ? "#b2e3eb" : "#ffffff";
                    const rowFilteredMachines = row.dept && row.dept !== "0"
                      ? machines.filter((m) => m.DEPARTEMENT === Number(row.dept))
                      : machines;

                    return (
                      <tr key={entry.EHSEQ} style={{ backgroundColor: bgColor }}>
                        <td className="border p-1">
                          <input type="datetime-local" className="form-control border rounded w-full" style={inputStyle}
                            value={row.dateDebut}
                            onChange={(e) => updateRowEdit(entry.EHSEQ, "dateDebut", e.target.value)} />
                        </td>
                        <td className="border p-1">
                          <input type="datetime-local" className="form-control border rounded w-full" style={inputStyle}
                            value={row.dateFin}
                            onChange={(e) => updateRowEdit(entry.EHSEQ, "dateFin", e.target.value)} />
                        </td>
                        <td className="border p-1">
                          <div style={displayStyle}>{fmtHHMM(rowDuration)}</div>
                        </td>
                        <td className="border p-1">
                          <select className="form-control border rounded" style={{ ...selectStyle, width: "250px" }}
                            value={row.dept}
                            onChange={(e) => { updateRowEdit(entry.EHSEQ, "dept", e.target.value); updateRowEdit(entry.EHSEQ, "machine", "0"); }}>
                            {departments.map((d) => (
                              <option key={d.DESEQ} value={d.DESEQ}>
                                {lang === "en" ? d.DEDESCRIPTION_S : d.DEDESCRIPTION_P}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="border p-1">
                          <select className="form-control border rounded" style={{ ...selectStyle, width: "100%" }}
                            value={row.machine}
                            onChange={(e) => handleRowMachineChange(entry.EHSEQ, e.target.value)}>
                            <option value="0">--</option>
                            {rowFilteredMachines.map((m) => (
                              <option key={m.MASEQ} value={m.MASEQ}>
                                {lang === "en" ? m.MADESC_S : m.MADESC_P}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="border p-1">
                          <input type="number" className="form-control border rounded" style={{ ...inputStyle, width: "80px" }}
                            value={row.effort}
                            onChange={(e) => updateRowEdit(entry.EHSEQ, "effort", e.target.value)} />
                        </td>
                        <td className="border p-1">
                          <div style={displayStyle}>{fmtHHMM(rowEffort)}</div>
                        </td>
                        <td className="border p-1">
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon"
                              className="text-red-600 hover:text-red-700"
                              onClick={() => setDeleteTarget(entry.EHSEQ)}>
                              <Trash2 size={20} />
                            </Button>
                            <Button variant="ghost" size="icon"
                              className="text-blue-600 hover:text-blue-700"
                              onClick={() => handleRowSave(entry.EHSEQ)}>
                              <Pencil size={20} />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                {entries.length > 0 && (
                  <tfoot>
                    <tr style={{ backgroundColor: "#e9ecef", fontWeight: "bold" }}>
                      <td className="border p-1" />
                      <td className="border p-1" />
                      <td className="border p-1">
                        <div style={{ ...displayStyle, fontWeight: "bold" }}>{fmtHHMM(totalDuration)}</div>
                      </td>
                      <td className="border p-1" />
                      <td className="border p-1" />
                      <td className="border p-1" />
                      <td className="border p-1">
                        <div style={{ ...displayStyle, fontWeight: "bold" }}>{fmtHHMM(totalEffort)}</div>
                      </td>
                      <td className="border p-1" />
                    </tr>
                  </tfoot>
                )}
              </table>
            )}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={t("timeTracking.confirmDelete")}
        description={t("timeTracking.confirmDelete")}
        onConfirm={() => { if (deleteTarget !== null) handleDelete(deleteTarget); }}
      />
    </div>
  );
}
