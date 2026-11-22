/**
 * Dashboard (home page) settings.
 *
 * The dashboard is written for people who are not comfortable with apps: plain
 * words, one obvious button per job. Keep new copy in that voice. Its type uses the
 * same scale as the other pages; bigger text comes from the Aa text-size setting.
 */

/** localStorage key for the hide-amounts toggle. The Accounts pages read the same key. */
export const AMOUNTS_HIDDEN_STORAGE_KEY = "omnitrak-amounts-hidden";

/** What a hidden amount shows in place of the figure. */
export const AMOUNT_MASK = "••••••";

/** Unpaid bills due within this many days get the amber "coming up" pill. */
export const DASHBOARD_DUE_SOON_DAYS = 7;

/** Rows the "Bills to pay" list shows before "See all bills" takes over. */
export const DASHBOARD_BILL_ROWS = {
  full: 6,
  /** Bills mode has no spending card beside the list, so it has room for more. */
  bills: 10,
} as const;

/** Time-of-day greeting, picked on the client from the viewer's local hour. */
export const DASHBOARD_GREETINGS = [
  { beforeHour: 12, text: "Good morning" },
  { beforeHour: 18, text: "Good afternoon" },
  { beforeHour: 24, text: "Good evening" },
] as const;

/** Shown before the client has read the local hour, so SSR and hydration agree. */
export const DASHBOARD_GREETING_FALLBACK = "Hello";
