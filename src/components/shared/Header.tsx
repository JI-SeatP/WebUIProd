import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useSession } from "@/context/SessionContext";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
import { useRefresh } from "@/context/RefreshContext";
import type { Department } from "@/types/department";
import { apiGet } from "@/api/client";
import { useEffect, useState } from "react";
import { InfoBar } from "./InfoBar";
import { SkidScannerModal } from "@/components/modals/SkidScannerModal";
import { LabelPrintingModal } from "@/components/modals/LabelPrintingModal";
import { MessageModal } from "@/components/modals/MessageModal";
import { WarehouseTransferModal } from "@/components/modals/WarehouseTransferModal";
import { MachineSelectionModal } from "@/components/modals/MachineSelectionModal";

type ModalType = "skid" | "label" | "message" | "transfer" | "machine" | null;

interface HeaderAction {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  visible?: boolean;
  route?: string;
}

export function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t, i18n } = useTranslation();
  const { state, dispatch } = useSession();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [deptOpen, setDeptOpen] = useState(false);
  const refresh = useRefresh();

  useEffect(() => {
    apiGet<Department[]>("getDepartments.cfm").then((res) => {
      if (res.success) {
        setDepartments(res.data);
        // Auto-select Cell 1 on first load if no department is already selected
        if (!state.department) {
          const cell1 = res.data.find(
            (d) =>
              d.DEDESCRIPTION_S?.toLowerCase() === "cell 1" ||
              d.DEDESCRIPTION_P?.toLowerCase() === "cellule 1" ||
              d.DECODE?.toLowerCase() === "c1"
          );
          if (cell1) {
            dispatch({ type: "SET_DEPARTMENT", payload: { department: cell1 } });
          }
        }
      }
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const isOnOrders = location.pathname === "/orders";
  const isOnOperation = location.pathname.includes("/operation/");

  // Extract transac and copmachine from URL when on operation details page
  const operationTransac = isOnOperation
    ? Number(location.pathname.match(/\/orders\/(\d+)\//)?.[1]) || undefined
    : undefined;
  const operationCopmachine = isOnOperation
    ? Number(location.pathname.match(/\/operation\/(\d+)/)?.[1]) || undefined
    : undefined;

  const handleLogout = () => {
    dispatch({ type: "LOGOUT" });
    navigate("/login");
  };

  const handleDepartmentChange = (value: string) => {
    if (value === "ALL") {
      dispatch({ type: "SET_DEPARTMENT", payload: { department: undefined } });
      return;
    }
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
    { icon: <Clock className="size-5" />, label: t("timeTracking.title"), onClick: () => navigate("/time-tracking"), route: "/time-tracking" },
    { icon: <List className="size-5" />, label: t("header.machineSelection"), onClick: () => setActiveModal("machine") },
    { icon: <Maximize className="size-5" />, label: t("header.fullscreen"), onClick: handleFullscreen },
    { icon: <RefreshCw className="size-5" />, label: t("actions.refresh"), onClick: refresh },
    { icon: <ScanBarcode className="size-5" />, label: t("header.skidScan"), onClick: () => setActiveModal("skid") },
    { icon: <Tag className="size-5" />, label: t("header.labelPrint"), onClick: () => setActiveModal("label") },
    { icon: <Send className="size-5" />, label: t("header.sendMessage"), onClick: () => setActiveModal("message") },
    { icon: <ArrowLeftRight className="size-5" />, label: t("actions.transfer"), onClick: () => setActiveModal("transfer"), visible: isOnOperation },
    { icon: <ClipboardList className="size-5" />, label: t("inventory.title"), onClick: () => navigate("/inventory"), route: "/inventory" },
    { icon: <LogOut className="size-5" />, label: t("actions.logout"), onClick: handleLogout },
  ];

  return (
    <>
      <header className="flex items-center gap-2 px-3 py-[3px] border-b bg-black shrink-0">
        {/* Logo */}
        <img src="/logo-seatply.png" alt="SeatPly" className="h-12 shrink-0" />

        {/* Nav buttons */}
        <div className="flex items-center gap-1 ml-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="touch-target bg-white hover:bg-gray-100"
                onClick={() => navigate(-1)}
              >
                <ChevronLeft className="size-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t("actions.back")}</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "touch-target",
                  isOnOrders ? "bg-[#aeffae] hover:bg-[#aeffae]" : "bg-white hover:bg-gray-100"
                )}
                onClick={() => navigate("/orders")}
              >
                <LayoutGrid className="size-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Orders</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="touch-target bg-white hover:bg-gray-100"
                onClick={() => navigate(1)}
              >
                <ChevronRight className="size-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Forward</TooltipContent>
          </Tooltip>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* User / Plant / Time info */}
        <InfoBar />

        {/* Department dropdown */}
        {(() => {
          const deptBySeq = Object.fromEntries(departments.map((d) => [d.DESEQ, d]));
          const deptLabel = (deseq: number) => {
            const d = deptBySeq[deseq];
            return d ? (state.language === "fr" ? d.DEDESCRIPTION_P : d.DEDESCRIPTION_S) : "";
          };
          const col1: (number | "divider")[] = [5, 4, 2, 3];
          const col2: (number | "divider")[] = [7, "divider", 12, 18, 23];
          const col3: (number | "divider")[] = [11, 9, 10, "divider", 20];
          const selectedLabel = state.department
            ? (state.language === "fr" ? state.department.DEDESCRIPTION_P : state.department.DEDESCRIPTION_S)
            : (state.language === "fr" ? "Toutes les cellules" : "All cells");

          const renderItem = (deseq: number) => {
            const isActive = state.department?.DESEQ === deseq;
            return (
              <button
                key={deseq}
                type="button"
                className={cn(
                  "w-full text-left px-3 py-2.5 rounded-md text-xl hover:bg-muted cursor-pointer transition-colors",
                  isActive && "font-semibold"
                )}
                style={isActive ? { backgroundColor: "#aeffae" } : undefined}
                onClick={() => { handleDepartmentChange(String(deseq)); setDeptOpen(false); }}
              >
                {deptLabel(deseq)}
              </button>
            );
          };

          const renderCol = (items: (number | "divider")[]) =>
            items.map((item, i) =>
              item === "divider"
                ? <div key={`div-${i}`} className="border-t my-1" />
                : deptBySeq[item] ? renderItem(item) : null
            );

          return (
            <Popover open={deptOpen} onOpenChange={setDeptOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="!h-[48px] w-[200px] ml-2 bg-white !text-lg justify-center font-normal">
                  <span className="truncate">{selectedLabel}</span>
                  <ChevronRight className="size-4 opacity-50 shrink-0 rotate-90" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-2" align="start">
                <button
                  type="button"
                  className={cn(
                    "w-full text-left px-3 py-2.5 rounded-md text-xl font-medium hover:bg-muted cursor-pointer transition-colors mb-1 border-b pb-2.5",
                    !state.department && "font-semibold"
                  )}
                  style={!state.department ? { backgroundColor: "#aeffae" } : undefined}
                  onClick={() => { handleDepartmentChange("ALL"); setDeptOpen(false); }}
                >
                  {state.language === "fr" ? "Toutes les cellules" : "All cells"}
                </button>
                <div className="flex gap-4">
                  <div className="flex flex-col min-w-[180px]">{renderCol(col1)}</div>
                  <div className="flex flex-col min-w-[140px]">{renderCol(col2)}</div>
                  <div className="flex flex-col min-w-[120px]">{renderCol(col3)}</div>
                </div>
              </PopoverContent>
            </Popover>
          );
        })()}

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
                    className={cn(
                      "touch-target",
                      action.route && location.pathname.startsWith(action.route) ? "bg-[#aeffae] hover:bg-[#aeffae]" : "bg-white hover:bg-gray-100"
                    )}
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
            variant="ghost"
            size="sm"
            className={cn(
              "h-8 px-2 text-xs font-semibold text-black",
              state.language === "fr" ? "bg-[#aeffae] hover:bg-[#aeffae]" : "bg-white hover:bg-gray-100"
            )}
            onClick={() => handleLanguageToggle("fr")}
          >
            FR
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "h-8 px-2 text-xs font-semibold text-black",
              state.language === "en" ? "bg-[#aeffae] hover:bg-[#aeffae]" : "bg-white hover:bg-gray-100"
            )}
            onClick={() => handleLanguageToggle("en")}
          >
            EN
          </Button>
        </div>
      </header>

      {/* Modals */}
      <SkidScannerModal
        open={activeModal === "skid"}
        onOpenChange={(open) => !open && setActiveModal(null)}
      />
      <LabelPrintingModal
        open={activeModal === "label"}
        onOpenChange={(open) => !open && setActiveModal(null)}
        transac={operationTransac}
        copmachine={operationCopmachine}
      />
      <MessageModal
        open={activeModal === "message"}
        onOpenChange={(open) => !open && setActiveModal(null)}
      />
      <WarehouseTransferModal
        open={activeModal === "transfer"}
        onOpenChange={(open) => !open && setActiveModal(null)}
      />
      <MachineSelectionModal
        open={activeModal === "machine"}
        onOpenChange={(open) => !open && setActiveModal(null)}
      />
    </>
  );
}
