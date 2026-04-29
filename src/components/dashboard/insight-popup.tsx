"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { SiteLogo } from "@/components/app/site-logo";
import { cn } from "@/lib/utils";

type InsightPopupProps = {
  firstName: string;
  streak: number;
  billsPaidPct?: number;
};

function FireBadge({ count }: { count: number }) {
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

export function InsightPopup({ firstName, streak, billsPaidPct }: InsightPopupProps) {
  const [visible, setVisible] = useState(false);
  const [closed, setClosed] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem("insight-popup-closed")) return;
    const timer = setTimeout(() => setVisible(true), 1200);
    return () => clearTimeout(timer);
  }, []);

  function close() {
    setVisible(false);
    setTimeout(() => {
      setClosed(true);
      sessionStorage.setItem("insight-popup-closed", "1");
    }, 350);
  }

  if (closed) return null;

  const hasStreak = streak >= 2;
  const hasBills = billsPaidPct !== undefined && billsPaidPct > 0;
  const tip = FINANCIAL_TIPS[Math.floor(Math.random() * FINANCIAL_TIPS.length)];

  return (
    <div
      className={cn(
        "fixed bottom-5 right-5 z-50 w-72 overflow-hidden rounded-2xl border bg-background shadow-2xl",
        "transition-all duration-500 ease-out",
        visible
          ? "translate-y-0 opacity-100 scale-100"
          : "translate-y-8 opacity-0 scale-95 pointer-events-none"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-2.5">
        <SiteLogo className="h-7 w-auto max-h-7" />
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
      <div className="px-5 py-5 text-center">
        {hasStreak ? (
          <>
            <div className="flex justify-center mb-2">
              <FireBadge count={streak} />
            </div>
            <p className="text-xl font-bold text-foreground mt-1">{streak}-day streak!</p>
            <p className="mt-1.5 text-sm text-muted-foreground leading-snug">
              You&apos;re on a roll, {firstName}. Keep logging in every day!
            </p>
          </>
        ) : hasBills ? (
          <>
            <p className="text-4xl mb-2">💰</p>
            <p className="text-xl font-bold text-foreground">
              {billsPaidPct}% bills paid
            </p>
            <p className="mt-1.5 text-sm text-muted-foreground leading-snug">
              {billsPaidPct! >= 80
                ? "You're crushing it this month!"
                : billsPaidPct! >= 50
                ? "Halfway there — keep it up, " + firstName + "!"
                : "Don't forget to settle your remaining bills."}
            </p>
          </>
        ) : (
          <>
            <p className="text-4xl mb-2">{tip.emoji}</p>
            <p className="text-sm text-muted-foreground leading-snug">{tip.message}</p>
          </>
        )}
      </div>
    </div>
  );
}
