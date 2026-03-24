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
import { cn } from "@/lib/utils";
import type { WorkOrder } from "@/types/workOrder";

interface ActionsDropdownProps {
  order: WorkOrder;
}

/**
 * Determine transfer button color state matching old CF logic
 * (Tableau_principal.cfm lines 19-41):
 *   - null/empty TREPOSTER_TRANSFERT → blue (no transfer pending)
 *   - 0 → red (transfer pending but not posted)
 *   - 1 → gray (transfer already posted)
 *
 * Transfer only shown when:
 *   - Team leader (1031/1032) AND TJFINDATE is empty AND DESEQ != 10
 */
function getTransferColor(trePoster: number | null | undefined): {
  iconClass: string;
  label: string;
} {
  if (trePoster === 0) {
    return { iconClass: "text-red-600", label: "pending" };
  }
  if (trePoster === 1) {
    return { iconClass: "text-gray-400", label: "posted" };
  }
  // null/empty/undefined → blue (no transfer pending)
  return { iconClass: "text-blue-600", label: "none" };
}

export function ActionsDropdown({ order }: ActionsDropdownProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { state } = useSession();

  const isTeamLeader =
    state.employee?.CodeFonction === "1031" ||
    state.employee?.CodeFonction === "1032";

  // Old CF logic: transfer shown only when TJFINDATE is empty and DESEQ != 10
  const showTransfer =
    isTeamLeader &&
    !order.TJFINDATE &&
    order.DESEQ !== 10;

  const transferColor = getTransferColor(order.TREPOSTER_TRANSFERT);

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
        {showTransfer && (
          <DropdownMenuItem className="gap-2 text-base py-2">
            <ArrowLeftRight size={16} className={cn(transferColor.iconClass)} />
            {t("actions.transfer")}
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
