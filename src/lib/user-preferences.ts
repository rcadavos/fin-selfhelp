/**
 * Preferences: primary store is `profiles.user_preferences` (JSON) when logged in;
 * localStorage mirrors for offline / logged-out formatting.
 */

export const USER_PREFERENCES_STORAGE_KEY = "omnitrak-user-preferences-v1";

export type DateFormatId =
  | "mdy"
  | "dmy"
  | "ymd"
  | "d_MMM_y"
  | "MMMM_D_YYYY"
  | "m-d-y"
  | "d-m-y"
  | "y-m-d"
  | "MMM_d_y"
  | "d_MMMM_y";
export type TimeFormatId = "12h" | "24h";
export type NumberGroupingId = "comma" | "dot";

export type UserPreferences = {
  dateFormat: DateFormatId;
  timeFormat: TimeFormatId;
  currency: string;
  language: "en" | "fil";
  numberGrouping: NumberGroupingId;
  notificationsEnabled: boolean;
  billRemindersEnabled: boolean;
  subscriptionAlertsEnabled: boolean;
};

export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  dateFormat: "mdy",
  timeFormat: "12h",
  currency: "PHP",
  language: "en",
  numberGrouping: "comma",
  notificationsEnabled: true,
  billRemindersEnabled: true,
  subscriptionAlertsEnabled: true,
};

const DATE_FORMAT_SET = new Set<string>([
  "mdy",
  "dmy",
  "ymd",
  "d_MMM_y",
  "MMMM_D_YYYY",
  "m-d-y",
  "d-m-y",
  "y-m-d",
  "MMM_d_y",
  "d_MMMM_y",
]);
const TIME_FORMAT_SET = new Set<string>(["12h", "24h"]);
const NUMBER_GROUPING_SET = new Set<string>(["comma", "dot"]);
const LANGUAGE_SET = new Set<string>(["en", "fil"]);

/** Merge DB or localStorage JSON with defaults; drop invalid keys. */
export function normalizeUserPreferences(raw: unknown): UserPreferences {
  const base: UserPreferences = { ...DEFAULT_USER_PREFERENCES };
  if (!raw || typeof raw !== "object") return base;
  const o = raw as Record<string, unknown>;

  if (typeof o.dateFormat === "string" && DATE_FORMAT_SET.has(o.dateFormat)) {
    base.dateFormat = o.dateFormat as DateFormatId;
  }
  if (typeof o.timeFormat === "string" && TIME_FORMAT_SET.has(o.timeFormat)) {
    base.timeFormat = o.timeFormat as TimeFormatId;
  }
  if (typeof o.numberGrouping === "string" && NUMBER_GROUPING_SET.has(o.numberGrouping)) {
    base.numberGrouping = o.numberGrouping as NumberGroupingId;
  }
  if (typeof o.language === "string" && LANGUAGE_SET.has(o.language)) {
    base.language = o.language as UserPreferences["language"];
  }
  if (typeof o.currency === "string" && /^[A-Z]{3}$/i.test(o.currency)) {
    base.currency = o.currency.toUpperCase();
  }
  if (typeof o.notificationsEnabled === "boolean") base.notificationsEnabled = o.notificationsEnabled;
  if (typeof o.billRemindersEnabled === "boolean") base.billRemindersEnabled = o.billRemindersEnabled;
  if (typeof o.subscriptionAlertsEnabled === "boolean") base.subscriptionAlertsEnabled = o.subscriptionAlertsEnabled;

  return base;
}

let clientPreferenceCache: UserPreferences = { ...DEFAULT_USER_PREFERENCES };

export function setClientPreferenceCache(prefs: UserPreferences): void {
  clientPreferenceCache = { ...prefs };
}

export function getClientPreferenceCache(): UserPreferences {
  return clientPreferenceCache;
}

export function loadUserPreferences(): UserPreferences {
  if (typeof window === "undefined") return { ...DEFAULT_USER_PREFERENCES };
  try {
    const raw = localStorage.getItem(USER_PREFERENCES_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_USER_PREFERENCES };
    const parsed = JSON.parse(raw) as unknown;
    return normalizeUserPreferences(parsed);
  } catch {
    return { ...DEFAULT_USER_PREFERENCES };
  }
}

export function saveUserPreferences(prefs: UserPreferences): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(USER_PREFERENCES_STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // ignore
  }
  setClientPreferenceCache(prefs);
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

