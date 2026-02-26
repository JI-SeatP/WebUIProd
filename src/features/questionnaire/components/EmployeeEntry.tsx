import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
}

export function EmployeeEntry({
  employeeCode,
  employeeName,
  onCodeChange,
  onEmployeeFound,
  error,
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

  return (
    <Card>
      <CardHeader className="py-3 px-4">
        <CardTitle className="text-base">{t("timeTracking.employee")}</CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-3">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Label className="text-sm text-muted-foreground shrink-0">
              {t("questionnaire.employeeCode")}:
            </Label>
            <Popover open={numpadOpen} onOpenChange={setNumpadOpen}>
              <PopoverTrigger asChild>
                <Input
                  value={employeeCode}
                  readOnly
                  className={`${W_QUESTIONNAIRE.input} touch-target text-lg font-mono cursor-pointer ${
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

          <div className="flex items-center gap-2">
            <Label className="text-sm text-muted-foreground shrink-0">
              {t("questionnaire.employeeName")}:
            </Label>
            <span className="text-lg font-medium">
              {employeeName || "—"}
            </span>
          </div>
        </div>

        {(error || lookupError) && (
          <p className="text-sm text-destructive mt-1">{error || lookupError}</p>
        )}
      </CardContent>
    </Card>
  );
}
