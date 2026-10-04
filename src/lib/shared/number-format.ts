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

/** Whole-number currency using default app prefs unless `currencyOverride` (ISO 4217) is passed. */
export function formatCurrency(amount: number, currencyOverride?: string): string {
  return formatCurrencyWithPreferences(amount, {
    ...DEFAULT_NUMBER_FORMAT_PREFS,
    currency: currencyOverride ?? DEFAULT_NUMBER_FORMAT_PREFS.currency,
  });
}
