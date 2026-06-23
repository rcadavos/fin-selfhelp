"use client";

import { useEffect, useRef, useState } from "react";
import { useIsFetching, useIsMutating } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

/**
 * YouTube-style top progress bar. Shows a thin animated bar at the very top of
 * the viewport whenever there are in-flight React Query queries or mutations.
 *
 * It "trickles" toward 90% while loading (we never know the real progress of an
 * indeterminate fetch), snaps to 100% and fades out when everything settles.
 * Uses the app's primary (green) accent — intentionally not red.
 */
export function GlobalLoadingBar() {
  const active = useIsFetching() + useIsMutating() > 0;

  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);

  // All pending timers/intervals so we can cancel them on every transition.
  // clearTimeout also cancels intervals per the HTML spec (shared id space).
  const timers = useRef<number[]>([]);
  // Only run the "finish" animation if a load actually started — avoids a
  // phantom fill-and-fade on first mount when nothing is loading.
  const startedRef = useRef(false);

  useEffect(() => {
    const clearTimers = () => {
      timers.current.forEach((t) => window.clearTimeout(t));
      timers.current = [];
    };
    clearTimers();

    if (active) {
      startedRef.current = true;
      setVisible(true);
      // Restart the cycle if we were finishing (>= 100) or kick it off from 0.
      setProgress((p) => (p === 0 || p >= 100 ? 12 : p));
      const interval = window.setInterval(() => {
        // Ease toward 90% — bigger steps early, smaller as it approaches.
        setProgress((p) => (p >= 90 ? p : p + Math.max(0.5, (90 - p) * 0.08)));
      }, 300);
      timers.current.push(interval);
    } else if (startedRef.current) {
      startedRef.current = false;
      setProgress(100);
      // After the width fills, fade out, then reset width while hidden.
      timers.current.push(
        window.setTimeout(() => {
          setVisible(false);
          timers.current.push(window.setTimeout(() => setProgress(0), 300));
        }, 350),
      );
    }

    return clearTimers;
  }, [active]);

  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none fixed inset-x-0 top-0 z-[200] h-[3px] transition-opacity duration-300",
        visible ? "opacity-100" : "opacity-0",
      )}
    >
      <div
        className="h-full bg-primary shadow-[0_0_10px_hsl(var(--primary)/0.7),0_0_5px_hsl(var(--primary)/0.5)] transition-[width] duration-300 ease-out"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}
