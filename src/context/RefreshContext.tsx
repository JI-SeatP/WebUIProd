import { createContext, useContext, useCallback, useEffect, useRef } from "react";

type RefreshFn = () => void | Promise<void>;

interface RefreshContextValue {
  /** Register a refresh callback — returns an unregister function */
  register: (fn: RefreshFn) => () => void;
  /** Call all registered refresh callbacks */
  refresh: () => void;
}

const RefreshContext = createContext<RefreshContextValue | null>(null);

export function RefreshProvider({ children }: { children: React.ReactNode }) {
  const callbacksRef = useRef<Set<RefreshFn>>(new Set());

  const register = useCallback((fn: RefreshFn) => {
    callbacksRef.current.add(fn);
    return () => {
      callbacksRef.current.delete(fn);
    };
  }, []);

  const refresh = useCallback(() => {
    if (callbacksRef.current.size === 0) {
      // No page-specific refresh registered — fall back to full reload
      window.location.reload();
      return;
    }
    callbacksRef.current.forEach((fn) => fn());
  }, []);

  return (
    <RefreshContext.Provider value={{ register, refresh }}>
      {children}
    </RefreshContext.Provider>
  );
}

/**
 * Pages call this to register their refetch logic.
 * The callback is automatically unregistered when the component unmounts.
 */
export function useRegisterRefresh(fn: RefreshFn) {
  const ctx = useContext(RefreshContext);
  const fnRef = useRef(fn);
  fnRef.current = fn;

  useEffect(() => {
    if (!ctx) return;
    const unregister = ctx.register(() => fnRef.current());
    return unregister;
  }, [ctx]);
}

/** Header calls this to get the refresh trigger */
export function useRefresh() {
  const ctx = useContext(RefreshContext);
  return ctx?.refresh ?? (() => window.location.reload());
}
