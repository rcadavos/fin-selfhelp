"use client";

import { formatCurrency } from "@/lib/utils";
import { useCountUp } from "@/hooks/use-count-up";

/**
 * A plain currency figure that counts up from 0 to `value`. For the passbook
 * look (mono figure, muted symbol and cents) use `CountUpAmount` instead.
 */
export function AnimatedAmount({ value, currency, className }: { value: number; currency?: string; className?: string }) {
  const animated = useCountUp(value);
  return <span className={className}>{formatCurrency(animated, currency)}</span>;
}
