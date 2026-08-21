/**
 * App mode — how much of OmniTrak a user wants to see.
 *
 * "full"  — the whole cashflow app: accounts, expenses, receivables, goals, vehicles.
 * "bills" — planned expenses (bills) and reminders only.
 *
 * The mode lives on `profiles.user_preferences.appMode` (see `src/lib/user-preferences.ts`)
 * and is read through `useAppMode()`. It only hides navigation and blocks routes — it never
 * deletes anything, so switching back to "full" restores every page and its data untouched.
 */

export const APP_MODE_IDS = ["full", "bills"] as const;
export type AppModeId = (typeof APP_MODE_IDS)[number];

export const DEFAULT_APP_MODE: AppModeId = "full";

export function normalizeAppMode(raw: unknown): AppModeId {
  return APP_MODE_IDS.includes(raw as AppModeId) ? (raw as AppModeId) : DEFAULT_APP_MODE;
}

/**
 * Every gateable area of the app. Always-on pages — calculators, Refer & Earn,
 * Review & Feedback, Premium, and everything under /account — are deliberately
 * absent: they are never hidden by a mode.
 */
export const APP_FEATURE_KEYS = [
  "bills",
  "reminders",
  "accounts",
  "expenses",
  "receivables",
  "goals",
  "vehicles",
  "assistant",
  "rentTracker",
  "paymentTracker",
  /** The Add Entry panel (expense / income / adjustment / transfer) and its FABs. */
  "quickAddEntry",
  /** Spend + account-balance stats and the 6-month spending chart on the dashboard. */
  "cashflowStats",
  /** Auto-debit on planned expenses. Owns no route of its own — see FEATURE_ROUTE_PREFIXES. */
  "autoDebit",
] as const;
export type AppFeatureKey = (typeof APP_FEATURE_KEYS)[number];

/** Features each mode switches on. Anything absent is hidden and its routes blocked. */
const MODE_FEATURES: Record<AppModeId, readonly AppFeatureKey[]> = {
  full: APP_FEATURE_KEYS,
  bills: ["bills", "reminders"],
};

export function isFeatureEnabledInMode(mode: AppModeId, feature: AppFeatureKey): boolean {
  return MODE_FEATURES[mode].includes(feature);
}

/**
 * Route prefixes owned by each feature — the single source of truth for hiding nav
 * entries, filtering search results, and redirecting away from a disabled page.
 * Features with no page of their own map to an empty list.
 */
export const FEATURE_ROUTE_PREFIXES: Record<AppFeatureKey, readonly string[]> = {
  bills: ["/dashboard/planned-expenses"],
  reminders: ["/dashboard/to-do", "/dashboard/to-buy"],
  accounts: ["/dashboard/accounts"],
  expenses: ["/dashboard/expenses", "/dashboard/my-expenses"],
  receivables: ["/dashboard/receivables"],
  goals: ["/dashboard/goals"],
  vehicles: ["/dashboard/vehicles", "/dashboard/fuel"],
  assistant: ["/dashboard/assistant"],
  rentTracker: ["/dashboard/rent-tracker"],
  paymentTracker: ["/dashboard/payment-tracker"],
  quickAddEntry: [],
  cashflowStats: [],
  /**
   * Auto-debit on planned expenses: the form toggle, its badges, and the nightly
   * /api/cron/auto-debit run. Off means the stored `bills.is_auto_debit` flag is
   * INERT — never acted on, never rewritten — so it returns exactly as it was when
   * the mode does. Bills whose auto-debit is inert fall back to due-date reminders.
   */
  autoDebit: [],
};

function matchesPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

/** The feature a route belongs to, or `null` for always-on pages. */
export function featureForRoute(pathname: string | null | undefined): AppFeatureKey | null {
  if (!pathname) return null;
  for (const key of APP_FEATURE_KEYS) {
    if (FEATURE_ROUTE_PREFIXES[key].some((prefix) => matchesPrefix(pathname, prefix))) return key;
  }
  return null;
}

/** True when `pathname` belongs to a feature the given mode switches off. */
export function isRouteBlockedInMode(mode: AppModeId, pathname: string | null | undefined): boolean {
  const feature = featureForRoute(pathname);
  return feature ? !isFeatureEnabledInMode(mode, feature) : false;
}

/** Where a blocked route sends the user. */
export const APP_MODE_FALLBACK_ROUTE = "/dashboard";

/** Deep link that opens the Add planned expense dialog on the bills page. */
export const ADD_PLANNED_EXPENSE_ROUTE = "/dashboard/planned-expenses?add=1";
/** Query flag `ADD_PLANNED_EXPENSE_ROUTE` sets, read by the bills board. */
export const ADD_PLANNED_EXPENSE_PARAM = "add";

export type AppModeOption = {
  value: AppModeId;
  label: string;
  tagline: string;
  description: string;
  includes: readonly string[];
};

export const APP_MODE_OPTIONS: readonly AppModeOption[] = [
  {
    value: "full",
    label: "Full cashflow",
    tagline: "Track everything",
    description:
      "The complete app — account balances, day-to-day expenses, money owed to you, savings goals and vehicles, on top of bills and reminders.",
    includes: [
      "Accounts & balances",
      "Expenses",
      "Planned expenses",
      "Receivables",
      "Goals",
      "Vehicles",
      "Reminders",
    ],
  },
  {
    value: "bills",
    label: "Bills & reminders",
    tagline: "Just never miss a payment",
    description:
      "A lighter app focused on what's due. Cashflow tracking stays switched off — nothing is deleted, so you can turn it back on any time.",
    includes: ["Planned expenses", "Reminders", "Due-date alerts"],
  },
];

export function getAppModeOption(mode: AppModeId): AppModeOption {
  return APP_MODE_OPTIONS.find((o) => o.value === mode) ?? APP_MODE_OPTIONS[0];
}
