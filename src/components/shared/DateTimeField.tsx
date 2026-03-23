import { useState } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { CalendarDays } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { NumPad } from "@/components/shared/NumPad";
import { useSession } from "@/context/SessionContext";
import { cn } from "@/lib/utils";

interface DateTimeFieldProps {
  value: string; // "yyyy-MM-dd HH:mm"
  onChange: (value: string) => void;
  /** Render the date button in light gray (same date as a reference) */
  dateGrayed?: boolean;
}

// ─── Parsing helpers ──────────────────────────────────────────────────────────

function parseDateTime(v: string): { dateObj: Date | null; timePart: string } {
  if (!v) return { dateObj: null, timePart: "00:00" };
  const normalized = v.replace("T", " ");
  const [datePart = "", timePart = "00:00"] = normalized.split(" ");
  const [y, m, d] = datePart.split("-").map(Number);
  if (!y || !m || !d) return { dateObj: null, timePart };
  return { dateObj: new Date(y, m - 1, d), timePart };
}

function buildValue(dateObj: Date | null, timePart: string): string {
  if (!dateObj) return "";
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, "0");
  const d = String(dateObj.getDate()).padStart(2, "0");
  return `${y}-${m}-${d} ${timePart}`;
}

/** "10:22" → "1022" */
function timeToRaw(time: string): string {
  return (time || "0000").replace(":", "").slice(0, 4);
}

/** "1" → "01:--", "102" → "10:2-", "1022" → "10:22" */
function formatTimeDisplay(raw: string): string {
  const d = raw.slice(0, 4);
  const hh = (d.slice(0, 2) || "--").padStart(2, "-");
  const mm = (d.slice(2) || "").padEnd(2, "-");
  return `${hh}:${mm}`;
}

/** Clamp "1022" → "10:22", "2590" → "23:59" */
function rawToTime(raw: string): string {
  const d = raw.padStart(4, "0").slice(0, 4);
  const hh = Math.min(Number(d.slice(0, 2)), 23);
  const mm = Math.min(Number(d.slice(2)), 59);
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function DateTimeField({ value, onChange, dateGrayed = false }: DateTimeFieldProps) {
  const { state } = useSession();
  const locale = state.language === "fr" ? fr : undefined;
  const [dateOpen, setDateOpen] = useState(false);
  const [timeOpen, setTimeOpen] = useState(false);
  const [rawTime, setRawTime] = useState("");

  const { dateObj, timePart } = parseDateTime(value);

  // ── Date picker ─────────────────────────────────────────────────────────────
  const handleDateSelect = (d: Date | undefined) => {
    if (!d) return;
    onChange(buildValue(d, timePart));
    setDateOpen(false);
  };

  // ── Time numpad ─────────────────────────────────────────────────────────────
  const applyTime = (raw: string) => {
    const newTime = rawToTime(raw || timeToRaw(timePart));
    onChange(buildValue(dateObj, newTime));
  };

  const handleTimeOpenChange = (open: boolean) => {
    if (open) {
      setRawTime(timeToRaw(timePart)); // pre-fill so first digit replaces
    } else {
      applyTime(rawTime);
    }
    setTimeOpen(open);
  };

  const handleTimeSubmit = () => {
    applyTime(rawTime);
    setTimeOpen(false);
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  const dateLabel = dateObj ? format(dateObj, "d MMM yyyy", { locale }) : "—";
  const timeLabel = timeOpen ? formatTimeDisplay(rawTime) : (timePart || "00:00");

  return (
    <div className="flex items-center gap-1.5">
      {/* ── Date picker popover ── */}
      <Popover open={dateOpen} onOpenChange={setDateOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(
              "touch-target inline-flex items-center gap-1.5 rounded-md border px-3 font-semibold text-sm whitespace-nowrap transition-colors",
              dateGrayed
                ? "text-gray-400 border-gray-200 bg-gray-50 hover:bg-gray-100"
                : "text-foreground border-input bg-white hover:bg-accent"
            )}
          >
            <CalendarDays className="size-4 shrink-0" />
            {dateLabel}
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={dateObj ?? undefined}
            onSelect={handleDateSelect}
            initialFocus
            classNames={{
              month_caption: "flex items-center justify-center h-(--cell-size) w-full px-(--cell-size)",
              caption_label: "select-none font-semibold text-lg",
              weekday: "text-muted-foreground rounded-md flex-1 font-normal text-base select-none",
            }}
            className="[--cell-size:--spacing(11)] [&_.rdp-day_button]:!text-lg [&_.rdp-month_caption]:!text-lg [&_.rdp-weekday]:!text-base"
          />
        </PopoverContent>
      </Popover>

      {/* ── Time numpad popover ── */}
      <Popover open={timeOpen} onOpenChange={handleTimeOpenChange}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="touch-target inline-flex items-center justify-center rounded-md border border-blue-400 bg-blue-50 px-4 font-bold text-xl text-blue-700 hover:bg-blue-100 tabular-nums min-w-[90px] transition-colors"
          >
            {timeLabel}
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <NumPad
            value={rawTime}
            displayValue={rawTime ? formatTimeDisplay(rawTime) : (timePart || "00:00")}
            onChange={(v) => setRawTime(v.replace(/\D/g, "").slice(0, 4))}
            onSubmit={handleTimeSubmit}
            onClose={() => setTimeOpen(false)}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
