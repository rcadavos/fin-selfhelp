"use client";

import { useEffect, useRef, useState } from "react";

export function useAnimatedNumber(target: number, duration = 500): number {
  const [displayed, setDisplayed] = useState(target);
  const displayedRef = useRef(target);
  displayedRef.current = displayed;

  useEffect(() => {
    const from = displayedRef.current;
    if (from === target) return;
    const startTime = performance.now();
    let rafId = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - startTime) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplayed(t === 1 ? target : from + (target - from) * eased);
      if (t < 1) rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [target, duration]);

  return displayed;
}
