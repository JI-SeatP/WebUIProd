import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { W_PQTT_TOOLBAR } from "@/constants/widths";
import { cn } from "@/lib/utils";

interface FinishPieceButtonProps {
  disabled?: boolean;
  onFinish: (kind: "GOOD" | "DEF") => void;
}

/**
 * Orange "FINISH PIECE" button. Clicking it opens a popover with two large
 * touch targets: Good (#C1F6CA) and Defective (#F8CECC), each with black
 * borders and black text per spec.
 */
export function FinishPieceButton({ disabled = false, onFinish }: FinishPieceButtonProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  const handle = (kind: "GOOD" | "DEF") => {
    setOpen(false);
    onFinish(kind);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          disabled={disabled}
          className={cn(
            W_PQTT_TOOLBAR.pieceCounter.finishBtn,
            "h-[71px] border-2 font-bold text-base tracking-wide rounded-md",
          )}
          style={{ backgroundColor: "#FFB60E", color: "#000", borderColor: "#000" }}
        >
          {t("pqtt.finishPiece")}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="center"
        className="p-3 w-[280px] flex flex-col gap-3 backdrop-blur border border-white/20"
        style={{
          backgroundColor: "rgba(64, 75, 79, 0.85)",
          boxShadow: "0 8px 10px rgba(0,0,0,0.5)",
        }}
      >
        <Button
          className="min-h-[64px] text-lg border-2 font-bold"
          style={{ backgroundColor: "#C1F6CA", color: "#000", borderColor: "#000" }}
          onClick={() => handle("GOOD")}
        >
          {t("pqtt.good")}
        </Button>
        <Button
          className="min-h-[64px] text-lg border-2 font-bold"
          style={{ backgroundColor: "#F8CECC", color: "#000", borderColor: "#000" }}
          onClick={() => handle("DEF")}
        >
          {t("pqtt.def")}
        </Button>
      </PopoverContent>
    </Popover>
  );
}
