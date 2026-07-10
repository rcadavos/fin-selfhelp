"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useIsFetching, useIsMutating } from "@tanstack/react-query";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

/**
 * Detects App Router client-side navigations so the bar can show on *every*
 * route change — not only when React Query is fetching. SSR-prefetched pages
 * (which read their data from the hydration cache via useSuspenseQuery) trigger
 * no client fetch, so without this they'd navigate with no loading feedback.
 *
 * START is detected by intercepting internal link clicks, history.pushState
 * (programmatic router.push) and popstate (back/forward). END is detected when
 * the committed pathname or search params change. A safety timeout clears the
 * state if an expected navigation never commits.
 */
function useRouteChanging() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [changing, setChanging] = useState(false);

  useEffect(() => {
    // Never schedule the React update synchronously. history.pushState can be
    // invoked from inside React's commit / insertion-effect phase (App Router +
    // next-themes history sync, Radix dialogs), where scheduling an update throws
    // "useInsertionEffect must not schedule updates". A macrotask (setTimeout 0)
    // runs only after the current commit fully unwinds, so the update always
    // lands outside the forbidden window while still firing before the next route
    // commits (so ordering vs. the END effect is preserved).
    const start = () => {
      window.setTimeout(() => setChanging(true), 0);
    };

    const isInternalNavClick = (e: MouseEvent) => {
      if (e.defaultPrevented) return false;
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey)
        return false;
      const anchor = (e.target as HTMLElement | null)?.closest("a");
      if (!anchor) return false;
      const href = anchor.getAttribute("href");
      if (!href || anchor.hasAttribute("download")) return false;
      if (anchor.target && anchor.target !== "_self") return false;
      let url: URL;
      try {
        url = new URL(anchor.href, window.location.href);
      } catch {
        return false;
      }
      if (url.origin !== window.location.origin) return false;
      // Hash-only / identical-URL clicks are not route transitions.
      return (
        url.pathname !== window.location.pathname ||
        url.search !== window.location.search
      );
    };

    const onClick = (e: MouseEvent) => {
      if (isInternalNavClick(e)) start();
    };

    // Patch pushState (real forward navigations) but NOT replaceState, which
    // Next.js calls internally for non-navigation history sync and would flash
    // the bar spuriously.
    //
    // Always wrap the NATIVE pushState, never a previous wrapper. Fast Refresh
    // re-runs this effect, and if we wrapped whatever was currently installed we
    // would stack wrappers — leaving stale closures on the global that keep
    // firing the old (pre-fix) handler. Stashing the native fn on window makes
    // re-patching idempotent and self-healing across hot reloads.
    const w = window as unknown as {
      __omnitrakNativePushState?: History["pushState"];
    };
    const nativePush = w.__omnitrakNativePushState ?? history.pushState;
    w.__omnitrakNativePushState = nativePush;
    const patchedPush: History["pushState"] = function (this: History, ...args) {
      start();
      return nativePush.apply(
        this,
        args as Parameters<History["pushState"]>,
      );
    };
    history.pushState = patchedPush;

    document.addEventListener("click", onClick);
    window.addEventListener("popstate", start);

    return () => {
      // Only restore if ours is still installed (avoid clobbering a newer patch).
      if (history.pushState === patchedPush) history.pushState = nativePush;
      document.removeEventListener("click", onClick);
      window.removeEventListener("popstate", start);
    };
  }, []);

  // The URL committed → navigation finished.
  useEffect(() => {
    setChanging(false);
  }, [pathname, searchParams]);

  // Safety net: never let the bar hang if a navigation never commits.
  useEffect(() => {
    if (!changing) return;
    const t = window.setTimeout(() => setChanging(false), 10000);
    return () => window.clearTimeout(t);
  }, [changing]);

  return changing;
}

/**
 * YouTube-style top progress bar. Shows a thin animated bar at the very top of
 * the viewport whenever there are in-flight React Query queries/mutations or an
 * App Router navigation is in progress.
 *
 * It "trickles" toward 90% while loading (we never know the real progress of an
 * indeterminate fetch), snaps to 100% and fades out when everything settles.
 * Uses the app's primary (green) accent — intentionally not red.
 */
function GlobalLoadingBarInner() {
  const routeChanging = useRouteChanging();
  const active = useIsFetching() + useIsMutating() > 0 || routeChanging;

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

/**
 * useSearchParams() must sit under a Suspense boundary so it doesn't opt the
 * whole app (this renders at the root in Providers) into client rendering.
 */
export function GlobalLoadingBar() {
  return (
    <Suspense fallback={null}>
      <GlobalLoadingBarInner />
    </Suspense>
  );
}
