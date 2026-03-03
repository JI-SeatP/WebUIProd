import { useState, useCallback } from "react";

export type InputMethodType = "keyboard" | "numpad" | null;

interface InputMethodState {
  activeType: InputMethodType;
  value: string;
  targetRef: HTMLInputElement | null;
}

export function useInputMethod() {
  const [state, setState] = useState<InputMethodState>({
    activeType: null,
    value: "",
    targetRef: null,
  });

  const openKeyboard = useCallback((input: HTMLInputElement) => {
    setState({
      activeType: "keyboard",
      value: input.value,
      targetRef: input,
    });
  }, []);

  const openNumpad = useCallback((input: HTMLInputElement) => {
    setState({
      activeType: "numpad",
      value: input.value,
      targetRef: input,
    });
  }, []);

  const close = useCallback(() => {
    setState({ activeType: null, value: "", targetRef: null });
  }, []);

  const handleKeyPress = useCallback(
    (key: string) => {
      if (!state.targetRef) return;
      const newValue = state.value + key;
      setState((prev) => ({ ...prev, value: newValue }));
      updateInput(state.targetRef, newValue);
    },
    [state.targetRef, state.value]
  );

  const handleBackspace = useCallback(() => {
    if (!state.targetRef) return;
    const newValue = state.value.slice(0, -1);
    setState((prev) => ({ ...prev, value: newValue }));
    updateInput(state.targetRef, newValue);
  }, [state.targetRef, state.value]);

  const handleNumpadChange = useCallback(
    (newValue: string) => {
      setState((prev) => ({ ...prev, value: newValue }));
      if (state.targetRef) {
        updateInput(state.targetRef, newValue);
      }
    },
    [state.targetRef]
  );

  return {
    activeType: state.activeType,
    value: state.value,
    openKeyboard,
    openNumpad,
    close,
    handleKeyPress,
    handleBackspace,
    handleNumpadChange,
  };
}

/** Trigger React-compatible input value change */
function updateInput(input: HTMLInputElement, value: string) {
  const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    "value"
  )?.set;
  if (nativeInputValueSetter) {
    nativeInputValueSetter.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  }
}
