/**
 * Derivations behind the Bills board.
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
import { DUE_SOON_DAYS, SETTLED_AFTER_DAYS } from "@/lib/constants/planned-expenses";
import {
  billAmountDue,
  roundMoney,
  type BillCarryIn,
  type BillCarryOut,
} from "@/lib/planned-expenses/carry-over";

export type PlannedExpenseStatus =
  | "paid"
  | "partial"
  | "failed"
  | "overdue"
  | "due"
  | "scheduled"
  /** Skipped this month: its balance was carried over into next month. */
  | "carried";

export type UrgencyBucket = "overdue" | "week" | "later" | "recent" | "carried" | "settled";

/** Both buckets hold bills with nothing outstanding — they differ only in age. */
export function isFullyPaidBucket(bucket: UrgencyBucket): boolean {
  return bucket === "recent" || bucket === "settled";
}

/**
 * Nothing left to do on it this month: paid in full, or carried over to next month.
 * A carried bill is not paid, so it stays out of `isFullyPaidBucket` and the Paid tab.
 */
export function isClosedBucket(bucket: UrgencyBucket): boolean {
  return isFullyPaidBucket(bucket) || bucket === "carried";
}

/** The ledger's filter tabs: everything, what still needs paying, what is done. */
export type LedgerFilter = "all" | "unpaid" | "paid";

/** Carried-over bills are neither still to pay nor paid, so only "All" lists them. */
export function matchesLedgerFilter(row: PlannedExpenseRow, filter: LedgerFilter): boolean {
  if (filter === "all") return true;
  return filter === "paid" ? isFullyPaidBucket(row.bucket) : !isClosedBucket(row.bucket);
}

/**
 * What a row adds to the month's total. A carried-over bill only keeps what was
 * paid on it this month — the rest now belongs to next month's total.
 */
export function monthShareOf(row: PlannedExpenseRow): number {
  return row.carryOut ? row.amountPaid : row.amountDue;
}

/**
 * A day's own state, from the bills falling on it — the most urgent one wins, so
 * a day holding one overdue bill and two settled ones still reads as overdue.
 * "All paid" is the exception worth showing positively rather than as an absence.
 */
export type DayStatus = "paid" | "overdue" | "partial" | "due" | "scheduled";

export function dayStatusFor(rows: PlannedExpenseRow[]): DayStatus {
  if (rows.every((r) => r.status === "paid")) return "paid";
  if (rows.some((r) => r.status === "overdue" || r.status === "failed")) return "overdue";
  if (rows.some((r) => r.status === "partial")) return "partial";
  if (rows.some((r) => r.status === "due")) return "due";
  return "scheduled";
}

/**
 * Bills keyed by the day of the month they fall due. Bills with no due date are left
 * out, and so are bills carried over to next month: they no longer land on that day.
 */
export function rowsByDueDay(rows: PlannedExpenseRow[]): Map<number, PlannedExpenseRow[]> {
  const byDay = new Map<number, PlannedExpenseRow[]>();
  for (const row of rows) {
    if (!row.due || row.carryOut) continue;
    const day = row.due.getDate();
    byDay.set(day, [...(byDay.get(day) ?? []), row]);
  }
  return byDay;
}

export type CategorySpend = {
  categoryId: string;
  /** Every bill in the category this month, at its full amount for the month (see `monthShareOf`). */
  total: number;
  /** Paid so far this month, partial payments included. */
  paid: number;
  count: number;
};

/** This month's bills per category, largest total first. */
export function summariseByCategory(rows: PlannedExpenseRow[]): CategorySpend[] {
  const map = new Map<string, CategorySpend>();
  for (const row of rows) {
    const categoryId = row.bill.category_id;
    const entry = map.get(categoryId) ?? { categoryId, total: 0, paid: 0, count: 0 };
    entry.total += monthShareOf(row);
    entry.paid += row.amountPaid;
    entry.count += 1;
    map.set(categoryId, entry);
  }
  return Array.from(map.values()).sort((a, b) => b.total - a.total);
}

