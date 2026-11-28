/**
 * Number and money formatting shared by the web app and the mobile app (`mobile/`).
 *
 * Everything under `src/lib/shared/` is bundled by both Next.js and Metro, so it must
 * stay dependency-free (type-only imports are fine) and use relative imports only —
 * inside `mobile/`, `@/` points at `mobile/src`, not here.
 */

export type NumberGroupingId = "comma" | "dot";

export type NumberFormatPrefs = {
  currency: string;
  numberGrouping: NumberGroupingId;
  language: "en" | "fil";
};

export const DEFAULT_NUMBER_FORMAT_PREFS: NumberFormatPrefs = {
  currency: "PHP",
  numberGrouping: "comma",
  language: "en",
};

function numberFormatLocale(grouping: NumberGroupingId): string {
  return grouping === "dot" ? "de-DE" : "en-US";
}

export function formatNumberWithPreferences(
  n: number,
  prefs: Pick<NumberFormatPrefs, "numberGrouping" | "language">
): string {
  const locale =
    prefs.language === "fil"
      ? prefs.numberGrouping === "dot"
        ? "de-DE"
        : "fil-PH"
      : numberFormatLocale(prefs.numberGrouping);
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(n);
}

export function formatCurrencyWithPreferences(
  amount: number,
  prefs: NumberFormatPrefs
): string {
  const locale =
    prefs.language === "fil"
      ? prefs.numberGrouping === "dot"
        ? "de-DE"
        : "fil-PH"
      : numberFormatLocale(prefs.numberGrouping);
  const hasFractional = !Number.isInteger(Math.round(amount * 100) / 100);
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: prefs.currency,
    minimumFractionDigits: hasFractional ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

/** "1st", "2nd", "3rd", "11th", "22nd" — a day of the month, or any count, in words people say. */
export function ordinal(n: number): string {
  const v = n % 100;
  if (v >= 11 && v <= 13) return `${n}th`;
  return `${n}${({ 1: "st", 2: "nd", 3: "rd" } as Record<number, string>)[n % 10] ?? "th"}`;
}

/** A short label for a chart, like "4.9K" or "22K" — no currency symbol, at most one decimal. */
export function formatCompactNumber(n: number): string {
  return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(n);
}

/** Whole-number currency using default app prefs unless `currencyOverride` (ISO 4217) is passed. */
export function formatCurrency(amount: number, currencyOverride?: string): string {
  return formatCurrencyWithPreferences(amount, {
    ...DEFAULT_NUMBER_FORMAT_PREFS,
    currency: currencyOverride ?? DEFAULT_NUMBER_FORMAT_PREFS.currency,
  });
}

/**
 * Round a monetary value to 2 decimal places (cents). Use this whenever a money
 * value is derived in JS (e.g. summing transactions into a balance, or a
 * difference between two amounts) to strip floating-point error like
 * 1234.5599999999999 before it reaches the UI or gets persisted.
 */
export function roundToCents(amount: number): number {
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}
