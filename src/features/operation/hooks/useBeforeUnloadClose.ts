import { useEffect, useRef } from "react";
import { closeProductionRunBeacon } from "@/api/pqtt";

/**
 * Attaches a beforeunload listener that fires `navigator.sendBeacon` to the
 * PQTT_CloseRun endpoint when the user closes the tab or navigates away.
 *
 * The active PRSEQ/PRDETSEQ are kept in a ref so the listener always sees
 * the latest values without re-binding on every render.
 *
 * The listener is also invoked on `pagehide` (Safari and mobile-friendly).
 */
export function useBeforeUnloadClose(prseq: number | null, prdetseq: number | null) {
  const ref = useRef({ prseq, prdetseq });
  ref.current = { prseq, prdetseq };

  useEffect(() => {
    const fire = () => {
      const { prseq: p, prdetseq: d } = ref.current;
      if (!p) return;
      closeProductionRunBeacon({ PRSEQ: p, PRDETSEQ: d });
    };

    window.addEventListener("beforeunload", fire);
    window.addEventListener("pagehide", fire);

    return () => {
      window.removeEventListener("beforeunload", fire);
      window.removeEventListener("pagehide", fire);
    };
  }, []);
}
