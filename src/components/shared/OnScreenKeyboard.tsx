import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Delete, ArrowBigUp, CornerDownLeft } from "lucide-react";

interface OnScreenKeyboardProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: () => void;
  onClose: () => void;
  locale?: "en" | "fr";
  className?: string;
  /** When false, physical keyboard events are not captured (use in global mode so the focused input handles them natively). Default: true */
  capturePhysicalKeys?: boolean;
}

// ── EN-CA layout ────────────────────────────────────────────────────────────
const EN_LOWER = [
  ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-", "="],
  ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"],
  ["a", "s", "d", "f", "g", "h", "j", "k", "l", ";", "'"],
  ["z", "x", "c", "v", "b", "n", "m", ",", ".", "/"],
];
const EN_UPPER = [
  ["!", "@", "#", "$", "%", "^", "&", "*", "(", ")", "_", "+"],
  ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
  ["A", "S", "D", "F", "G", "H", "J", "K", "L", ":", "\""],
  ["Z", "X", "C", "V", "B", "N", "M", "<", ">", "?"],
];

// ── FR-CA layout (same QWERTY base, accents accessible via cycle row) ────────
const FR_LOWER = EN_LOWER;
const FR_UPPER = EN_UPPER;

const FR_ACCENTS_LOWER = ["é", "è", "ê", "ë", "à", "â", "ù", "û", "ç", "ô", "î", "ï"];
const FR_ACCENTS_UPPER = ["É", "È", "Ê", "Ë", "À", "Â", "Ù", "Û", "Ç", "Ô", "Î", "Ï"];

