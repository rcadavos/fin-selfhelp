import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

// `roundToCents` lives in shared/ so the account maths the mobile app also bundles can use it.
export { formatCurrency, roundToCents } from "@/lib/shared/number-format"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
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
