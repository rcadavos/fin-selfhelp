import type { LucideIcon } from "lucide-react";
import { AlertCircle, Check, PartyPopper, Sprout, Target, TrendingUp } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import {
  daysAgoLabel,
  depositDateLabel,
  durationLabel,
  goalMonthLabel,
  ymLabel,
  type GoalProgress,
} from "@/lib/goals/progress";

const RING_RADIUS = 22;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

/**
 * How much of the target is saved, as a ring with the percent inside. A reached
 * goal is a full ring with a tick; a goal with no target has nothing to measure,
 * so it shows a plain target mark instead of an empty ring.
 */
export function GoalRing({ progress, className }: { progress: GoalProgress; className?: string }) {
  const { isReached, hasTarget, ratio, percentLabel, isFunded } = progress;

  if (!hasTarget && !isReached) {
    return (
      <span
        aria-hidden
        className={cn("flex size-[52px] shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary", className)}
      >
        <Target className="size-5" />
      </span>
    );
  }

  const filled = isReached ? RING_CIRCUMFERENCE : RING_CIRCUMFERENCE * (ratio ?? 0);
  const label = isReached ? "Reached" : `${percentLabel} of the target saved`;

  return (
    <div className={cn("relative size-[52px] shrink-0", className)}>
      <svg viewBox="0 0 52 52" className="size-full -rotate-90" role="img" aria-label={label}>
        <circle cx="26" cy="26" r={RING_RADIUS} fill="none" strokeWidth="5" className="stroke-muted" />
        {/* Left out at 0: a round cap on a zero-length dash still draws a dot. */}
        {filled > 0 && (
          <circle
            cx="26"
            cy="26"
            r={RING_RADIUS}
            fill="none"
            strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray={`${filled} ${RING_CIRCUMFERENCE}`}
            className="stroke-primary transition-[stroke-dasharray] duration-500"
          />
        )}
      </svg>
      <span
        aria-hidden
        className={cn(
          "absolute inset-0 flex items-center justify-center font-mono text-[11.5px] font-medium",
          (isReached || isFunded) && "text-primary",
        )}
      >
        {isReached ? <Check className="size-5" strokeWidth={3} /> : percentLabel}
      </span>
    </div>
  );
}

type Tone = "primary" | "warning" | "muted";

const TONE_CLASS: Record<Tone, string> = {
  primary: "text-primary",
  warning: "text-warning",
  muted: "text-muted-foreground",
};

type StatusLine = { icon: LucideIcon; tone: Tone; text: string } | null;

/** The one line that judges a goal: reached, funded, stalled, on its way, or not started. */
function statusLineFor(progress: GoalProgress, currency: string, todayYmd: string | null): StatusLine {
  const { goal, isReached, isFunded, hasTarget, over, monthlyPace, projectedMonth, projectionTooFar, isStalled } =
    progress;

  if (isReached) {
    const when = goalMonthLabel(goal.date_achieved_month!, goal.date_achieved_year!);
    const took = progress.monthsToReach !== null && progress.monthsToReach >= 0 ? progress.monthsToReach : null;
    return {
      icon: PartyPopper,
      tone: "primary",
      text: took === null ? `Reached in ${when}` : `Reached in ${when} • took ${durationLabel(took)}`,
    };
  }
  if (isFunded) {
    return {
      icon: PartyPopper,
      tone: "primary",
      text: over > 0 ? `Target met, ${formatCurrency(over, currency)} over` : "Target met",
    };
  }
  if (!hasTarget) {
    return {
      icon: Target,
      tone: "muted",
      text: "No target set • add one to see how close you are",
    };
  }
  if (goal.deposit_count === 0) {
    return { icon: Sprout, tone: "muted", text: "Nothing saved yet • add the first amount to get going" };
  }
  // Everything below depends on today, which is unknown until the page hydrates.
  if (!todayYmd) return null;
  if (isStalled && goal.last_deposit_at) {
    return {
      icon: AlertCircle,
      tone: "warning",
      text: `Nothing added since ${depositDateLabel(goal.last_deposit_at, Number(todayYmd.slice(0, 4)))}`,
    };
  }
  if (monthlyPace && projectedMonth) {
    return {
      icon: TrendingUp,
      tone: "primary",
      text: `About ${formatCurrency(Math.round(monthlyPace), currency)} a month • there by ${ymLabel(projectedMonth)}`,
    };
  }
  if (monthlyPace && projectionTooFar) {
    return {
      icon: TrendingUp,
      tone: "muted",
      text: `About ${formatCurrency(Math.round(monthlyPace), currency)} a month • decades away at this pace`,
    };
  }
  return { icon: TrendingUp, tone: "muted", text: "Add money regularly to see when you'll get there" };
}

/**
 * The goal's judgement line. While today is unknown it holds the line's height
 * with nothing in it, so the card does not jump when the pace arrives.
 */
export function GoalStatusLine({
  progress,
  currency,
  todayYmd,
  className,
}: {
  progress: GoalProgress;
  currency: string;
  /** The viewer's date, or null while the page hydrates. */
  todayYmd: string | null;
  className?: string;
}) {
  const line = statusLineFor(progress, currency, todayYmd);
  if (!line) {
    return <p aria-hidden className={cn("min-h-[1.25rem] text-[12.5px]", className)}>{" "}</p>;
  }
  const Icon = line.icon;
  return (
    <p className={cn("flex min-h-[1.25rem] items-start gap-1.5 text-[12.5px] leading-snug", TONE_CLASS[line.tone], className)}>
      <Icon className="mt-[3px] size-3.5 shrink-0" aria-hidden />
      <span className="min-w-0">{line.text}</span>
    </p>
  );
}

/** "Last added 12 days ago", or the date itself until today is known; "Started Mar 2025" with no deposits. */
export function lastAddedLabel(progress: GoalProgress, todayYmd: string | null): string {
  const { goal, daysSinceLastDeposit } = progress;
  if (!goal.last_deposit_at) return `Started ${goalMonthLabel(goal.date_set_month, goal.date_set_year)}`;
  if (daysSinceLastDeposit !== null) return `Last added ${daysAgoLabel(daysSinceLastDeposit)}`;
  const year = todayYmd ? Number(todayYmd.slice(0, 4)) : undefined;
  return `Last added ${depositDateLabel(goal.last_deposit_at, year)}`;
}
