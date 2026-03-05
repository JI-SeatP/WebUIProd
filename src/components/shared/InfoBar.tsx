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
  });

  return (
    <div className="flex items-center gap-3 text-[1.05rem] ml-3 text-white">
      <span className="font-semibold">{employee.EMNOM}</span>
      {import.meta.env.VITE_DB_ENV === "test" && (
        <span className="bg-red-600 text-white text-xs font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">
          TEST ENV
        </span>
      )}
      {teamName && (
        <span className="text-gray-400">
          {t("timeTracking.shift")}: {teamName}
        </span>
      )}
      {functionName && (
        <span className="text-gray-400">{functionName}</span>
      )}
      <span className="text-gray-400">{shiftHours}</span>
      <span className="font-mono tabular-nums">{timeStr}</span>
    </div>
  );
}
