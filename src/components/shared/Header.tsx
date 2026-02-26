import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useSession } from "@/context/SessionContext";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Clock,
  List,
  Maximize,
  RefreshCw,
  ScanBarcode,
  Tag,
  Send,
  ArrowLeftRight,
  ClipboardList,
  LogOut,
  ChevronLeft,
  LayoutGrid,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Department } from "@/types/department";
import { apiGet } from "@/api/client";
import { useEffect, useState } from "react";
import { InfoBar } from "./InfoBar";

interface HeaderAction {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  visible?: boolean;
}

export function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t, i18n } = useTranslation();
  const { state, dispatch } = useSession();
  const [departments, setDepartments] = useState<Department[]>([]);

  useEffect(() => {
    apiGet<Department[]>("getDepartments.cfm").then((res) => {
      if (res.success) setDepartments(res.data);
    });
  }, []);

  const isOnOrders = location.pathname === "/orders";
  const isOnOperation = location.pathname.includes("/operation/");

  const handleLogout = () => {
    dispatch({ type: "LOGOUT" });
    navigate("/login");
  };

  const handleDepartmentChange = (value: string) => {
    const dept = departments.find((d) => d.DESEQ === Number(value));
    if (dept) {
      dispatch({ type: "SET_DEPARTMENT", payload: { department: dept } });
    }
  };

  const handleLanguageToggle = (lang: "fr" | "en") => {
    i18n.changeLanguage(lang);
    dispatch({ type: "SET_LANGUAGE", payload: { language: lang } });
  };

  const handleFullscreen = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      document.documentElement.requestFullscreen();
    }
  };

  const actions: HeaderAction[] = [
    { icon: <Clock size={25} />, label: t("timeTracking.title"), onClick: () => navigate("/time-tracking") },
    { icon: <List size={25} />, label: t("header.machineSelection"), onClick: () => {} },
    { icon: <Maximize size={25} />, label: t("header.fullscreen"), onClick: handleFullscreen },
    { icon: <RefreshCw size={25} />, label: t("actions.refresh"), onClick: () => window.location.reload() },
    { icon: <ScanBarcode size={25} />, label: t("header.skidScan"), onClick: () => {} },
    { icon: <Tag size={25} />, label: t("header.labelPrint"), onClick: () => {} },
    { icon: <Send size={25} />, label: t("header.sendMessage"), onClick: () => {} },
    { icon: <ArrowLeftRight size={25} />, label: t("actions.transfer"), onClick: () => {}, visible: isOnOperation },
    { icon: <ClipboardList size={25} />, label: t("inventory.title"), onClick: () => navigate("/inventory") },
    { icon: <LogOut size={25} />, label: t("actions.logout"), onClick: handleLogout },
  ];

  return (
    <header className="flex items-center gap-2 px-3 py-[3px] border-b bg-background shrink-0">
      {/* Logo */}
      <img src="/logo-seatply.png" alt="SeatPly" className="h-12 shrink-0" />

      {/* Nav buttons */}
      <div className="flex items-center gap-1 ml-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="touch-target"
              onClick={() => navigate(-1)}
            >
              <ChevronLeft size={25} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t("actions.back")}</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="touch-target"
              onClick={() => navigate("/orders")}
            >
              <LayoutGrid size={25} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Orders</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="touch-target"
              onClick={() => navigate(1)}
            >
              <ChevronRight size={25} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Forward</TooltipContent>
        </Tooltip>
      </div>

      {/* Department dropdown */}
      <Select
        value={state.department ? String(state.department.DESEQ) : ""}
        onValueChange={handleDepartmentChange}
      >
        <SelectTrigger className="h-10 w-[200px] ml-2">
          <SelectValue placeholder={t("operation.department")} />
        </SelectTrigger>
        <SelectContent>
          {departments.map((dept) => (
            <SelectItem key={dept.DESEQ} value={String(dept.DESEQ)}>
              {state.language === "fr" ? dept.DEDESCRIPTION_P : dept.DEDESCRIPTION_S}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Spacer */}
      <div className="flex-1" />

      {/* User / Plant / Time info */}
      <InfoBar />

      {/* Spacer */}
      <div className="flex-1" />

      {/* Action toolbar */}
      <div className="flex items-center gap-1">
        {actions
          .filter((a) => a.visible !== false)
          .map((action) => (
            <Tooltip key={action.label}>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="touch-target"
                  onClick={action.onClick}
                >
                  {action.icon}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{action.label}</TooltipContent>
            </Tooltip>
          ))}
      </div>

      {/* Language toggle */}
      <div className="flex items-center gap-0.5 ml-1">
        <Button
          variant={state.language === "fr" ? "default" : "ghost"}
          size="sm"
          className={cn("h-8 px-2 text-xs font-semibold")}
          onClick={() => handleLanguageToggle("fr")}
        >
          FR
        </Button>
        <Button
          variant={state.language === "en" ? "default" : "ghost"}
          size="sm"
          className={cn("h-8 px-2 text-xs font-semibold")}
          onClick={() => handleLanguageToggle("en")}
        >
          EN
        </Button>
      </div>
    </header>
  );
}
