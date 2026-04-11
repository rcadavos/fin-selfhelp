import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import {
  formatCurrencyWithPreferences,
  formatNumberWithPreferences,
  getClientPreferenceCache,
} from "@/lib/user-preferences";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency?: string): string {
  const prefs = getClientPreferenceCache();
  return formatCurrencyWithPreferences(amount, {
    ...prefs,
    currency: currency ?? prefs.currency,
  });
}

/** Format number with thousand separators for amount inputs (e.g. 50000 -> "50,000"). */
export function formatAmountWithCommas(value: string | number): string {
  const str = typeof value === "number" ? String(value) : value;
  const digits = str.replace(/\D/g, "");
  if (digits === "") return "";
  const num = Number(digits);
  if (Number.isNaN(num)) return "";
  const prefs = getClientPreferenceCache();
  return formatNumberWithPreferences(num, prefs);
}

/** Parse input value (with commas) to raw digits string for storage. */
export function parseAmountInput(value: string): string {
  return value.replace(/\D/g, "");
}
