import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useSession } from "@/context/SessionContext";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Eye, Play, ArrowLeftRight } from "lucide-react";
import type { WorkOrder } from "@/types/workOrder";

interface ActionsDropdownProps {
  order: WorkOrder;
}

export function ActionsDropdown({ order }: ActionsDropdownProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { state } = useSession();

  const isTeamLeader =
    state.employee?.CodeFonction === "1031" ||
    state.employee?.CodeFonction === "1032";

  const handleView = () => {
    navigate(
      `/orders/${order.TRANSAC}/operation/${order.COPMACHINE ?? 0}`
    );
  };

  const handleGo = () => {
    navigate(
      `/orders/${order.TRANSAC}/operation/${order.COPMACHINE ?? 0}`
    );
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-10 w-10">
          <MoreHorizontal size={18} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuItem
          className="gap-2 text-base py-2"
          onClick={handleView}
        >
          <Eye size={16} />
          {t("actions.view")}
        </DropdownMenuItem>
        <DropdownMenuItem
          className="gap-2 text-base py-2"
          onClick={handleGo}
        >
          <Play size={16} />
          Go
        </DropdownMenuItem>
        {isTeamLeader && (
          <DropdownMenuItem className="gap-2 text-base py-2">
            <ArrowLeftRight size={16} />
            {t("actions.transfer")}
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
