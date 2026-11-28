/**
 * An entry counts as "large" at this multiple of the month's average entry.
 * Relative rather than a fixed peso figure so it adapts to how the user actually
 * spends — three times your own average is notable whatever your average is.
 */
export const LARGE_ENTRY_MULTIPLE = 3;

/** Days listed before the rest of the month folds behind a "Show earlier" button. */
export const INITIAL_EXPENSE_DAY_GROUPS = 4;

/** A day gets a "× your daily average" note once it costs this many times the average. */
export const BUSY_DAY_MULTIPLE = 1.5;

/** Days into the month before the daily average is steady enough to compare a day against. */
export const BUSY_DAY_MIN_ELAPSED_DAYS = 3;

/** Account filter values that are not an account id. */
export const EXPENSE_ACCOUNT_FILTER = {
  all: "all",
  /** Entries saved without an account. */
  none: "none",
} as const;
