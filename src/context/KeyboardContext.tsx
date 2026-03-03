import { createContext, useState, useEffect, useRef, useCallback, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { OnScreenKeyboard } from "@/components/shared/OnScreenKeyboard";

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
const KeyboardContext = createContext<{}>({});
export { KeyboardContext };

/** Input types that should trigger the on-screen keyboard */
const TEXT_INPUT_TYPES = new Set(["text", "search", "email", "url", "tel", ""]);

function shouldShowKeyboard(
  el: EventTarget | null
): el is HTMLInputElement | HTMLTextAreaElement {
  if (!el || !(el instanceof HTMLElement)) return false;
  if (el.tagName === "TEXTAREA") {
    return (
      !(el as HTMLTextAreaElement).readOnly &&
      el.dataset.noKeyboard === undefined
    );
  }
  if (el.tagName === "INPUT") {
    const input = el as HTMLInputElement;
    if (input.readOnly) return false;
    if (input.dataset.noKeyboard !== undefined) return false;
    return TEXT_INPUT_TYPES.has(input.type.toLowerCase());
  }
  return false;
}

function injectValue(
  el: HTMLInputElement | HTMLTextAreaElement,
  value: string
) {
  const proto =
    el.tagName === "TEXTAREA"
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype;
  const nativeSetter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
  nativeSetter?.call(el, value);
  el.dispatchEvent(new Event("input", { bubbles: true }));
}

export function KeyboardProvider({ children }: { children: ReactNode }) {
  const [activeInput, setActiveInput] = useState<
    HTMLInputElement | HTMLTextAreaElement | null
  >(null);
  const [keyboardValue, setKeyboardValue] = useState("");
  // Increment to force keyboard remount when switching between inputs
  const [keyboardKey, setKeyboardKey] = useState(0);
  const activeInputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(
    null
  );

  useEffect(() => {
    const handleFocusIn = (e: FocusEvent) => {
      const target = e.target;
      if (shouldShowKeyboard(target)) {
        activeInputRef.current = target;
        setKeyboardValue(target.value);
        setKeyboardKey((k) => k + 1);
        setActiveInput(target);
      }
    };

    document.addEventListener("focusin", handleFocusIn);
    return () => document.removeEventListener("focusin", handleFocusIn);
  }, []);

  // Sync keyboard preview when physical keyboard updates the active input natively
  useEffect(() => {
    if (!activeInput) return;
    const handleNativeInput = (e: Event) => {
      const target = e.target as HTMLInputElement | HTMLTextAreaElement;
      setKeyboardValue(target.value);
    };
    activeInput.addEventListener("input", handleNativeInput);
    return () => activeInput.removeEventListener("input", handleNativeInput);
  }, [activeInput]);

  const handleChange = useCallback((value: string) => {
    setKeyboardValue(value);
    if (activeInputRef.current) {
      injectValue(activeInputRef.current, value);
    }
  }, []);

  const handleClose = useCallback(() => {
    setActiveInput(null);
    activeInputRef.current = null;
  }, []);

  return (
    <KeyboardContext.Provider value={{}}>
      {children}
      {activeInput &&
        createPortal(
          <OnScreenKeyboard
            key={keyboardKey}
            value={keyboardValue}
            onChange={handleChange}
            onClose={handleClose}
            capturePhysicalKeys={false}
          />,
          document.body
        )}
    </KeyboardContext.Provider>
  );
}
