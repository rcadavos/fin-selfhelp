/**
 * One bill's own history, for its page: every month something happened in (a
 * payment, a carry-over), grouped by year, and the last year as a run of months
 * that shows the gaps too. Everything here is pure.
 */

import type { BillCarryOverHistoryRow, BillPaymentHistoryRow, BillRow } from "@/actions/bills";
import { getDueDayOfMonthFromYmd } from "@/lib/expense-due-date";
import { shiftPaidMonth } from "@/lib/paid-month";
import { roundMoney } from "@/lib/planned-expenses/carry-over";
import { ordinal } from "@/lib/shared/number-format";

/**
 * When a bill falls due, in words: "15th of every month", "15th of Jan, Apr, Jul
 * and Oct" or "Mar 15, every year". Null when it has no due day.
 */
export function billDueLabel(bill: Pick<BillRow, "due_date" | "billing_period" | "due_month">): string | null {
  const day = getDueDayOfMonthFromYmd(bill.due_date);
  if (!day) return null;
  if (bill.billing_period === "yearly") {
    const month = new Date(2000, (bill.due_month ?? 1) - 1, 1).toLocaleDateString("en-PH", { month: "short" });
    return `${month} ${day}, every year`;
  }
  if (bill.billing_period === "quarterly") return `${ordinal(day)} of Jan, Apr, Jul and Oct`;
  return `${ordinal(day)} of every month`;
}

/** How a month in the history ended up. Only months where something happened are listed. */
export type BillMonthStatus = "paid" | "partial" | "carried";

export type BillHistoryMonth = {
  /** YYYY-MM. */
  month: string;
  payment: BillPaymentHistoryRow | null;
  /** That month's balance, carried into the next one. The month's payments are locked while it stands. */
  carryOut: BillCarryOverHistoryRow | null;
  /** A balance carried into that month from the one before. */
  carryIn: BillCarryOverHistoryRow | null;
  /** What the bill asked for that month: its amount today, plus anything carried in. */
  due: number;
  paid: number;
  status: BillMonthStatus;
};

export type BillHistoryYear = {
  year: string;
  months: BillHistoryMonth[];
  /** Everything paid in the year's listed months. */
  paid: number;
};

/**
 * Payments and carry-overs merged into one list, newest month first. A month shows
 * up once something happened in it: a payment, or a balance carried out of it.
 * Carry-ins only annotate a month already listed; they don't add one of their own.
 */
export function buildBillHistoryMonths(
  payments: BillPaymentHistoryRow[],
  carryOvers: BillCarryOverHistoryRow[],
  billAmount: number,
): BillHistoryMonth[] {
  const byMonth = new Map<string, Omit<BillHistoryMonth, "due" | "paid" | "status">>();
  const entry = (month: string) => {
    const existing = byMonth.get(month);
    if (existing) return existing;
    const created = { month, payment: null, carryOut: null, carryIn: null };
    byMonth.set(month, created);
    return created;
  };
  for (const p of payments) entry(p.paid_month).payment = p;
  for (const c of carryOvers) entry(c.from_month).carryOut = c;
  for (const c of carryOvers) {
    const month = byMonth.get(c.to_month);
    if (month) month.carryIn = c;
  }

  return Array.from(byMonth.values())
    .map((m): BillHistoryMonth => {
      const due = roundMoney(billAmount + (m.carryIn?.amount ?? 0));
      const paid = m.payment?.amount ?? 0;
      const status: BillMonthStatus = m.carryOut ? "carried" : paid >= due ? "paid" : "partial";
      return { ...m, due, paid, status };
    })
    .sort((a, b) => b.month.localeCompare(a.month));
}

/** The history by calendar year, newest first, each with what was paid in it. */
export function groupBillHistoryByYear(months: BillHistoryMonth[]): BillHistoryYear[] {
  const years: BillHistoryYear[] = [];
  for (const m of months) {
    const year = m.month.slice(0, 4);
    let group = years[years.length - 1];
    if (!group || group.year !== year) {
      group = { year, months: [], paid: 0 };
      years.push(group);
    }
    group.months.push(m);
    group.paid = roundMoney(group.paid + m.paid);
  }
  return years;
}

/**
 * A month in the run of bars. On top of the history's own states:
 * `missed` — a monthly bill's past month with nothing paid or carried;
 * `open` — this month, with nothing paid yet;
 * `none` — before the bill existed, after it ended, or a month a quarterly or
 * yearly bill may simply not fall in (so it is never called missed).
 */
export type BillRecordStatus = BillMonthStatus | "missed" | "open" | "none";

export type BillRecordMonth = {
  month: string;
  status: BillRecordStatus;
  paid: number;
  due: number;
  /** Paid over due, 0 to 1: how full the month's bar is. */
  share: number;
};

/** The last `count` months up to `currentMonth`, oldest first, gaps included. */
export function buildBillRecord(
  bill: Pick<BillRow, "amount" | "billing_period" | "created_at" | "end_date">,
  history: BillHistoryMonth[],
  currentMonth: string,
  count: number,
): BillRecordMonth[] {
  const since = bill.created_at.slice(0, 7);
  const until = bill.end_date?.slice(0, 7) ?? null;
  const byMonth = new Map(history.map((h) => [h.month, h]));
  const record: BillRecordMonth[] = [];

  for (let back = count - 1; back >= 0; back--) {
    const month = shiftPaidMonth(currentMonth, -back);
    if (!month) continue;
    const h = byMonth.get(month);
    if (h) {
      const share = h.status === "carried" ? 0 : h.due > 0 ? Math.min(1, h.paid / h.due) : 1;
      record.push({ month, status: h.status, paid: h.paid, due: h.due, share });
      continue;
    }
    const running = month >= since && (!until || month <= until);
    const status: BillRecordStatus = !running
      ? "none"
      : month === currentMonth
        ? "open"
        : bill.billing_period === "monthly"
          ? "missed"
          : "none";
    record.push({ month, status, paid: 0, due: bill.amount, share: 0 });
  }
  return record;
}

export type BillHistorySummary = {
  /** Paid in months of `year`. */
  paidInYear: number;
  year: string;
  /** Mean of the recorded payments, or null with none. */
  averagePayment: number | null;
  /** Months in the run paid in full… */
  paidInFull: number;
  /**
   * …out of the months in it the bill asked for something. This month only counts
   * once it is settled (paid in full or carried over): until then it is still open.
   */
  monthsDue: number;
};

export function summariseBillHistory(
  history: BillHistoryMonth[],
  record: BillRecordMonth[],
  currentMonth: string,
): BillHistorySummary {
  const year = currentMonth.slice(0, 4);
  const payments = history.filter((h) => h.payment);
  const total = payments.reduce((sum, h) => sum + h.paid, 0);
  const counted = record.filter(
    (r) =>
      r.status !== "none" &&
      (r.month !== currentMonth || r.status === "paid" || r.status === "carried"),
  );
  return {
    year,
    paidInYear: roundMoney(
      history.filter((h) => h.month.startsWith(`${year}-`)).reduce((sum, h) => sum + h.paid, 0),
    ),
    averagePayment: payments.length > 0 ? roundMoney(total / payments.length) : null,
    paidInFull: counted.filter((r) => r.status === "paid").length,
    monthsDue: counted.length,
  };
}

/** "Nov 2", or "Nov 2, 2025" outside `currentYear`. */
export function paidDateLabel(iso: string, currentYear?: number): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    ...(currentYear !== undefined && d.getFullYear() === currentYear ? {} : { year: "numeric" }),
  });
}
