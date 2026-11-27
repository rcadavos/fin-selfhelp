import type { GoalType } from "@/actions/goals";

/**
 * Goal horizons, in the order the page groups them and the form offers them.
 * `hint` is the plain-words line under each choice in the form.
 */
export const GOAL_TYPES: readonly { value: GoalType; label: string; hint: string }[] = [
  { value: "short_term", label: "Short-term", hint: "Within a year" },
  { value: "long_term", label: "Long-term", hint: "A few years away" },
  { value: "lifetime", label: "Lifetime", hint: "Ongoing or far off" },
] as const;

/** The horizon a new goal starts on. */
export const DEFAULT_GOAL_TYPE: GoalType = "short_term";

/** Which goals the page lists. Only offered once there are goals of both kinds. */
export type GoalView = "active" | "reached" | "all";

export const GOAL_VIEWS: readonly { id: GoalView; label: string }[] = [
  { id: "active", label: "In progress" },
  { id: "reached", label: "Reached" },
  { id: "all", label: "All" },
] as const;

/**
 * Months averaged for a goal's saving pace. The pace takes the better of the last
 * this-many complete months and the same window including the month so far, so an
 * early-month visit before the usual deposit does not drag the estimate down.
 */
export const GOAL_PACE_MONTHS = 3;

/** Months of saving shown as bars on the overview panel, this month included. */
export const GOAL_TREND_MONTHS = 6;

/** A goal with nothing added for longer than this many days is flagged as stalled. */
export const GOAL_STALE_DAYS = 60;

/** Projections further out than this many months read "decades away" instead of a date. */
export const GOAL_PROJECTION_MAX_MONTHS = 600;

/** Deposits the detail panel lists before "Show all" takes over. */
export const GOAL_DEPOSITS_PREVIEW = 8;

/** Earliest year the form offers for when a goal was set or reached. */
export const GOAL_MIN_YEAR = 1990;
