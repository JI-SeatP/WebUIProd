import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NumPad } from "@/components/shared/NumPad";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { apiPost } from "@/api/client";
import { W_QUESTIONNAIRE } from "@/constants/widths";
import type { Employee } from "@/types/employee";

interface EmployeeEntryProps {
  employeeCode: string;
  employeeName: string;
  onCodeChange: (code: string) => void;
  onEmployeeFound: (employee: Employee) => void;
  error?: string;
  theme?: "modern" | "minimal" | "dense";
}

export function EmployeeEntry({
  employeeCode,
  employeeName,
  onCodeChange,
  onEmployeeFound,
  error,
  theme = "modern",
}: EmployeeEntryProps) {
  const { t } = useTranslation();
  const [numpadOpen, setNumpadOpen] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);

  const lookupEmployee = useCallback(async (code: string) => {
    if (!code) return;
    setLookupError(null);
    try {
      const res = await apiPost<Employee>("validateEmployee.cfm", {
        employeeCode: Number(code),
      });
      if (res.success && res.data) {
        onEmployeeFound(res.data);
      } else {
        setLookupError(res.error ?? "Employee not found");
      }
    } catch {
      setLookupError("Lookup failed");
    }
  }, [onEmployeeFound]);

  const handleNumpadSubmit = useCallback(() => {
    setNumpadOpen(false);
    lookupEmployee(employeeCode);
  }, [employeeCode, lookupEmployee]);

  const headerClasses = {
    modern: "py-1.5 px-3",
    minimal: "bg-blue-100 py-2.5 px-4",
    dense: "bg-blue-50 py-1 px-3 border-b border-blue-200",
  }[theme];

  const headerTextClasses = {
    modern: "border border-gray-300 bg-gray-100 rounded-lg px-3 py-1 text-2xl font-bold text-gray-600 uppercase tracking-wider w-fit",
    minimal: "text-sm font-semibold text-blue-900",
    dense: "text-xs font-bold text-blue-900 uppercase",
  }[theme];

  const contentClasses = {
    modern: "pt-0.5 pb-2 pl-4 pr-3",
    minimal: "pt-0.5 pb-3 px-4",
    dense: "pt-px pb-1.5 px-3",
  }[theme];

  return (
    <Card className={`min-h-[250px] ${theme === "dense" ? "border border-gray-200" : ""}`}>
      <div className={headerClasses}>
        <div className={headerTextClasses}>{t("timeTracking.employee")}</div>
      </div>
      <CardContent className={`${contentClasses} flex flex-wrap items-start gap-6`}>
        <div className="flex flex-col gap-0.5">
          <Label className={`${theme === "dense" ? "text-xs" : "text-sm"} text-muted-foreground`}>
            {t("questionnaire.employeeCode")}:
          </Label>
          <Popover open={numpadOpen} onOpenChange={setNumpadOpen}>
            <PopoverTrigger asChild>
              <Input
                value={employeeCode}
                readOnly
                className={`${W_QUESTIONNAIRE.input} touch-target !text-3xl font-mono cursor-pointer ${
                  error || lookupError ? "border-destructive" : ""
                }`}
                placeholder="0"
                onClick={() => setNumpadOpen(true)}
              />
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <NumPad
                value={employeeCode}
                onChange={onCodeChange}
                onSubmit={handleNumpadSubmit}
                onClose={() => setNumpadOpen(false)}
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="flex flex-col gap-0.5 flex-1 min-w-0">
          <Label className={`${theme === "dense" ? "text-xs" : "text-sm"} text-muted-foreground`}>
            {t("questionnaire.employeeName")}:
          </Label>
          <div className="touch-target flex items-center text-xl font-medium px-3 rounded-md bg-gray-100 border border-gray-200 w-full">
            {employeeName || "—"}
          </div>
        </div>

        {(error || lookupError) && (
          <p className="w-full text-sm text-destructive">{error || lookupError}</p>
        )}
      </CardContent>
    </Card>
  );
}
