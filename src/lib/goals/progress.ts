/**
 * Derivations behind the Goals page.
 *
 * The overview panel, the goal cards and the detail panel all read a goal through
 * `summariseGoal`, so the percent on a card, the ring in the panel and the
 * projection can never disagree.
 *
 * Anything that depends on today takes `todayYmd`, which is null while the page
 * server-renders and hydrates (see `useLocalClock`): the server runs in UTC, so
 * its "today" can be a day, or at a month's edge a whole month, behind a viewer
 * in Manila. Those fields come back null until the viewer's date is known.
 *
 * Dates are formatted by hand rather than with `toLocaleDateString`, so the
 * server's ICU produces exactly the text the browser hydrates against.
 */

import type { GoalEntryRow, GoalMonthTotal, GoalType } from "@/actions/goals";
import { getRecentPaidMonths, shiftPaidMonth } from "@/lib/paid-month";
import {
  GOAL_PACE_MONTHS,
  GOAL_PROJECTION_MAX_MONTHS,
  GOAL_STALE_DAYS,
  GOAL_TREND_MONTHS,
  GOAL_TYPES,
  type GoalView,
} from "@/lib/constants/goals";

// ─── Dates ───────────────────────────────────────────────────────────────────

const MONTHS_LONG = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const MONTHS_SHORT = MONTHS_LONG.map((m) => m.slice(0, 3));

/** "January" … "December", for the month pickers. Index 0 is January. */
export const GOAL_MONTH_NAMES = MONTHS_LONG;

/** "Mar 2025" for a month (1–12) and year. */
export function goalMonthLabel(month: number, year: number): string {
  return `${MONTHS_SHORT[month - 1] ?? "?"} ${year}`;
}

/** "Aug 2027" (or "August 2027") for a `YYYY-MM` key; the key itself when malformed. */
export function ymLabel(ym: string, style: "long" | "short" = "short"): string {
  const m = ym.match(/^(\d{4})-(\d{2})/);
  if (!m) return ym;
  const name = (style === "long" ? MONTHS_LONG : MONTHS_SHORT)[Number(m[2]) - 1];
  return name ? `${name} ${m[1]}` : ym;
}

/** "Nov" (or "November") for a `YYYY-MM` key. */
export function ymMonthName(ym: string, style: "long" | "short" = "short"): string {
  const m = ym.match(/^\d{4}-(\d{2})/);
  const name = m ? (style === "long" ? MONTHS_LONG : MONTHS_SHORT)[Number(m[1]) - 1] : undefined;
  return name ?? ym;
}

/** "Nov 15, 2026" for a `YYYY-MM-DD` key; drops the year when it is `currentYear`. */
export function depositDateLabel(ymd: string, currentYear?: number): string {
  const m = ymd.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return ymd;
  const month = MONTHS_SHORT[Number(m[2]) - 1] ?? "?";
  const day = Number(m[3]);
  return Number(m[1]) === currentYear ? `${month} ${day}` : `${month} ${day}, ${m[1]}`;
}

function daysBetween(fromYmd: string, toYmd: string): number {
  const parse = (s: string) => {
    const [y, m, d] = s.split("-").map(Number);
    return Date.UTC(y, m - 1, d);
  };
  return Math.round((parse(toYmd) - parse(fromYmd)) / 86_400_000);
}

/** "today", "yesterday", "12 days ago", "3 months ago". */
export function daysAgoLabel(days: number): string {
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 45) return `${days} days ago`;
  const months = Math.round(days / 30.44);
  if (months < 18) return `${months} months ago`;
  const years = Math.round(days / 365.25);
  return `${years} years ago`;
}

/** "1 year 7 months", "5 months", "under a month" — how long a reached goal took. */
export function durationLabel(months: number): string {
  if (months <= 0) return "under a month";
  const years = Math.floor(months / 12);
  const rest = months % 12;
  const parts = [
    years > 0 ? `${years} ${years === 1 ? "year" : "years"}` : null,
    rest > 0 ? `${rest} ${rest === 1 ? "month" : "months"}` : null,
  ];
  return parts.filter(Boolean).join(" ");
}

// ─── One goal ────────────────────────────────────────────────────────────────

export function isGoalReached(goal: GoalEntryRow): boolean {
  return goal.date_achieved_month != null && goal.date_achieved_year != null;
}

export function goalTypeLabel(type: GoalType): string {
  return GOAL_TYPES.find((t) => t.value === type)?.label ?? type;
}

