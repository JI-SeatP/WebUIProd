import { useEffect, useState } from "react";
import { useSession } from "@/context/SessionContext";
import { useTranslation } from "react-i18next";

export function InfoBar() {
  const { state } = useSession();
  const { t } = useTranslation();
  const [clock, setClock] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const employee = state.employee;
  if (!employee) return null;

  const teamName = state.language === "fr" ? employee.NOMEQUIPE_P : employee.NOMEQUIPE_S;
  const functionName = state.language === "fr" ? employee.Fonction_P : employee.Fonction_S;
  const shiftHours = `${employee.EQDEBUTQUART} - ${employee.EQFINQUART}`;

  const timeStr = clock.toLocaleTimeString(state.language === "fr" ? "fr-CA" : "en-CA", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  return (
    <div className="flex items-center gap-3 text-sm ml-3">
      <span className="font-semibold">{employee.EMNOM}</span>
      {teamName && (
        <span className="text-muted-foreground">
          {t("timeTracking.shift")}: {teamName}
        </span>
      )}
      {functionName && (
        <span className="text-muted-foreground">{functionName}</span>
      )}
      <span className="text-muted-foreground">{shiftHours}</span>
      <span className="font-mono tabular-nums">{timeStr}</span>
    </div>
  );
}