export type PlannedExpenseRow = {
  bill: BillRow;
  /** Effective due date inside the viewed month, or null when the bill has none. */
  due: Date | null;
  /** What the bill asks for this month: its own amount plus anything carried in from last month. */
  amountDue: number;
  /** A balance carried into this month from last month, or null. Already part of `amountDue`. */
  carriedIn: BillCarryIn | null;
  /** This month's balance carried into next month, or null. When set the bill is skipped this month. */
  carryOut: BillCarryOut | null;
  amountPaid: number;
  /** Still owed on this bill this month. 0 once fully paid or carried over. */
  outstanding: number;
  status: PlannedExpenseStatus;
  bucket: UrgencyBucket;
  /** When this month's payment was recorded, or null when nothing is paid yet. */
  paidAt: Date | null;
  /** Whole days from today: negative is late, 0 is today. Null when there is no due date. */
  daysFromToday: number | null;
};

export type PlannedExpenseGroup = {
  bucket: UrgencyBucket;
  rows: PlannedExpenseRow[];
  /** Sum of what is still owed, except for the paid buckets which sum what was paid. */
  subtotal: number;
};

export type PlannedExpenseSummary = {
  /** Every bill in the month, at its full amount for the month (see `monthShareOf`). */
  total: number;
  /** Actually paid so far this month, including partial payments. */
  settledAmount: number;
  /** total - settledAmount, floored at 0. */
  remaining: number;
  /** Bills with nothing left to do this month: paid in full or carried over. */
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
  /** ISO timestamps of this month's payments, by bill id. Missing => treated as long settled. */
  paidAtByBillId?: Record<string, string>;
  failedBillIds: Set<string>;
  /** Balances carried into this month, by bill id. Added to the bill's amount. */
  carriedInByBillId?: Record<string, BillCarryIn>;
  /** This month's balances carried into next month, by bill id. Those bills are skipped. */
  carriedOutByBillId?: Record<string, BillCarryOut>;
  paidMonth: string;
  today?: Date;
};

/**
 * Turns raw bills + this month's payment rows into the board's row model.
 *
 * A bill is only fully paid once nothing is outstanding — a partial payment leaves
 * it in whichever urgency bucket its due date puts it, because it still needs you.
 * A fully paid bill then sits in `recent` for SETTLED_AFTER_DAYS before dropping into
 * the collapsed `settled` section, so today's payment stays where you can see it.
 *
 * A bill carried over to next month is skipped here whatever was paid on it: it
 * owes nothing more this month and sits in its own `carried` bucket. A bill with a
 * balance carried in asks for its amount plus that balance.
 */
