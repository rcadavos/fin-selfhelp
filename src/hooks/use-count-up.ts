"use client";

import { useEffect, useRef, useState } from "react";
import { roundToCents } from "@/lib/utils";
import { COUNT_UP_DURATION_MS } from "@/lib/constants/motion";

function prefersReducedMotion(): boolean {
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
}

/**
 * Counts a figure up from 0 to `target` when it first shows, then tweens from
 * whatever it is showing to each new `target`, so a total that arrives with its
 * query (or changes after an edit) rolls into place instead of jumping.
 *
 * It always starts at 0, on the server and on the client's first render alike,
 * so hydration never sees two different numbers. Frames land on whole units for
 * a whole-number target and on cents otherwise, and the last frame is exactly
 * `target`. Users who ask the OS for reduced motion get the value in one frame.
 */
export function useCountUp(target: number, duration = COUNT_UP_DURATION_MS): number {
  const [value, setValue] = useState(0);
  // What is on screen right now, so an interrupted tween resumes from there.
  const shownRef = useRef(0);

  useEffect(() => {
    const from = shownRef.current;
    if (from === target) return;

    const ms = prefersReducedMotion() ? 0 : duration;
    const step = Number.isInteger(roundToCents(target)) ? 1 : 100;
    // Timed from the first frame: a rAF timestamp can predate a performance.now()
    // taken here, which would ease backwards past `from` on the first frame.
    let start = -1;
    let rafId = 0;
    const tick = (now: number) => {
      if (start < 0) start = now;
      const t = ms > 0 ? Math.min(1, (now - start) / ms) : 1;
      const eased = 1 - Math.pow(1 - t, 3);
      // `|| 0` turns -0 into 0, which would otherwise format as "-₱0".
      const next =
        t === 1 ? target : Math.round((from + (target - from) * eased) * step) / step || 0;
      shownRef.current = next;
      setValue(next);
      if (t < 1) rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [target, duration]);

  return value;
}
