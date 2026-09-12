/**
 * Derivations behind the Planned Expenses board.
 *
 * The board answers "what lands when, and can I cover it?", so rows are bucketed
 * by urgency rather than by billing period: a quarterly bill due in August IS part
 * of August. Everything here is pure — the board and its panels read the same
 * derived rows, so a subtotal can never disagree with the list above it.
 */

import type { BillRow } from "@/actions/bills";
import {
  getDueDayOfMonthFromYmd,
  effectiveDueDateInPaidMonth,
  parseYmToYearMonth,
} from "@/lib/expense-due-date";
import { DUE_SOON_DAYS } from "@/lib/constants/planned-expenses";

export type PlannedExpenseStatus =
  | "paid"
  | "partial"
  | "failed"
  | "overdue"
  | "due"
  | "scheduled";

export type UrgencyBucket = "overdue" | "week" | "later" | "settled";

export type PlannedExpenseRow = {
  bill: BillRow;
  /** Effective due date inside the viewed month, or null when the bill has none. */
  due: Date | null;
  amountPaid: number;
  /** Still owed on this bill this month. 0 once fully paid. */
  outstanding: number;
  status: PlannedExpenseStatus;
  bucket: UrgencyBucket;
  /** Whole days from today: negative is late, 0 is today. Null when there is no due date. */
  daysFromToday: number | null;
};

export type PlannedExpenseGroup = {
  bucket: UrgencyBucket;
  rows: PlannedExpenseRow[];
  /** Sum of what is still owed, except for `settled` which sums what was paid. */
  subtotal: number;
};

