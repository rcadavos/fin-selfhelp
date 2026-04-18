import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import {
  DEFAULT_USER_PREFERENCES,
  formatCurrencyWithPreferences,
} from "@/lib/user-preferences"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Whole-number currency using default app prefs unless `currencyOverride` (ISO 4217) is passed. */
export function formatCurrency(amount: number, currencyOverride?: string): string {
  return formatCurrencyWithPreferences(amount, {
    currency: currencyOverride ?? DEFAULT_USER_PREFERENCES.currency,
    numberGrouping: DEFAULT_USER_PREFERENCES.numberGrouping,
    language: DEFAULT_USER_PREFERENCES.language,
  })
}

/** Digit-only storage string → thousands separators for amount fields. */
export function formatAmountWithCommas(rawDigits: string): string {
  const digits = rawDigits.replace(/\D/g, "")
  if (!digits) return ""
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
}

/** Strip non-digits from an amount field value. */
export function parseAmountInput(input: string): string {
  return input.replace(/\D/g, "")
}
