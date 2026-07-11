"use client";

import { useState, useEffect, useRef } from "react";
import { Flame, X } from "lucide-react";
import { SiteLogo } from "@/components/app/site-logo";
import { cn } from "@/lib/utils";

type InsightPopupProps = {
  firstName: string;
  streak: number;
  billsPaidPct?: number;
};

const FINANCIAL_TIPS = [
  { message: "Review your spending categories to spot savings." },
  { message: "Small daily savings add up — track every peso." },
  { message: "Set a savings goal and work toward it every month." },
  { message: "Log in daily to stay on top of your finances." },
];

const STORAGE_KEY = "insight-popup-dismissed";

function getTodayKey() {
  return new Date().toISOString().slice(0, 10);
}

function isDismissedToday() {
  try {
    return localStorage.getItem(STORAGE_KEY) === getTodayKey();
  } catch {
    return false;
  }
}

function dismissToday() {
  try {
    localStorage.setItem(STORAGE_KEY, getTodayKey());
  } catch {
    // ignore
  }
}

export function InsightPopup({ firstName, streak, billsPaidPct }: InsightPopupProps) {
  const [visible, setVisible] = useState(false);
  const [closed, setClosed] = useState(false);
  // Stabilise tip selection so it never changes on re-render
  const [tip] = useState(() => FINANCIAL_TIPS[Math.floor(Math.random() * FINANCIAL_TIPS.length)]);
  const popupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isDismissedToday()) {
      setClosed(true);
      return;
    }
    const timer = setTimeout(() => setVisible(true), 1200);
    return () => clearTimeout(timer);
  }, []);

  // Close on click outside
  useEffect(() => {
    if (!visible) return;
    function handleClick(e: MouseEvent) {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        close();
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [visible]);

  function close() {
    setVisible(false);
    setTimeout(() => {
      setClosed(true);
      dismissToday();
    }, 350);
  }

  if (closed) return null;

  const hasStreak = streak >= 2;
  const hasBills = billsPaidPct !== undefined && billsPaidPct > 0;

  return (
    <div
      ref={popupRef}
      className={cn(
        "fixed bottom-20 right-3 z-50 w-60 overflow-hidden rounded-lg border border-border bg-popover text-popover-foreground",
        "md:bottom-5 md:right-5 md:w-72",
        "transition duration-200 ease-out motion-reduce:transition-none",
        visible
          ? "translate-y-0 opacity-100"
          : "translate-y-4 opacity-0 pointer-events-none"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <SiteLogo className="text-base" iconClassName="h-5 w-5" />
        <button
          type="button"
          onClick={close}
          className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label="Close"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Body */}
      <div className="px-4 pb-4 pt-3">
        {hasStreak ? (
          <>
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-primary/40 text-primary">
                <Flame className="h-5 w-5" />
              </span>
              <p className="font-mono text-2xl font-semibold leading-none tabular-nums">
                {streak}
                <span className="ml-1.5 align-middle text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  day streak
                </span>
              </p>
            </div>
            <p className="mt-3 text-xs leading-snug text-muted-foreground md:text-sm">
              You&apos;re on a roll, {firstName}. Keep logging in every day!
            </p>
          </>
        ) : hasBills ? (
          <>
            <p className="font-mono text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Planned paid
            </p>
            <p className="mt-1 font-mono text-2xl font-semibold tabular-nums">{billsPaidPct}%</p>
            <p className="mt-2 text-xs leading-snug text-muted-foreground md:text-sm">
              {billsPaidPct! >= 80
                ? "You're crushing it this month!"
                : billsPaidPct! >= 50
                ? "Halfway there — keep it up, " + firstName + "!"
                : "Don't forget to settle your remaining planned expenses."}
            </p>
          </>
        ) : (
          <p className="text-xs leading-snug text-muted-foreground md:text-sm">{tip.message}</p>
        )}
      </div>
    </div>
  );
}
