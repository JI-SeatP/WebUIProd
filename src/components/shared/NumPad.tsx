import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
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
}: NumPadProps) {
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
      "touch-target h-[58px] !transition-none",
      flashKey === id ? "!bg-[#aeffae] !border-green-400" : "",
      extra
    );

  return (
    <div
      className={cn(
        "bg-popover border rounded-lg shadow-lg p-3 w-[280px] no-select",
        className
      )}
    >
      {/* Display */}
      {showDisplay && (
        <div className="bg-muted rounded-md px-4 py-3 mb-3 text-2xl font-mono tabular-nums min-h-[52px] flex items-center" style={{ justifyContent: displayValue ? "center" : "flex-end" }}>
          {displayValue ?? (value || "0")}
        </div>
      )}

      {/* Key grid — 3 columns, standard phone layout */}
      <div className="grid grid-cols-3 gap-2">
        {numKeys.map((key) => (
          <Button
            key={key}
            variant="outline"
            className={keyClass(key, "text-xl font-semibold")}
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
          <Delete size={22} />
        </Button>
        <Button
          variant="outline"
          className={keyClass("0", "text-xl font-semibold")}
          onClick={() => handleKey("0")}
        >
          0
        </Button>
        <Button
          variant="outline"
          className={keyClass("clear")}
          onClick={() => handleKey("clear")}
        >
          <X size={22} />
        </Button>
      </div>

      {/* Action row (optional — used in popover mode) */}
      {showActions && onClose && (
        <div className="flex gap-2 mt-2">
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
