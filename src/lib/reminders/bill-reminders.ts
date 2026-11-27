import type { SupabaseClient } from "@supabase/supabase-js";
import { getCurrentPaidMonth } from "@/lib/paid-month";

const BILL_REMINDER_KEY = /^bill:([^:]+):(\d{4}-\d{2})-\d{2}:/;

/** One bill reminder per bill, due date and days before it, e.g. `bill:<id>:2026-12-01:d-3`. */
export function billReminderDedupeKey(billId: string, dueYmd: string, reminderDay: number): string {
  return `bill:${billId}:${dueYmd}:d-${reminderDay}`;
}

/** The bill a reminder's dedupe key is for, and the YYYY-MM month of its due date. Null for any other key. */
export function parseBillReminderDedupeKey(key: string): { billId: string; month: string } | null {
  const m = key.match(BILL_REMINDER_KEY);
  return m ? { billId: m[1], month: m[2] } : null;
}

export function billMonthKey(billId: string, month: string): string {
  return `${billId}:${month}`;
}

/** Last month, this month and next: every month a reminder sent on `now` can be for. */
export function reminderMonthsAround(now: Date): string[] {
  return [-1, 0, 1].map((i) => getCurrentPaidMonth(new Date(now.getFullYear(), now.getMonth() + i, 1)));
}

/**
 * The bill months nothing is owed on, as `billMonthKey` values: months with a payment
 * (a part-payment counts; a failed auto-debit row does not) and months the bill was
 * carried over out of. No reminder of any kind goes out for these, and one already
 * sent is hidden.
 */
export async function loadSettledBillMonths(
  supabase: SupabaseClient,
  profileId: string,
  months: string[],
): Promise<Set<string>> {
  const settled = new Set<string>();
  if (months.length === 0) return settled;

  const [{ data: paidRows }, { data: carriedOutRows }] = await Promise.all([
    supabase
      .from("bill_payments")
      .select("bill_id, paid_month")
      .eq("profile_id", profileId)
      .in("paid_month", months)
      .eq("status", "paid"),
    supabase
      .from("bill_carryovers")
      .select("bill_id, from_month")
      .eq("profile_id", profileId)
      .in("from_month", months),
  ]);

  for (const r of paidRows ?? []) settled.add(billMonthKey(String(r.bill_id), String(r.paid_month)));
  for (const r of carriedOutRows ?? []) settled.add(billMonthKey(String(r.bill_id), String(r.from_month)));
  return settled;
}

/** Leaves out bill reminders whose bill month has since been paid or carried over. */
export async function withoutSettledBillReminders<T extends { dedupe_key: string | null }>(
  supabase: SupabaseClient,
  profileId: string,
  rows: T[],
): Promise<T[]> {
  const parsed = rows.map((r) => (r.dedupe_key ? parseBillReminderDedupeKey(r.dedupe_key) : null));
  const months = [...new Set(parsed.flatMap((p) => (p ? [p.month] : [])))];
  if (months.length === 0) return rows;

  const settled = await loadSettledBillMonths(supabase, profileId, months);
  return rows.filter((_, i) => {
    const p = parsed[i];
    return !p || !settled.has(billMonthKey(p.billId, p.month));
  });
}