export function buildPlannedExpenseRows({
  bills,
  paymentAmountByBillId,
  paidAtByBillId = {},
  failedBillIds,
  carriedInByBillId = {},
  carriedOutByBillId = {},
  paidMonth,
  today = startOfToday(),
}: BuildRowsInput): PlannedExpenseRow[] {
  const horizon = new Date(today);
  horizon.setDate(horizon.getDate() + DUE_SOON_DAYS);

  const rows = bills.map((bill): PlannedExpenseRow => {
    const carriedIn = carriedInByBillId[bill.id] ?? null;
    const carryOut = carriedOutByBillId[bill.id] ?? null;
    const isCarried = carryOut !== null;
    const amountDue = billAmountDue(bill, carriedInByBillId);
    const amountPaid = Number(paymentAmountByBillId[bill.id] ?? 0);
    const outstanding = isCarried ? 0 : Math.max(0, roundMoney(amountDue - amountPaid));
    const isSettled = !isCarried && amountPaid > 0 && outstanding <= 0;
    const isPartial = !isCarried && amountPaid > 0 && !isSettled;
    const hasAnyPayment = amountPaid > 0;
    const isFailed = !isCarried && !hasAnyPayment && failedBillIds.has(bill.id);
    const due = effectiveBillDueDate(bill, today, paidMonth);
    const daysFromToday = due ? daysBetween(today, due) : null;
    const paidAtIso = hasAnyPayment ? paidAtByBillId[bill.id] : undefined;
    const paidAtParsed = paidAtIso ? new Date(paidAtIso) : null;
    const paidAt = paidAtParsed && !Number.isNaN(paidAtParsed.getTime()) ? paidAtParsed : null;
    const daysSincePaid = paidAt ? daysBetween(paidAt, today) : null;

    const status: PlannedExpenseStatus = isCarried
      ? "carried"
      : isSettled
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

    // A payment with no recorded timestamp is old data — settled, not "just paid".
    const isRecentlyPaid =
      isSettled && daysSincePaid !== null && daysSincePaid < SETTLED_AFTER_DAYS;

    const bucket: UrgencyBucket = isCarried
      ? "carried"
      : isSettled
        ? isRecentlyPaid
          ? "recent"
          : "settled"
        : isFailed || (due && due < today)
          ? "overdue"
          : due && due <= horizon
            ? "week"
            : "later";

    return {
      bill,
      due,
      amountDue,
      carriedIn,
      carryOut,
      amountPaid,
      outstanding,
      status,
      bucket,
      paidAt,
      daysFromToday,
    };
  });

  // Soonest first inside a bucket; bills with no due date sink to the bottom.
  return rows.sort((a, b) => {
    const at = a.due?.getTime() ?? Number.POSITIVE_INFINITY;
    const bt = b.due?.getTime() ?? Number.POSITIVE_INFINITY;
    return at - bt;
  });
}

/**
 * What needs you, soonest first — then what you just dealt with, then the rest.
 * `recent` sits directly after `week` rather than further down: it is the
 * receipt for the action you just took, so it belongs next to the things you
 * are still acting on, not buried below the end of the month. Carried-over bills
 * come after everything still due this month, ahead of the folded-away Settled.
 */
const BUCKET_ORDER: UrgencyBucket[] = ["overdue", "week", "recent", "later", "carried", "settled"];

/**
 * Rows arrive in due-date order, which is what every bucket wants except `recent`.
 * There the due date is already history and what you want is a receipt log: newest
 * payment on top, each one sinking as you pay the next until it leaves for Settled.
 */
function orderRowsInBucket(
  bucket: UrgencyBucket,
  rows: PlannedExpenseRow[]
): PlannedExpenseRow[] {
  if (bucket !== "recent") return rows;
  return [...rows].sort((a, b) => (b.paidAt?.getTime() ?? 0) - (a.paidAt?.getTime() ?? 0));
}

/** What a row adds to its group's subtotal: paid buckets sum what was paid, carried sums what moved on. */
function subtotalShare(bucket: UrgencyBucket, row: PlannedExpenseRow): number {
  if (bucket === "carried") return row.carryOut?.amount ?? 0;
  return isFullyPaidBucket(bucket) ? row.amountPaid : row.outstanding;
}

/** Groups rows into the urgency buckets, dropping any bucket with no rows. */
export function groupPlannedExpenses(rows: PlannedExpenseRow[]): PlannedExpenseGroup[] {
  return BUCKET_ORDER.map((bucket) => {
    const bucketRows = orderRowsInBucket(
      bucket,
      rows.filter((r) => r.bucket === bucket)
    );
    const subtotal = bucketRows.reduce((sum, r) => sum + subtotalShare(bucket, r), 0);
    return { bucket, rows: bucketRows, subtotal };
  }).filter((g) => g.rows.length > 0);
}

export function summarisePlannedExpenses(rows: PlannedExpenseRow[]): PlannedExpenseSummary {
  let total = 0;
  let settledAmount = 0;
  let settledCount = 0;
  let partialAmount = 0;

  for (const row of rows) {
    total += monthShareOf(row);
    settledAmount += row.amountPaid;
    if (isClosedBucket(row.bucket)) settledCount += 1;
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