export type PlannedExpenseSummary = {
  /** Every bill in the month, at full amount. */
  total: number;
  /** Actually paid so far this month, including partial payments. */
  settledAmount: number;
  /** total - settledAmount, floored at 0. */
  remaining: number;
  /** Bills with no outstanding balance left. */
  settledCount: number;
  totalCount: number;
  /** Paid so far on bills that are only partly settled — drives the meter's second band. */
  partialAmount: number;
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * The date a bill actually falls due inside `paidMonthYm`.
 *
 * Yearly bills land in their stored `due_month`; quarterly bills land in the first
 * month of the viewed quarter; monthly bills land in the viewed month. The day is
 * clamped to the length of the target month so "the 31st" still resolves in February.
 */
export function effectiveBillDueDate(
  bill: BillRow,
  today: Date,
  paidMonthYm: string
): Date | null {
  const dueDay = getDueDayOfMonthFromYmd(bill.due_date);
  if (!dueDay) return null;
  const ym = parseYmToYearMonth(paidMonthYm);

  if (bill.billing_period === "yearly") {
    const dueMonth1 = bill.due_month ?? 1;
    const year = ym?.year ?? today.getFullYear();
    const lastDay = new Date(year, dueMonth1, 0).getDate();
    return new Date(year, dueMonth1 - 1, Math.min(dueDay, lastDay));
  }

  if (bill.billing_period === "quarterly") {
    const qStartMonth = ym
      ? Math.floor((ym.month1to12 - 1) / 3) * 3
      : Math.floor(today.getMonth() / 3) * 3;
    const year = ym?.year ?? today.getFullYear();
    const lastDay = new Date(year, qStartMonth + 1, 0).getDate();
    return new Date(year, qStartMonth, Math.min(dueDay, lastDay));
  }

  return effectiveDueDateInPaidMonth(bill.due_date, paidMonthYm);
}

function daysBetween(from: Date, to: Date): number {
  const a = new Date(from.getFullYear(), from.getMonth(), from.getDate()).getTime();
  const b = new Date(to.getFullYear(), to.getMonth(), to.getDate()).getTime();
  return Math.round((b - a) / MS_PER_DAY);
}

export type BuildRowsInput = {
  bills: BillRow[];
  paymentAmountByBillId: Record<string, number>;
  failedBillIds: Set<string>;
  paidMonth: string;
  today?: Date;
};

/**
 * Turns raw bills + this month's payment rows into the board's row model.
 *
 * A bill is only "settled" once nothing is outstanding — a partial payment leaves
 * it in whichever urgency bucket its due date puts it, because it still needs you.
 */
export function buildPlannedExpenseRows({
  bills,
  paymentAmountByBillId,
  failedBillIds,
  paidMonth,
  today = startOfToday(),
}: BuildRowsInput): PlannedExpenseRow[] {
  const horizon = new Date(today);
  horizon.setDate(horizon.getDate() + DUE_SOON_DAYS);

  const rows = bills.map((bill): PlannedExpenseRow => {
    const amountPaid = Number(paymentAmountByBillId[bill.id] ?? 0);
    const outstanding = Math.max(0, bill.amount - amountPaid);
    const isSettled = amountPaid > 0 && outstanding <= 0;
    const isPartial = amountPaid > 0 && !isSettled;
    const hasAnyPayment = amountPaid > 0;
    const isFailed = !hasAnyPayment && failedBillIds.has(bill.id);
    const due = effectiveBillDueDate(bill, today, paidMonth);
    const daysFromToday = due ? daysBetween(today, due) : null;

    const status: PlannedExpenseStatus = isSettled
      ? "paid"
      : isFailed
        ? "failed"
        : isPartial
          ? "partial"
          : due && due < today
            ? "overdue"
            : due && due <= horizon
              ? "due"
              : "scheduled";

    const bucket: UrgencyBucket = isSettled
      ? "settled"
      : isFailed || (due && due < today)
        ? "overdue"
        : due && due <= horizon
          ? "week"
          : "later";

    return { bill, due, amountPaid, outstanding, status, bucket, daysFromToday };
  });

  // Soonest first inside a bucket; bills with no due date sink to the bottom.
  return rows.sort((a, b) => {
    const at = a.due?.getTime() ?? Number.POSITIVE_INFINITY;
    const bt = b.due?.getTime() ?? Number.POSITIVE_INFINITY;
    return at - bt;
  });
}

const BUCKET_ORDER: UrgencyBucket[] = ["overdue", "week", "later", "settled"];

/** Groups rows into the four urgency buckets, dropping any bucket with no rows. */
export function groupPlannedExpenses(rows: PlannedExpenseRow[]): PlannedExpenseGroup[] {
  return BUCKET_ORDER.map((bucket) => {
    const bucketRows = rows.filter((r) => r.bucket === bucket);
    const subtotal = bucketRows.reduce(
      (sum, r) => sum + (bucket === "settled" ? r.amountPaid : r.outstanding),
      0
    );
    return { bucket, rows: bucketRows, subtotal };
  }).filter((g) => g.rows.length > 0);
}

export function summarisePlannedExpenses(rows: PlannedExpenseRow[]): PlannedExpenseSummary {
  let total = 0;
  let settledAmount = 0;
  let settledCount = 0;
  let partialAmount = 0;

  for (const row of rows) {
    total += row.bill.amount;
    settledAmount += row.amountPaid;
    if (row.bucket === "settled") settledCount += 1;
    else partialAmount += row.amountPaid;
  }

  return {
    total,
    settledAmount,
    remaining: Math.max(0, total - settledAmount),
    settledCount,
    totalCount: rows.length,
    partialAmount,
  };
}

export type AccountCoverage = {
  /** Null for the bucket of bills with no account linked. */
  accountId: string | null;
  alias: string;
  color: string | null;
  balance: number;
  /** Still owed from this account this month. */
  due: number;
  /** How far short the balance falls. 0 when covered. */
  shortfall: number;
};

export type CoverageInput = {
  rows: PlannedExpenseRow[];
  accounts: Array<{ id: string; account_alias: string; color: string }>;
  balances: Record<string, number>;
};

/**
 * What each account still owes this month against what it holds.
 *
 * The app already rejects a payment that would overdraw an account, but only once
 * you tap Mark paid — this surfaces the same shortfall days earlier.
 */
export function buildAccountCoverage({
  rows,
  accounts,
  balances,
}: CoverageInput): AccountCoverage[] {
  const dueByAccount = new Map<string | null, number>();
  for (const row of rows) {
    if (row.outstanding <= 0) continue;
    const key = row.bill.account_id ?? null;
    dueByAccount.set(key, (dueByAccount.get(key) ?? 0) + row.outstanding);
  }

  const coverage: AccountCoverage[] = [];
  for (const account of accounts) {
    const due = dueByAccount.get(account.id) ?? 0;
    if (due <= 0) continue;
    const balance = Number(balances[account.id] ?? 0);
    coverage.push({
      accountId: account.id,
      alias: account.account_alias,
      color: account.color,
      balance,
      due,
      shortfall: Math.max(0, due - balance),
    });
  }

  const unlinked = dueByAccount.get(null) ?? 0;
  if (unlinked > 0) {
    coverage.push({
      accountId: null,
      alias: "No account linked",
      color: null,
      balance: 0,
      due: unlinked,
      shortfall: 0, // Nothing to overdraw, so this can never be "short".
    });
  }

  // Shortfalls first — the whole point of the panel is what needs attention.
  return coverage.sort((a, b) => b.shortfall - a.shortfall || b.due - a.due);
}