export function formatDateWithPreferences(
  input: Date | string,
  prefs: Pick<UserPreferences, "dateFormat" | "language">
): string {
  const d = typeof input === "string" ? new Date(input) : input;
  if (Number.isNaN(d.getTime())) return "—";
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const day = d.getDate();
  const locale = prefs.language === "fil" ? "fil-PH" : "en-PH";
  switch (prefs.dateFormat) {
    case "dmy":
      return `${pad2(day)}/${pad2(m)}/${y}`;
    case "m-d-y":
      return `${pad2(m)}-${pad2(day)}-${y}`;
    case "d-m-y":
      return `${pad2(day)}-${pad2(m)}-${y}`;
    case "ymd":
      return `${y}-${pad2(m)}-${pad2(day)}`;
    case "y-m-d":
      return `${y}/${pad2(m)}/${pad2(day)}`;
    case "d_MMM_y":
      return d.toLocaleDateString(locale, { day: "numeric", month: "short", year: "numeric" });
    case "MMM_d_y":
      return d.toLocaleDateString(locale, { month: "short", day: "numeric", year: "numeric" });
    case "d_MMMM_y":
      return d.toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric" });
    case "MMMM_D_YYYY":
      return d.toLocaleDateString(locale, { month: "long", day: "numeric", year: "numeric" });
    case "mdy":
    default:
      return `${pad2(m)}/${pad2(day)}/${y}`;
  }
}

export function formatTimeWithPreferences(
  input: Date | string,
  prefs: Pick<UserPreferences, "timeFormat" | "language">
): string {
  const d = typeof input === "string" ? new Date(input) : input;
  if (Number.isNaN(d.getTime())) return "—";
  const locale = prefs.language === "fil" ? "fil-PH" : "en-PH";
  if (prefs.timeFormat === "24h") {
    return d.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit", hour12: false });
  }
  return d.toLocaleTimeString(locale, { hour: "numeric", minute: "2-digit", hour12: true });
}

function numberFormatLocale(grouping: NumberGroupingId): string {
  return grouping === "dot" ? "de-DE" : "en-US";
}

export function formatNumberWithPreferences(
  n: number,
  prefs: Pick<UserPreferences, "numberGrouping" | "language">
): string {
  const locale =
    prefs.language === "fil"
      ? prefs.numberGrouping === "dot"
        ? "de-DE"
        : "fil-PH"
      : numberFormatLocale(prefs.numberGrouping);
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(n);
}

export function formatCurrencyWithPreferences(
  amount: number,
  prefs: Pick<UserPreferences, "currency" | "numberGrouping" | "language">
): string {
  const locale =
    prefs.language === "fil"
      ? prefs.numberGrouping === "dot"
        ? "de-DE"
        : "fil-PH"
      : numberFormatLocale(prefs.numberGrouping);
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: prefs.currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export const DATE_FORMAT_OPTIONS: { value: DateFormatId; label: string }[] = [
  { value: "mdy", label: "MM/DD/YYYY (US-style)" },
  { value: "dmy", label: "DD/MM/YYYY" },
  { value: "ymd", label: "YYYY-MM-DD (ISO-style)" },
  { value: "m-d-y", label: "MM-DD-YYYY" },
  { value: "d-m-y", label: "DD-MM-YYYY" },
  { value: "y-m-d", label: "YYYY/MM/DD" },
  { value: "d_MMM_y", label: "DD MMM YYYY (e.g. 11 Apr 2026)" },
  { value: "MMM_d_y", label: "MMM DD, YYYY (e.g. Apr 11, 2026)" },
  { value: "d_MMMM_y", label: "DD MMMM YYYY (e.g. 11 April 2026)" },
  { value: "MMMM_D_YYYY", label: "MMMM D, YYYY (e.g. April 12, 2026)" },
];

export const TIME_FORMAT_OPTIONS: { value: TimeFormatId; label: string }[] = [
  { value: "12h", label: "12-hour (1:30 PM)" },
  { value: "24h", label: "24-hour (13:30)" },
];

export const CURRENCY_OPTIONS: { value: string; label: string }[] = [
  { value: "PHP", label: "PHP — Philippine peso" },
  { value: "USD", label: "USD — US dollar" },
  { value: "EUR", label: "EUR — Euro" },
  { value: "GBP", label: "GBP — British pound" },
  { value: "JPY", label: "JPY — Japanese yen" },
  { value: "SGD", label: "SGD — Singapore dollar" },
  { value: "AUD", label: "AUD — Australian dollar" },
];

export const LANGUAGE_OPTIONS: { value: UserPreferences["language"]; label: string }[] = [
  { value: "en", label: "English" },
  { value: "fil", label: "Filipino (dates / numbers locale)" },
];

export const NUMBER_GROUPING_OPTIONS: { value: NumberGroupingId; label: string; example: string }[] = [
  { value: "comma", label: "Comma thousands (1,000)", example: "1,234" },
  { value: "dot", label: "Dot thousands (1.000)", example: "1.234" },
];
