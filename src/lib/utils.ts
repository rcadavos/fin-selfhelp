import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export { formatCurrency } from "@/lib/shared/number-format"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Round a monetary value to 2 decimal places (cents). Use this whenever a money
 * value is derived in JS (e.g. summing transactions into a balance, or a
 * difference between two amounts) to strip floating-point error like
 * 1234.5599999999999 before it reaches the UI or gets persisted.
 */
export function roundToCents(amount: number): number {
  return Math.round((amount + Number.EPSILON) * 100) / 100
}


export function formatAmountWithCommas(raw: string): string {
  if (!raw) return ""
  const [intPart, decPart] = raw.split(".")
  const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
  return decPart !== undefined ? formattedInt + "." + decPart : formattedInt
}

export function parseAmountInput(input: string): string {
  const cleaned = input.replace(/[^\d.]/g, "")
  const parts = cleaned.split(".")
  if (parts.length === 1) return parts[0]
  return parts[0] + "." + parts.slice(1).join("")
}
