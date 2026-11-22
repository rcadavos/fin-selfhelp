/**
 * Carrying a monthly bill over to the next month.
 *
 * Whatever is still owed on the bill this month moves into next month's due
 * amount, and this month the bill is marked skipped. The bill's own `amount` is
 * never changed: only the month after the carry-over asks for more.
 */

import type { BillRow } from "@/actions/bills";

/** This month's balance, moved into `toMonth`. The bill is skipped this month. */
export type BillCarryOut = { amount: number; toMonth: string; note: string | null };

/** A balance carried into this month from `fromMonth`, on top of the bill's usual amount. */
export type BillCarryIn = { amount: number; fromMonth: string; note: string | null };

/** Rounds to centavos, so float sums never store or compare as 0.30000000000000004. */
export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

/** What a bill asks for in a month: its usual amount plus anything carried into that month. */
export function billAmountDue(
  bill: Pick<BillRow, "id" | "amount">,
  carriedInByBillId: Record<string, BillCarryIn> | undefined
): number {
  return roundMoney(bill.amount + (carriedInByBillId?.[bill.id]?.amount ?? 0));
}

/**
 * Whether a bill can be carried out of the month it is viewed in, into `toMonth`.
 *
 * Only monthly bills carry over: a quarterly or yearly bill has no "next month" to
 * land in. It needs something still owed, must not be carried already, and must
 * still be running in `toMonth`.
 */
export function canCarryOverBill({
  billingPeriod,
  endDate,
  outstanding,
  isCarriedOut,
  toMonth,
}: {
  billingPeriod: BillRow["billing_period"];
  endDate: BillRow["end_date"];
  outstanding: number;
  isCarriedOut: boolean;
  toMonth: string | null;
}): boolean {
  if (billingPeriod !== "monthly" || isCarriedOut || !toMonth) return false;
  if (roundMoney(outstanding) <= 0) return false;
  const endYm = endDate?.slice(0, 7);
  return !endYm || endYm >= toMonth;
}
