import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { W_LOGIN, W_NUMPAD } from "@/constants/widths";
import { Delete, X, CornerDownLeft } from "lucide-react";

interface NumPadProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: () => void;
  onClose?: () => void;
  allowDecimal?: boolean;
  showDisplay?: boolean;
  showActions?: boolean;
  displayValue?: string;
  className?: string;
  /** Login screen: larger frame (+10%) and digit glyphs (+15% vs default scale) */
  size?: "default" | "large";
}

export function NumPad({
  value,
  onChange,
  onSubmit,
  onClose,
  allowDecimal = false,
  showDisplay = true,
  showActions = true,
  displayValue,
  className,
  size = "default",
}: NumPadProps) {
  const large = size === "large";
  const [flashKey, setFlashKey] = useState<string | null>(null);

  const flash = (id: string) => {
    setFlashKey(id);
    setTimeout(() => setFlashKey(null), 150);
  };

  const handleKey = useCallback(
    (key: string) => {
      flash(key);
      if (key === "backspace") {
        onChange(value.slice(0, -1));
      } else if (key === "clear") {
        onChange("");
      } else if (key === ".") {
        if (allowDecimal && !value.includes(".")) {
          onChange(value + ".");
        }
      } else {
        onChange(value + key);
      }
    },
    [value, onChange, allowDecimal]
  );

  // Listen for physical keyboard input
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key >= "0" && e.key <= "9") {
        e.preventDefault();
        handleKey(e.key);
      } else if (e.key === "Backspace") {
        e.preventDefault();
        handleKey("backspace");
      } else if (e.key === "Delete" || e.key === "Escape") {
        e.preventDefault();
        if (e.key === "Escape" && onClose) onClose();
        else handleKey("clear");
      } else if (e.key === "." && allowDecimal) {
        e.preventDefault();
        handleKey(".");
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (onSubmit) onSubmit();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleKey, onSubmit, onClose, allowDecimal]);

  const numKeys = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];

  const keyClass = (id: string, extra = "") =>
    cn(
      "touch-target !transition-none",
      large ? W_LOGIN.numPadKey : "h-[58px]",
      flashKey === id ? "!bg-[#aeffae] !border-green-400" : "",
      extra
    );

  const digitText = large ? "text-[1.58125rem] font-semibold" : "text-xl font-semibold";
  const iconPx = large ? 24 : 22;

  return (
    <div
      className={cn(
        "bg-popover border rounded-lg shadow-lg no-select",
        large ? "p-[11px]" : "p-3",
        large ? W_NUMPAD.frameLarge : W_NUMPAD.frame,
        className
      )}
    >
      {/* Display */}
      {showDisplay && (
        <div
          className={cn(
            "bg-muted rounded-md font-mono tabular-nums flex items-center",
            large
              ? "px-[18px] py-[13px] mb-[13px] text-[1.89875rem] min-h-[57px]"
              : "px-4 py-3 mb-3 text-2xl min-h-[52px]"
          )}
          style={{ justifyContent: displayValue ? "center" : "flex-end" }}
        >
          {displayValue ?? (value || "0")}
        </div>
      )}

      {/* Key grid — 3 columns, standard phone layout */}
      <div className={cn("grid grid-cols-3", W_NUMPAD.keyGap)}>
        {numKeys.map((key) => (
          <Button
            key={key}
            variant="outline"
            className={keyClass(key, digitText)}
            onClick={() => handleKey(key)}
          >
            {key}
          </Button>
        ))}

        {/* Bottom row: backspace, 0, clear */}
        <Button
          variant="outline"
          className={keyClass("backspace")}
          onClick={() => handleKey("backspace")}
        >
          <Delete size={iconPx} />
        </Button>
        <Button
          variant="outline"
          className={keyClass("0", digitText)}
          onClick={() => handleKey("0")}
        >
          0
        </Button>
        <Button
          variant="outline"
          className={keyClass("clear")}
          onClick={() => handleKey("clear")}
        >
          <X size={iconPx} />
        </Button>
      </div>

      {/* Action row (optional — used in popover mode) */}
      {showActions && onClose && (
        <div className={cn("flex mt-2", W_NUMPAD.keyGap)}>
          <Button
            variant="outline"
            className="flex-1 touch-target text-lg"
            onClick={onClose}
          >
            <X size={18} className="mr-1" />
            Close
          </Button>
          {onSubmit && (
            <Button
              className="flex-1 touch-target text-lg"
              onClick={onSubmit}
            >
              <CornerDownLeft size={18} className="mr-1" />
              OK
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
