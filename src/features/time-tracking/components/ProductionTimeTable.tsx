import { useRef, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useSession } from "@/context/SessionContext";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Pencil, Loader2, Circle } from "lucide-react";
import { W_TIME_TRACKING } from "@/constants/widths";
import { STATUS_COLORS, STATUS_COLOR_DEFAULT } from "@/constants/statusColors";
import type { TimeEntry, ProductionTimeTotals } from "@/types/timeTracking";

interface ProductionTimeTableProps {
  entries: TimeEntry[];
  totals: ProductionTimeTotals | null;
  hasMore: boolean;
  loadingMore: boolean;
  onLoadMore: () => void;
  onStatusChange: (tjseq: number, statusCode: number) => void;
  showYear?: boolean;
}

/** Build unique status options from loaded entries (bilingual) */
function getStatusOptions(entries: TimeEntry[], lang: string) {
  const seen = new Map<number, { code: number; label: string; mpcode: string }>();
  for (const e of entries) {
    if (!seen.has(e.STATUT_CODE)) {
      seen.set(e.STATUT_CODE, {
        code: e.STATUT_CODE,
        label: lang === "fr" ? e.STATUT_P : e.STATUT_S,
        mpcode: e.MODEPROD_MPCODE,
      });
    }
  }
  return [...seen.values()].sort((a, b) => a.code - b.code);
}

function StatusDot({ mpcode }: { mpcode: string }) {
  const color = STATUS_COLORS[mpcode] ?? STATUS_COLOR_DEFAULT;
  return (
    <Circle className="size-3 shrink-0" fill={color} stroke={color} />
  );
}

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

/** Parse "YYYY-MM-DD HH:MM" into parts */
function parseDateParts(raw: string) {
  if (!raw) return null;
  const [date, time] = raw.split(" ");
  const [y, m, d] = date.split("-");
  return { y, m, d, mon: MONTHS[parseInt(m, 10) - 1] ?? m, time };
}

const TIME_COLOR = "text-blue-700 font-bold";

/** Render time portion in blue */
function TimeSpan({ time }: { time: string }) {
  return <span className={TIME_COLOR}>{time}</span>;
}

/** Format "YYYY-MM-DD HH:MM" → "DD-MMM HH:MM" or "DD-MMM-YYYY HH:MM" */
function formatDate(raw: string, showYear: boolean) {
  const p = parseDateParts(raw);
  if (!p) return null;
  const datePart = showYear ? `${p.d}-${p.mon}-${p.y} ` : `${p.d}-${p.mon} `;
  return <>{datePart}<TimeSpan time={p.time} /></>;
}

