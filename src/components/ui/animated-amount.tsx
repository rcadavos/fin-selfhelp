"use client";

import { useState, useEffect, useRef } from "react";
import { formatCurrency } from "@/lib/utils";

export function useCountUp(target: number, duration = 700): number {
  const [value, setValue] = useState(0);
  const raf = useRef(0);
  const prev = useRef(0);

  useEffect(() => {
    cancelAnimationFrame(raf.current);
    if (target === 0) { setValue(0); prev.current = 0; return; }
    const from = prev.current;
    const startTime = performance.now();
    function tick(now: number) {
      const t = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(from + (target - from) * eased));
      if (t < 1) raf.current = requestAnimationFrame(tick);
      else prev.current = target;
    }
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [target, duration]);

  return value;
}

export function AnimatedAmount({ value, currency, className }: { value: number; currency?: string; className?: string }) {
  const animated = useCountUp(value);
  return <span className={className}>{formatCurrency(animated, currency)}</span>;
}
