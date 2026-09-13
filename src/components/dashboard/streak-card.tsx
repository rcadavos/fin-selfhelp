"use client";

import { Flame } from "lucide-react";
import { cn } from "@/lib/utils";

/** Days past which the streak is worth calling out rather than just stating. */
const STREAK_MILESTONE = 7;

function streakNote(streak: number, firstName: string): string {
  if (streak <= 1) return "Open OmniTrak tomorrow to start a streak.";
  if (streak < STREAK_MILESTONE) return `${STREAK_MILESTONE - streak} more to reach a full week.`;
  if (streak < 30) return "A week and counting. Nice work.";
  return `${Math.floor(streak / 30)} month${streak >= 60 ? "s" : ""} of showing up${firstName ? `, ${firstName}` : ""}.`;
}

/**
 * The login streak, as a section rather than the popup it used to be.
 *
 * A popup interrupts to say something that was never urgent — and it covered
 * part of the page to do it. On the dashboard it can simply sit under the bills
 * you came to check.
 */
export function StreakCard({
  streak,
  firstName,
  className,
}: {
  streak: number;
  firstName: string;
  className?: string;
}) {
  const hasStreak = streak >= 2;

  return (
    <section
      className={cn("surface min-w-0 overflow-hidden border border-border bg-card", className)}
      aria-label="Login streak"
    >
      <div className="flex items-center justify-between gap-3 border-b border-border p-4 sm:p-5">
        <h2 className="text-base font-bold tracking-tight">Your streak</h2>
        <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          Daily
        </span>
      </div>

      <div className="flex items-center gap-3.5 p-4 sm:p-5">
        <span
          className={cn(
            "flex size-11 shrink-0 items-center justify-center rounded-full border",
            hasStreak
              ? "border-primary/40 bg-primary/10 text-primary"
              : "border-border bg-muted text-muted-foreground",
          )}
          aria-hidden
        >
          <Flame className="size-5" />
        </span>

        <div className="min-w-0">
          <p className="font-mono text-2xl font-semibold leading-none tabular-nums">
            {streak}
            <span className="ml-1.5 align-middle text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              {streak === 1 ? "day" : "days"} in a row
            </span>
          </p>
          <p className="mt-1.5 text-xs text-muted-foreground sm:text-sm">
            {streakNote(streak, firstName)}
          </p>
        </div>
      </div>
    </section>
  );
}
