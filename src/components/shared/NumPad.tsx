import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Delete, X, CornerDownLeft } from "lucide-react";

interface NumPadProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: () => void;
  onClose: () => void;
  allowDecimal?: boolean;
  className?: string;
}

export function NumPad({
  value,
  onChange,
  onSubmit,
  onClose,
  allowDecimal = false,
  className,
}: NumPadProps) {
  const handleKey = useCallback(
    (key: string) => {
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

  const numKeys = ["7", "8", "9", "4", "5", "6", "1", "2", "3"];

  return (
    <div
      className={cn(
        "bg-popover border rounded-lg shadow-lg p-3 w-[280px] no-select",
        className
      )}
    >
      {/* Display */}
      <div className="bg-muted rounded-md px-4 py-3 mb-3 text-right text-2xl font-mono tabular-nums min-h-[52px] flex items-center justify-end">
        {value || "0"}
      </div>

      {/* Key grid */}
      <div className="grid grid-cols-4 gap-2">
        {numKeys.map((key) => (
          <Button
            key={key}
            variant="outline"
            className="touch-target text-xl font-semibold"
            onClick={() => handleKey(key)}
          >
            {key}
          </Button>
        ))}

        {/* Bottom row */}
        <Button
          variant="outline"
          className="touch-target text-xl font-semibold"
          onClick={() => handleKey(allowDecimal ? "." : "0")}
        >
          {allowDecimal ? "." : ""}
        </Button>
        <Button
          variant="outline"
          className="touch-target text-xl font-semibold"
          onClick={() => handleKey("0")}
        >
          0
        </Button>
        <Button
          variant="ghost"
          className="touch-target"
          onClick={() => handleKey("backspace")}
        >
          <Delete size={22} />
        </Button>
        <Button
          variant="ghost"
          className="touch-target text-destructive"
          onClick={() => handleKey("clear")}
        >
          <X size={22} />
        </Button>
      </div>

      {/* Action row */}
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
    </div>
  );
}