export type GoalProgress = {
  goal: GoalEntryRow;
  isReached: boolean;
  hasTarget: boolean;
  /** Share of the target saved, 0–1 (capped); null without a target. */
  ratio: number | null;
  /**
   * "41%": rounded down, so it never reads 100% while something is still short, and
   * "<1%" when a sliver is saved, so the label never says 0% beside a visible ring.
   * Null without a target.
   */
  percentLabel: string | null;
  /** What is left to reach the target, never below 0; null without a target. */
  remaining: number | null;
  /** Saved beyond the target. */
  over: number;
  /** The target is met but the goal is not marked reached yet. */
  isFunded: boolean;
  /** Average saved per month lately, or null with nothing in the window (or today unknown). */
  monthlyPace: number | null;
  /** `YYYY-MM` the target is reached at `monthlyPace`; null when there is nothing to project. */
  projectedMonth: string | null;
  /** The projection is beyond `GOAL_PROJECTION_MAX_MONTHS`. */
  projectionTooFar: boolean;
  /** Days since the last deposit, or null with no deposits (or today unknown). */
  daysSinceLastDeposit: number | null;
  /** In progress, short of the target, and nothing added for `GOAL_STALE_DAYS`. */
  isStalled: boolean;
  /** Added in the current month; null while today is unknown. */
  addedThisMonth: number | null;
  /** Months from setting the goal to reaching it; null while it is in progress. */
  monthsToReach: number | null;
};

function totalsFor(monthly: GoalMonthTotal[]): Map<string, number> {
  return new Map(monthly.map((m) => [m.month, m.total]));
}

/**
 * The better of two averages: the last `GOAL_PACE_MONTHS` complete months, and
 * the same window with the month so far. Both start no earlier than the first
 * deposit, so a goal begun last month is not averaged over months before it
 * existed. Taking the better one means an early-month visit, before the usual
 * deposit lands, does not make the goal look further off than it is.
 */
function monthlyPaceFor(goal: GoalEntryRow, currentYm: string): number | null {
  if (!goal.first_deposit_at) return null;
  const firstYm = goal.first_deposit_at.slice(0, 7);
  const totals = totalsFor(goal.monthly_deposits);
  const average = (months: string[]) => {
    const inRange = months.filter((m) => m >= firstYm);
    if (inRange.length === 0) return 0;
    return inRange.reduce((sum, m) => sum + (totals.get(m) ?? 0), 0) / inRange.length;
  };
  const anchor = new Date(Number(currentYm.slice(0, 4)), Number(currentYm.slice(5, 7)) - 1, 1);
  const withCurrent = getRecentPaidMonths(GOAL_PACE_MONTHS, anchor);
  const previousMonth = new Date(anchor.getFullYear(), anchor.getMonth() - 1, 1);
  const completeOnly = getRecentPaidMonths(GOAL_PACE_MONTHS, previousMonth);
  const pace = Math.max(average(withCurrent), average(completeOnly));
  return pace > 0 ? pace : null;
}

export function summariseGoal(goal: GoalEntryRow, todayYmd: string | null): GoalProgress {
  const isReached = isGoalReached(goal);
  const target = goal.target_amount != null && goal.target_amount > 0 ? goal.target_amount : null;
  const saved = goal.total_deposited;
  const ratio = target ? Math.min(1, saved / target) : null;
  const remaining = target ? Math.max(0, target - saved) : null;
  const isFunded = !isReached && target !== null && saved >= target;

  let percentLabel: string | null = null;
  if (target) {
    if (saved >= target) percentLabel = "100%";
    else {
      const pct = Math.floor((saved / target) * 100);
      percentLabel = saved > 0 && pct < 1 ? "<1%" : `${pct}%`;
    }
  }

  const currentYm = todayYmd ? todayYmd.slice(0, 7) : null;
  const monthlyPace = currentYm && !isReached ? monthlyPaceFor(goal, currentYm) : null;

  let projectedMonth: string | null = null;
  let projectionTooFar = false;
  if (currentYm && monthlyPace && remaining && remaining > 0 && !isReached) {
    const monthsToGo = Math.ceil(remaining / monthlyPace);
    if (monthsToGo > GOAL_PROJECTION_MAX_MONTHS) projectionTooFar = true;
    else projectedMonth = shiftPaidMonth(currentYm, monthsToGo);
  }

  const daysSinceLastDeposit =
    todayYmd && goal.last_deposit_at ? Math.max(0, daysBetween(goal.last_deposit_at, todayYmd)) : null;
  const isStalled =
    !isReached && !isFunded && daysSinceLastDeposit !== null && daysSinceLastDeposit > GOAL_STALE_DAYS;

  const addedThisMonth = currentYm ? (totalsFor(goal.monthly_deposits).get(currentYm) ?? 0) : null;

  const monthsToReach =
    isReached && goal.date_achieved_year != null && goal.date_achieved_month != null
      ? goal.date_achieved_year * 12 +
        goal.date_achieved_month -
        (goal.date_set_year * 12 + goal.date_set_month)
      : null;

  return {
    goal,
    isReached,
    hasTarget: target !== null,
    ratio,
    percentLabel,
    remaining,
    over: target ? Math.max(0, saved - target) : 0,
    isFunded,
    monthlyPace,
    projectedMonth,
    projectionTooFar,
    daysSinceLastDeposit,
    isStalled,
    addedThisMonth,
    monthsToReach,
  };
}

// ─── The list ────────────────────────────────────────────────────────────────

/**
 * In progress: funded goals first (they need a tap to mark them reached), then
 * closest to the finish, then goals without a target by what is saved. Reached
 * goals follow, most recently reached first.
 */
