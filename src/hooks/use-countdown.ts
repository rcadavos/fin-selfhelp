"use client";

import { useEffect, useState } from "react";

/**
 * Whole seconds left on a countdown, ticking once a second until it reaches 0.
 * Call the setter with a new number of seconds to restart it. Display only: anything
 * it gates (like a resend cooldown) must also be enforced on the server.
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
