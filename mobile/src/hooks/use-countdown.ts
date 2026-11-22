import { useEffect, useState } from "react";

/**
 * Whole seconds left on a countdown, ticking once a second until it reaches 0. Call
 * the setter with a new number of seconds to restart it. Display only: the web
 * enforces the cooldowns it shows. Mirrors the web's `src/hooks/use-countdown.ts`.
 */
export function useCountdown(initialSeconds = 0) {
  const [remaining, setRemaining] = useState(initialSeconds);

  useEffect(() => {
    if (remaining <= 0) return;
    const id = setTimeout(() => setRemaining((s) => Math.max(0, s - 1)), 1000);
    return () => clearTimeout(id);
  }, [remaining]);

  return [remaining, setRemaining] as const;
}
