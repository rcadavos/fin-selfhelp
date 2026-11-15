"use client";

import { Amount } from "@/components/passbook/amount";
import { useCountUp } from "@/hooks/use-count-up";

/**
 * A passbook `<Amount>` that counts up from 0 to `value` once it shows, then
 * tweens to each new value. Use it for headline totals and stat cells — list
 * rows keep the static `<Amount>`, where a column of moving numbers is noise.
 */
export function CountUpAmount({
  value,
  currency,
  className,
}: {
  value: number;
  currency?: string;
  className?: string;
}) {
  const shown = useCountUp(value);
  return <Amount value={shown} currency={currency} className={className} />;
}