export function OnScreenKeyboard({
  value,
  onChange,
  onSubmit,
  onClose,
  locale: localeProp = "en",
  className,
  capturePhysicalKeys = true,
}: OnScreenKeyboardProps) {
  type SpecialMode = "numbers" | "special" | "accents";

  const [draft, setDraft] = useState(value);
  const [shifted, setShifted] = useState(false);

  // Keep draft in sync when the parent updates `value` (e.g. physical keyboard input)
  useEffect(() => {
    setDraft(value);
  }, [value]);
  const [locale, setLocale] = useState<"en" | "fr">(localeProp);
  const [specialMode, setSpecialMode] = useState<SpecialMode>("numbers");
  const [isClosing, setIsClosing] = useState(false);
  const [flashKey, setFlashKey] = useState<string | null>(null);

  const ANIM_MS = 400;

  const commit = useCallback(() => {
    onChange(draft);
  }, [draft, onChange]);

  const triggerClose = useCallback(() => {
    commit();
    setIsClosing(true);
    setTimeout(() => onClose(), ANIM_MS);
  }, [commit, onClose]);

  const isFr = locale === "fr";
  const rows = shifted
    ? isFr ? FR_UPPER : EN_UPPER
    : isFr ? FR_LOWER : EN_LOWER;

  // Top extra row content based on specialMode
  const specialRow =
    specialMode === "numbers"
      ? (shifted ? EN_UPPER[0] : EN_LOWER[0])
      : specialMode === "special"
      ? EN_UPPER[0]
      : (shifted ? FR_ACCENTS_UPPER : FR_ACCENTS_LOWER);

  const cycleSpecial = () =>
    setSpecialMode((m) =>
      m === "numbers" ? "special" : m === "special" ? "accents" : "numbers"
    );

  const specialLabel =
    specialMode === "numbers" ? "123" : specialMode === "special" ? "#@!" : "àéç";

  const flash = (id: string) => {
    setFlashKey(id);
    setTimeout(() => setFlashKey(null), 150);
  };

  const handleKey = useCallback(
    (key: string) => {
      setDraft((prev) => {
        const next = prev + key;
        onChange(next);
        return next;
      });
      if (shifted) setShifted(false);
      flash(key);
    },
    [shifted, onChange]
  );

  const handleBackspace = useCallback(() => {
    setDraft((prev) => {
      const next = prev.slice(0, -1);
      onChange(next);
      return next;
    });
    flash("⌫");
  }, [onChange]);

  const handleDone = useCallback(() => {
    commit();
    onSubmit?.();
    setIsClosing(true);
    setTimeout(() => onClose(), ANIM_MS);
  }, [commit, onSubmit, onClose]);

  // Physical keyboard support (disabled in global mode — the focused input handles keystrokes natively)
  useEffect(() => {
    if (!capturePhysicalKeys) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Backspace") {
        e.preventDefault();
        setDraft((prev) => {
          const next = prev.slice(0, -1);
          onChange(next);
          return next;
        });
      } else if (e.key === "Enter") {
        e.preventDefault();
        handleDone();
      } else if (e.key === "Escape") {
        e.preventDefault();
        triggerClose();
      } else if (e.key.length === 1) {
        setDraft((prev) => {
          const next = prev + e.key;
          onChange(next);
          return next;
        });
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [capturePhysicalKeys, handleDone, triggerClose, onChange]);

  // Key button base style — light gray glass keys (bg applied conditionally per-key for flash)
  const keyBtnBase =
    "touch-target flex-1 !h-full text-2xl font-semibold !border-gray-200/60 !text-gray-900 !shadow-sm !transition-none";
  // Special row keys base — bg applied conditionally per-key for flash
  const specialKeyBtnBase =
    "touch-target flex-1 !h-full text-2xl font-semibold !border-sky-400/70 !text-gray-900 !shadow-sm !transition-none";

  return (
    <>
    {/* Backdrop — captures outside clicks */}
    <div
      className="fixed inset-0 z-40"
      onClick={triggerClose}
    />
    <div
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50 no-select",
        "flex flex-col",
        "bg-black/75 backdrop-blur-xl border-t border-white/10 shadow-2xl",
        "animate-in fade-in-0 slide-in-from-bottom-4 duration-[400ms]",
        className
      )}
      style={{
        height: "48vh",
        opacity: isClosing ? 0 : undefined,
        transition: isClosing ? `opacity ${ANIM_MS}ms ease` : undefined,
      }}
      onMouseDown={(e) => e.preventDefault()}
    >
      {/* ── Draft preview bar ── */}
      <div className="px-4 py-2 shrink-0 border-b border-white/10 flex justify-center">
        <div className="bg-white rounded-lg px-4 py-3 min-h-[4rem] flex items-center w-[60%]">
          <span className="text-gray-900 text-[1.44rem] font-medium flex-1 break-all">
            {draft}
          </span>
          <span className="w-0.5 h-6 bg-gray-500 animate-pulse ml-1 shrink-0" />
        </div>
      </div>

      {/* ── Key area: flex-1 fills remaining height ── */}
      <div className="flex-1 flex flex-col gap-2 px-16 py-2 overflow-hidden">

        {/* Cycling top row: numbers / special chars / accents */}
        <div className="flex-1 flex gap-2">
          {specialRow.map((key) => (
            <Button
              key={key}
              variant="outline"
              className={cn(
                specialKeyBtnBase,
                flashKey === key ? "!bg-[#aeffae]" : "!bg-sky-300/95 hover:!bg-sky-200"
              )}
              onClick={() => handleKey(key)}
            >
              {key}
            </Button>
          ))}
        </div>

        {/* Main rows 1–3 (skip row 0 which is rendered above as special row) */}
        {rows.slice(1).map((row, sliceIdx) => {
          const rowIdx = sliceIdx + 1; // actual row index (1, 2, 3)
          return (
            <div key={rowIdx} className="flex-1 flex gap-2">
              {/* Shift on last row (rowIdx === 3) */}
              {rowIdx === 3 && (
                <Button
                  variant="outline"
                  className={`touch-target !h-full w-32 text-2xl !border-gray-300/50 !shadow-sm !transition-none ${
                    shifted
                      ? "!bg-gray-600 !text-white"
                      : "!bg-white/50 hover:!bg-white/80 !text-gray-800"
                  }`}
                  onClick={() => setShifted((s) => !s)}
                >
                  <ArrowBigUp className="size-5" />
                </Button>
              )}

              {row.map((key) => (
                <Button
                  key={key}
                  variant="outline"
                  className={cn(
                    keyBtnBase,
                    flashKey === key ? "!bg-[#aeffae]" : "!bg-white/90 hover:!bg-white"
                  )}
                  onClick={() => handleKey(key)}
                >
                  {key}
                </Button>
              ))}

              {/* Backspace on last row */}
              {rowIdx === 3 && (
                <Button
                  variant="outline"
                  className={cn(
                    "touch-target !h-full w-32 text-2xl !border-gray-300/50 !text-red-600 !shadow-sm !transition-none",
                    flashKey === "⌫" ? "!bg-[#aeffae]" : "!bg-white/50 hover:!bg-white/80"
                  )}
                  onClick={handleBackspace}
                >
                  <Delete className="size-5" />
                </Button>
              )}
            </div>
          );
        })}

        {/* Bottom row: EN/FR | Special | Space | CLOSE | OK */}
        <div className="flex-1 flex gap-2">
          {/* EN/FR toggle — double width */}
          <Button
            variant="outline"
            className="touch-target !h-full w-44 text-xl font-bold !bg-white/50 hover:!bg-white/80 !border-gray-300/50 !text-gray-800 !shadow-sm"
            onClick={() => setLocale((l) => (l === "en" ? "fr" : "en"))}
          >
            {locale === "en" ? "EN→FR" : "FR→EN"}
          </Button>

          {/* Special cycle button — shows current mode, click to advance */}
          <Button
            variant="outline"
            className="touch-target !h-full w-36 text-2xl font-bold !bg-gray-600 !text-white !border-gray-300/50 !shadow-sm"
            onClick={cycleSpecial}
          >
            {specialLabel}
          </Button>

          {/* Space bar */}
          <Button
            variant="outline"
            className="touch-target !h-full flex-1 text-2xl !bg-white/70 hover:!bg-white/90 !border-gray-300/50 !text-gray-500 !shadow-sm !transition-none"
            onClick={() => handleKey(" ")}
          >
            espace / space
          </Button>

          {/* Done / OK */}
          <Button
            className="touch-target !h-full w-44 text-2xl font-bold !bg-green-500/85 hover:!bg-green-400/95 !text-white gap-1 !border-0 !shadow-sm"
            onClick={handleDone}
          >
            <CornerDownLeft className="size-[18px]" />
            OK
          </Button>
        </div>
      </div>
    </div>
    </>
  );
}