/** Format end date, omitting day/month when same as start date */
function formatEndDate(start: string, end: string, showYear: boolean) {
  const s = parseDateParts(start);
  const e = parseDateParts(end);
  if (!e) return null;
  if (!s) return formatDate(end, showYear);
  // Same day → show only time
  if (s.y === e.y && s.m === e.m && s.d === e.d) return <TimeSpan time={e.time} />;
  // Same month → show DD HH:MM (no month)
  if (s.y === e.y && s.m === e.m) return <>{e.d} <TimeSpan time={e.time} /></>;
  // Different month
  const datePart = showYear ? `${e.d}-${e.mon}-${e.y} ` : `${e.d}-${e.mon} `;
  return <>{datePart}<TimeSpan time={e.time} /></>;
}

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h${m.toString().padStart(2, "0")}`;
}

export function ProductionTimeTable({
  entries,
  totals,
  hasMore,
  loadingMore,
  onLoadMore,
  onStatusChange,
  showYear = false,
}: ProductionTimeTableProps) {
  const { t } = useTranslation();
  const { state } = useSession();
  const navigate = useNavigate();
  const lang = state.language;
  const statusOptions = getStatusOptions(entries, lang);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // IntersectionObserver on sentinel to trigger loading more
  const onLoadMoreRef = useRef(onLoadMore);
  onLoadMoreRef.current = onLoadMore;

  const handleIntersect = useCallback((entries: IntersectionObserverEntry[]) => {
    if (entries[0]?.isIntersecting) {
      onLoadMoreRef.current();
    }
  }, []);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    const container = scrollRef.current;
    if (!sentinel || !container) return;

    const observer = new IntersectionObserver(handleIntersect, {
      root: container,
      rootMargin: "200px",
    });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [handleIntersect, entries.length]);

  return (
    <div className="border rounded-md flex flex-col flex-1 min-h-0 text-[1.5rem]">
      {/* Sticky header */}
      <Table>
        <TableHeader>
          <TableRow className="h-[56px]">
            <TableHead className={`${W_TIME_TRACKING.date} text-center`}>{t("timeTracking.dateStart")}</TableHead>
            <TableHead className={`${W_TIME_TRACKING.dateEnd} text-left`}>{t("timeTracking.dateEnd")}</TableHead>
            <TableHead className={`${W_TIME_TRACKING.duration} text-left`}>{t("timeTracking.duration")}</TableHead>
            <TableHead className={`${W_TIME_TRACKING.status} text-center`}>{t("operation.status")}</TableHead>
            <TableHead className={`${W_TIME_TRACKING.order} text-center`}>{t("order.number")}</TableHead>
            <TableHead className={`${W_TIME_TRACKING.shift} text-center`}>{t("timeTracking.smEpf")}</TableHead>
            <TableHead className={`${W_TIME_TRACKING.employee} text-center`}>{t("timeTracking.deptOpMachine")}</TableHead>
            <TableHead className={`${W_TIME_TRACKING.qty} text-left`}>{t("timeTracking.qtyGood")}</TableHead>
            <TableHead className={`${W_TIME_TRACKING.qty} text-left`}>{t("timeTracking.qtyDefect")}</TableHead>
            <TableHead className={`${W_TIME_TRACKING.actions} text-center`}>{t("common.actions")}</TableHead>
          </TableRow>
        </TableHeader>
      </Table>

      {/* Scrollable body */}
      <div ref={scrollRef} className="flex-1 overflow-auto min-h-0">
        {entries.length === 0 ? (
          <div className="flex items-center justify-center h-[56px] text-muted-foreground">
            {t("common.noResults")}
          </div>
        ) : (
          <Table>
            <TableBody>
              {entries.map((entry) => (
                <TableRow key={entry.TJSEQ} className="h-[56px]">
                  <TableCell className={`${W_TIME_TRACKING.date} text-base text-right pr-4`}>
                    {formatDate(entry.TJDATE, showYear)}
                  </TableCell>
                  <TableCell className={`${W_TIME_TRACKING.dateEnd} text-base text-left`}>
                    {formatEndDate(entry.TJDEBUT, entry.TJFIN, showYear)}
                  </TableCell>
                  <TableCell className={`${W_TIME_TRACKING.duration} text-base`}>
                    {formatDuration(entry.TJDUREE)}
                  </TableCell>
                  <TableCell className={W_TIME_TRACKING.status}>
                    <Select
                      value={String(entry.STATUT_CODE)}
                      onValueChange={(v) => onStatusChange(entry.TJSEQ, Number(v))}
                    >
                      <SelectTrigger className={`h-10 text-base ${W_TIME_TRACKING.statusDropdown}`}>
                        <span className="flex items-center gap-2">
                          <StatusDot mpcode={entry.MODEPROD_MPCODE} />
                          {statusOptions.find((o) => o.code === entry.STATUT_CODE)?.label ?? ""}
                        </span>
                      </SelectTrigger>
                      <SelectContent>
                        {statusOptions.map((opt) => (
                          <SelectItem key={opt.code} value={String(opt.code)} className="text-base">
                            <span className="flex items-center gap-2">
                              <StatusDot mpcode={opt.mpcode} />
                              {opt.label}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className={`${W_TIME_TRACKING.order} text-base text-center font-bold`}>
                    {entry.NO_PROD}
                  </TableCell>
                  <TableCell className={W_TIME_TRACKING.shift}>
                    {entry.SM_EPF}
                    {entry.PROD_NOTE && (
                      <div className="mt-1 bg-gray-100 text-black text-sm rounded-md px-2 py-1">
                        {entry.PROD_NOTE}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className={`${W_TIME_TRACKING.employee} text-base`}>
                    <div>{entry.DECODE} / {lang === "fr" ? entry.OPERATION_P : entry.OPERATION_S} / {entry.MACODE}</div>
                    <div className="text-muted-foreground text-sm">{entry.EMNO} - {entry.EMNOM}</div>
                  </TableCell>
                  <TableCell className={`${W_TIME_TRACKING.qty} text-lg font-bold`}>
                    {entry.QTE_BONNE || "-"}
                  </TableCell>
                  <TableCell className={`${W_TIME_TRACKING.qty} text-lg font-bold text-red-600`}>
                    {entry.QTE_DEFAUT || "-"}
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
              ))}
            </TableBody>
          </Table>
        )}

        {/* Sentinel for infinite scroll */}
        {hasMore && (
          <div ref={sentinelRef} className="flex items-center justify-center py-4">
            {loadingMore && <Loader2 className="size-5 animate-spin text-muted-foreground" />}
          </div>
        )}
      </div>

      {/* Sticky footer with server-side totals */}
      {totals && (
        <Table>
          <tfoot>
            <TableRow className="h-[56px] font-bold border-t">
              <TableCell className={W_TIME_TRACKING.date} />
              <TableCell className={W_TIME_TRACKING.dateEnd} />
              <TableCell className={W_TIME_TRACKING.duration} />
              <TableCell className={W_TIME_TRACKING.status} />
              <TableCell className={W_TIME_TRACKING.order} />
              <TableCell className={W_TIME_TRACKING.shift} />
              <TableCell className={W_TIME_TRACKING.employee}>
                {t("timeTracking.totalHours")} ({totals.totalCount} {t("common.results")}
                {entries.length < totals.totalCount && ` — ${entries.length} ${t("common.loaded")}`})
              </TableCell>
              <TableCell className={`${W_TIME_TRACKING.qty} text-lg`}>{totals.totalQtyGood}</TableCell>
              <TableCell className={`${W_TIME_TRACKING.qty} text-lg text-red-600`}>{totals.totalQtyDefect}</TableCell>
              <TableCell className={W_TIME_TRACKING.actions} />
            </TableRow>
          </tfoot>
        </Table>
      )}
    </div>
  );
}
