import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { useSession } from "@/context/SessionContext";
import { getEmployees, type PqttEmployee } from "@/api/pqtt";
import { cn } from "@/lib/utils";

interface OPConfirmModalProps {
  open: boolean;
  onCancel: () => void;
  /** Fires when an employee is picked. Receives the EMP_NUM string. */
  onConfirm: (empNum: string, empNom: string) => void;
}

/**
 * Touch-friendly operator picker shown when the operator switches to PROD.
 *
 * Layout (top to bottom):
 *   1. Header
 *   2. "Currently logged operator" row with [EMP_NUM] [EMP_NOM] [OK button]
 *      — single-tap confirmation for the common case (the logged-in user IS
 *      the operator).
 *   3. Search box for picking a different operator.
 *   4. Filtered list (scrollable).
 *   5. Cancel button (footer).
 *
 * Search filters by EMP_NUM prefix or EMP_NOM substring (case-insensitive).
 * Auto-confirms when typed text exactly equals an EMP_NUM.
 *
 * The full employee list is cached in module-level state so we only fetch
 * once per app load (per the design — re-fetched if shift/day/session changes,
 * which is enforced by the caller resetting the cache).
 */

let employeeCache: PqttEmployee[] | null = null;
export function resetEmployeeCache() {
  employeeCache = null;
}

export function OPConfirmModal({
  open,
  onCancel,
  onConfirm,
}: OPConfirmModalProps) {
  const { t } = useTranslation();
  const { state } = useSession();
  const [list, setList] = useState<PqttEmployee[]>(employeeCache ?? []);
  const [loading, setLoading] = useState<boolean>(employeeCache === null);
  const [query, setQuery] = useState<string>("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Logged-in operator (from session) — shown above the search box.
  const sessionEmpNum = state.employee?.EMNOIDENT != null
    ? String(state.employee.EMNOIDENT)
    : "";
  const sessionEmpNom = state.employee?.EMNOM ?? "";

  // Fetch employees (once per app load, cached).
  useEffect(() => {
    if (!open) return;
    if (employeeCache) {
      console.log("[PQTT] OPConfirmModal: using cached employee list, count=", employeeCache.length);
      setList(employeeCache);
      setLoading(false);
      return;
    }
    setLoading(true);
    console.log("[PQTT] OPConfirmModal: fetching employees from /GetEmpList.cfm");
    getEmployees()
      .then((res) => {
        console.log("[PQTT] OPConfirmModal: getEmployees response:", res);
        if (res.success && Array.isArray(res.data)) {
          employeeCache = res.data;
          setList(res.data);
        } else {
          console.warn("[PQTT] OPConfirmModal: getEmployees failed or returned non-array — error:", res.error);
        }
      })
      .catch((e) => {
        console.error("[PQTT] OPConfirmModal: getEmployees threw:", e);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [open]);

  // Reset the search box on open. We intentionally do NOT auto-focus the
  // input — auto-focusing would pop the on-screen keyboard before the user
  // has a chance to tap the OK button on the default-operator row.
  useEffect(() => {
    if (!open) return;
    setQuery("");
  }, [open]);

  // Auto-confirm if typed text is an exact match on EMP_NUM.
  useEffect(() => {
    if (!open) return;
    const trimmed = query.trim();
    if (!trimmed) return;
    const exact = list.find((e) => e.EMP_NUM === trimmed);
    if (exact) {
      // Dismiss the on-screen keyboard before closing the modal.
      inputRef.current?.blur();
      onConfirm(exact.EMP_NUM, exact.EMP_NOM);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, list, open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return list.slice(0, 200);
    return list
      .filter(
        (e) =>
          e.EMP_NUM.toLowerCase().startsWith(q) ||
          e.EMP_NOM.toLowerCase().includes(q),
      )
      .slice(0, 200);
  }, [list, query]);

  const confirmSessionUser = () => {
    if (!sessionEmpNum) return;
    // Dismiss the on-screen keyboard before closing the modal.
    inputRef.current?.blur();
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    onConfirm(sessionEmpNum, sessionEmpNom);
  };

  return (
    <AlertDialog
      open={open}
      onOpenChange={(o) => {
        if (!o) onCancel();
      }}
    >
      <AlertDialogContent className="max-w-[520px] !top-8 !translate-y-0">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-xl">
            {t("pqtt.empModal.title")}
          </AlertDialogTitle>
          <AlertDialogDescription className="sr-only">
            {t("pqtt.empModal.searchPlaceholder")}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="flex flex-col gap-3">
          {/* Default operator: currently logged-in user, single-tap confirm. */}
          {sessionEmpNum && (
            <div
              className="flex items-stretch gap-2 rounded-md border-2 border-blue-300 bg-blue-50 px-3 py-2"
              data-testid="pqtt-default-operator-row"
            >
              <div className="flex flex-1 items-center gap-3 min-w-0">
                <span className="text-lg font-bold text-blue-800 shrink-0">
                  {sessionEmpNum}
                </span>
                <span className="text-base truncate text-blue-900">
                  {sessionEmpNom}
                </span>
              </div>
              <Button
                className="min-h-[48px] px-6 text-base font-bold"
                style={{ backgroundColor: "#16a34a", color: "#ffffff" }}
                onClick={confirmSessionUser}
              >
                {t("actions.confirm")}
              </Button>
            </div>
          )}

          {/* Search to pick a different operator. */}
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("pqtt.empModal.searchPlaceholder")}
            className="!h-12 !text-lg"
            autoComplete="off"
          />

          <div className="max-h-[280px] overflow-y-auto rounded-md border">
            {loading && (
              <div className="py-8">
                <LoadingSpinner />
              </div>
            )}
            {!loading && filtered.length === 0 && (
              <div className="py-6 text-center text-muted-foreground">
                {t("pqtt.empModal.noResults")}
              </div>
            )}
            {!loading && filtered.length > 0 && (
              <ul className="divide-y">
                {filtered.map((e) => (
                  <li key={e.EMP_NUM}>
                    <Button
                      variant="ghost"
                      className={cn(
                        "w-full justify-start px-4 py-3 h-auto min-h-[56px] rounded-none text-base",
                      )}
                      onClick={() => {
                        // Dismiss the on-screen keyboard before closing.
                        inputRef.current?.blur();
                        onConfirm(e.EMP_NUM, e.EMP_NOM);
                      }}
                    >
                      <span className="text-blue-700 mr-3 font-semibold">
                        {e.EMP_NUM}
                      </span>
                      <span>{e.EMP_NOM}</span>
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel
            className="min-h-[48px] text-base flex-1"
            onClick={onCancel}
          >
            {t("actions.cancel")}
          </AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
