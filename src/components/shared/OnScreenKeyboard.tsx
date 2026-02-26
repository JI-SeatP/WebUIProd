import { useState, useCallback, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Delete, ArrowBigUp, X, CornerDownLeft, GripHorizontal } from "lucide-react";

interface OnScreenKeyboardProps {
  onKeyPress: (key: string) => void;
  onBackspace: () => void;
  onEnter?: () => void;
  onClose: () => void;
  className?: string;
}

const ROWS_LOWER = [
  ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-"],
  ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"],
  ["a", "s", "d", "f", "g", "h", "j", "k", "l", ";"],
  ["z", "x", "c", "v", "b", "n", "m", ",", ".", "/"],
];

const ROWS_UPPER = [
  ["!", "@", "#", "$", "%", "^", "&", "*", "(", ")", "_"],
  ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
  ["A", "S", "D", "F", "G", "H", "J", "K", "L", ":"],
  ["Z", "X", "C", "V", "B", "N", "M", "<", ">", "?"],
];

const ACCENTS = ["é", "è", "ê", "ë", "à", "â", "ù", "û", "ç", "ô", "î", "ï"];

export function OnScreenKeyboard({
  onKeyPress,
  onBackspace,
  onEnter,
  onClose,
  className,
}: OnScreenKeyboardProps) {
  const [shifted, setShifted] = useState(false);
  const [showAccents, setShowAccents] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);
  const keyboardRef = useRef<HTMLDivElement>(null);

  const rows = shifted ? ROWS_UPPER : ROWS_LOWER;

  const handleKey = useCallback(
    (key: string) => {
      onKeyPress(shifted ? key : key);
      if (shifted) setShifted(false);
    },
    [onKeyPress, shifted]
  );

  // Drag handling
  const handleDragStart = (e: React.PointerEvent) => {
    setIsDragging(true);
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      origX: position.x,
      origY: position.y,
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handleDragMove = (e: React.PointerEvent) => {
    if (!isDragging || !dragRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    setPosition({
      x: dragRef.current.origX + dx,
      y: dragRef.current.origY + dy,
    });
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    dragRef.current = null;
  };

  return (
    <div
      ref={keyboardRef}
      className={cn(
        "fixed bottom-4 left-1/2 -translate-x-1/2 bg-popover border rounded-xl shadow-2xl p-2 no-select z-50",
        className
      )}
      style={{
        transform: `translate(calc(-50% + ${position.x}px), ${position.y}px)`,
      }}
    >
      {/* Drag handle */}
      <div
        className="flex items-center justify-center py-1 cursor-grab active:cursor-grabbing"
        onPointerDown={handleDragStart}
        onPointerMove={handleDragMove}
        onPointerUp={handleDragEnd}
      >
        <GripHorizontal size={20} className="text-muted-foreground" />
      </div>

      {/* Accent row (toggleable) */}
      {showAccents && (
        <div className="flex gap-1 mb-1 justify-center">
          {ACCENTS.map((accent) => (
            <Button
              key={accent}
              variant="outline"
              size="sm"
              className="h-10 w-10 text-base font-semibold"
              onClick={() => handleKey(shifted ? accent.toUpperCase() : accent)}
            >
              {shifted ? accent.toUpperCase() : accent}
            </Button>
          ))}
        </div>
      )}

      {/* Main rows */}
      {rows.map((row, rowIdx) => (
        <div key={rowIdx} className="flex gap-1 mb-1 justify-center">
          {rowIdx === 3 && (
            <Button
              variant={shifted ? "default" : "outline"}
              className="h-10 w-14 text-sm"
              onClick={() => setShifted(!shifted)}
            >
              <ArrowBigUp size={18} />
            </Button>
          )}
          {row.map((key) => (
            <Button
              key={key}
              variant="outline"
              className="h-10 w-10 text-base font-semibold"
              onClick={() => handleKey(key)}
            >
              {key}
            </Button>
          ))}
          {rowIdx === 3 && (
            <Button
              variant="outline"
              className="h-10 w-14"
              onClick={onBackspace}
            >
              <Delete size={18} />
            </Button>
          )}
        </div>
      ))}

      {/* Bottom row */}
      <div className="flex gap-1 justify-center">
        <Button
          variant={showAccents ? "default" : "outline"}
          className="h-10 px-3 text-sm"
          onClick={() => setShowAccents(!showAccents)}
        >
          àé
        </Button>
        <Button
          variant="outline"
          className="h-10 flex-1 max-w-[280px] text-sm"
          onClick={() => handleKey(" ")}
        >
          Space
        </Button>
        <Button
          variant="outline"
          className="h-10 px-4"
          onClick={onClose}
        >
          <X size={18} />
        </Button>
        {onEnter && (
          <Button
            className="h-10 px-4"
            onClick={onEnter}
          >
            <CornerDownLeft size={18} />
          </Button>
        )}
      </div>
    </div>
  );
}