export function compareGoalProgress(a: GoalProgress, b: GoalProgress): number {
  if (a.isReached !== b.isReached) return a.isReached ? 1 : -1;
  if (a.isReached && b.isReached) {
    const rank = (p: GoalProgress) =>
      (p.goal.date_achieved_year ?? 0) * 12 + (p.goal.date_achieved_month ?? 0);
    return rank(b) - rank(a) || a.goal.name.localeCompare(b.goal.name);
  }
  if (a.isFunded !== b.isFunded) return a.isFunded ? -1 : 1;
  if (a.hasTarget !== b.hasTarget) return a.hasTarget ? -1 : 1;
  if (a.hasTarget && b.hasTarget) {
    const diff = (b.ratio ?? 0) - (a.ratio ?? 0);
    if (diff !== 0) return diff;
  } else {
    const diff = b.goal.total_deposited - a.goal.total_deposited;
    if (diff !== 0) return diff;
  }
  return a.goal.name.localeCompare(b.goal.name);
}

export function matchesGoalView(progress: GoalProgress, view: GoalView): boolean {
  if (view === "active") return !progress.isReached;
  if (view === "reached") return progress.isReached;
  return true;
}

export type GoalSection = {
  type: GoalType;
  label: string;
  items: GoalProgress[];
  /** Still to save across the section's in-progress goals with a target. */
  remaining: number;
  /** Saved across every goal in the section. */
  saved: number;
};

/** Goals grouped by horizon, in `GOAL_TYPES` order, sorted within; empty horizons are left out. */
export function buildGoalSections(items: GoalProgress[]): GoalSection[] {
  return GOAL_TYPES.map(({ value, label }) => {
    const inType = items.filter((p) => p.goal.goal_type === value).sort(compareGoalProgress);
    return {
      type: value,
      label,
      items: inType,
      remaining: inType.reduce((sum, p) => sum + (p.isReached ? 0 : (p.remaining ?? 0)), 0),
      saved: inType.reduce((sum, p) => sum + p.goal.total_deposited, 0),
    };
  }).filter((s) => s.items.length > 0);
}

// ─── The overview ────────────────────────────────────────────────────────────

export type GoalsOverview = {
  activeCount: number;
  reachedCount: number;
  /** Saved across goals still in progress, with or without a target. */
  savedInProgress: number;
  /** Targets of in-progress goals that have one. */
  targetTotal: number;
  /** Saved toward those targets, each goal capped at its own target. */
  savedTowardTargets: number;
  /** Share of the targets saved, 0–1; null with no targets. */
  targetRatio: number | null;
  /** Added this month across every goal; null while today is unknown. */
  addedThisMonth: number | null;
  /** The last `GOAL_TREND_MONTHS` months of saving across every goal, oldest first; null while today is unknown. */
  trend: GoalMonthTotal[] | null;
  /** Average of the complete trend months since the first deposit; null without one. */
  averageMonth: number | null;
};

export function summariseGoals(items: GoalProgress[], todayYmd: string | null): GoalsOverview {
  const active = items.filter((p) => !p.isReached);
  const withTarget = active.filter((p) => p.hasTarget);
  const targetTotal = withTarget.reduce((sum, p) => sum + (p.goal.target_amount ?? 0), 0);
  const savedTowardTargets = withTarget.reduce(
    (sum, p) => sum + Math.min(p.goal.total_deposited, p.goal.target_amount ?? 0),
    0
  );

  let trend: GoalMonthTotal[] | null = null;
  let averageMonth: number | null = null;
  if (todayYmd) {
    const anchor = new Date(Number(todayYmd.slice(0, 4)), Number(todayYmd.slice(5, 7)) - 1, 1);
    const months = getRecentPaidMonths(GOAL_TREND_MONTHS, anchor);
    const totals = new Map<string, number>(months.map((m) => [m, 0]));
    let firstYm: string | null = null;
    for (const p of items) {
      const first = p.goal.first_deposit_at?.slice(0, 7) ?? null;
      if (first && (!firstYm || first < firstYm)) firstYm = first;
      for (const m of p.goal.monthly_deposits) {
        if (totals.has(m.month)) totals.set(m.month, (totals.get(m.month) ?? 0) + m.total);
      }
    }
    trend = months.map((month) => ({ month, total: totals.get(month) ?? 0 }));
    // Complete months only: the month so far would drag the average down until it ends.
    const counted = firstYm ? trend.slice(0, -1).filter((t) => t.month >= firstYm!) : [];
    averageMonth =
      counted.length > 0 ? counted.reduce((sum, t) => sum + t.total, 0) / counted.length : null;
  }

  return {
    activeCount: active.length,
    reachedCount: items.length - active.length,
    savedInProgress: active.reduce((sum, p) => sum + p.goal.total_deposited, 0),
    targetTotal,
    savedTowardTargets,
    targetRatio: targetTotal > 0 ? savedTowardTargets / targetTotal : null,
    addedThisMonth: todayYmd ? items.reduce((sum, p) => sum + (p.addedThisMonth ?? 0), 0) : null,
    trend,
    averageMonth,
  };
}
