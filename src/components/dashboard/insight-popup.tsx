"use client";

import { useState, useEffect, useRef } from "react";
import { X } from "lucide-react";
import { SiteLogo } from "@/components/app/site-logo";
import { cn } from "@/lib/utils";

type InsightPopupProps = {
  firstName: string;
  streak: number;
  billsPaidPct?: number;
};

function FireBadge(_: { count: number }) {
  return (
    <span className="relative inline-block leading-none">
      <span className="text-5xl">🔥</span>
    </span>
  );
}

const FINANCIAL_TIPS = [
  { emoji: "📊", message: "Review your spending categories to spot savings." },
  { emoji: "💡", message: "Small daily savings add up — track every peso." },
  { emoji: "🎯", message: "Set a savings goal and work toward it every month." },
  { emoji: "📅", message: "Log in daily to stay on top of your finances." },
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
        "fixed bottom-20 right-3 z-50 w-60 overflow-hidden rounded-2xl border bg-background shadow-2xl",
        "md:bottom-5 md:right-5 md:w-72",
        "transition-all duration-500 ease-out",
        visible
          ? "translate-y-0 opacity-100 scale-100"
          : "translate-y-8 opacity-0 scale-95 pointer-events-none"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-2">
        <SiteLogo className="h-6 w-auto max-h-6 md:h-7 md:max-h-7" />
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
      <div className="px-3 py-3 text-center md:px-5 md:py-5">
        {hasStreak ? (
          <>
            <div className="flex justify-center mb-1.5">
              <FireBadge count={streak} />
            </div>
            <p className="text-base font-bold text-foreground mt-1 md:text-xl">{streak}-day streak!</p>
            <p className="mt-1 text-xs text-muted-foreground leading-snug md:mt-1.5 md:text-sm">
              You&apos;re on a roll, {firstName}. Keep logging in every day!
            </p>
          </>
        ) : hasBills ? (
          <>
            <p className="text-3xl mb-1.5 md:text-4xl md:mb-2">💰</p>
            <p className="text-base font-bold text-foreground md:text-xl">
              {billsPaidPct}% planned expenses paid
            </p>
            <p className="mt-1 text-xs text-muted-foreground leading-snug md:mt-1.5 md:text-sm">
              {billsPaidPct! >= 80
                ? "You're crushing it this month!"
                : billsPaidPct! >= 50
                ? "Halfway there — keep it up, " + firstName + "!"
                : "Don't forget to settle your remaining planned expenses."}
            </p>
          </>
        ) : (
          <>
            <p className="text-3xl mb-1.5 md:text-4xl md:mb-2">{tip.emoji}</p>
            <p className="text-xs text-muted-foreground leading-snug md:text-sm">{tip.message}</p>
          </>
        )}
      </div>
    </div>
  );
}
