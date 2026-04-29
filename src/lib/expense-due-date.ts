/**
 * Expense `due_date` is stored as a calendar day that repeats every month (anchor year/month
 * are ignored for display — we normalize new writes to 1970-01-{DD}).
 */

const YMD = /^(\d{4})-(\d{2})-(\d{2})$/;
const YM = /^(\d{4})-(\d{2})$/;

export function parseYmToYearMonth(ym: string): { year: number; month1to12: number } | null {
  const m = YM.exec(ym.trim());
  if (!m) return null;
  const year = Number(m[1]);
  const month1to12 = Number(m[2]);
  if (month1to12 < 1 || month1to12 > 12) return null;
  return { year, month1to12 };
}

/** Day-of-month (1–31) from any stored YYYY-MM-DD due_date. */
export function getDueDayOfMonthFromYmd(dueYmd: string): number | null {
  const part = dueYmd.split("T")[0] ?? "";
  const m = YMD.exec(part);
  if (!m) return null;
  const day = Number(m[3]);
  if (day < 1 || day > 31) return null;
  const probe = new Date(1970, 0, day);
  if (probe.getMonth() !== 0 || probe.getDate() !== day) return null;
  return day;
}

function lastDayOfMonth(year: number, month1to12: number): number {
  return new Date(year, month1to12, 0).getDate();
}

/**
 * The bill’s due date in the given paid month (YYYY-MM), using only the day-of-month from
 * `dueYmd`, clamped to the last day of that month (e.g. 31 → Apr 30).
 */
export function effectiveDueDateInPaidMonth(
  dueYmd: string | null | undefined,
  paidMonthYm: string
): Date | null {
  if (!dueYmd?.trim()) return null;
  const day = getDueDayOfMonthFromYmd(dueYmd.trim());
  const ym = parseYmToYearMonth(paidMonthYm);
  if (!day || !ym) return null;
  const cap = lastDayOfMonth(ym.year, ym.month1to12);
  const d = Math.min(day, cap);
  return new Date(ym.year, ym.month1to12 - 1, d);
}

/** For `<input type="date">` (local calendar date). */
export function formatYmdLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Persist due dates as `1970-01-DD` so only the day-of-month is meaningful (monthly repeat).
 */
export function normalizeDueDateForStorage(pickerYmd: string): string | null {
  const day = getDueDayOfMonthFromYmd(pickerYmd);
  if (!day) return null;
  return `1970-01-${String(day).padStart(2, "0")}`;
}

/**
 * Returns candidate due dates for a bill, respecting its billing_period:
 * - monthly (default): checks prev/curr/next month (same as getCandidateDueDates)
 * - quarterly: checks prev/curr/next calendar quarter start (Jan/Apr/Jul/Oct)
 * - yearly: checks prev/curr/next year at the bill's specific due_month
 */
export function getCandidateDueDatesForBill(
  bill: { due_date: string; billing_period?: string | null; due_month?: number | null },
  referenceDate: Date
): Date[] {
  const day = getDueDayOfMonthFromYmd(bill.due_date);
  if (!day) return [];

  const ref = new Date(referenceDate);
  const refYear = ref.getFullYear();
  const refMonth0 = ref.getMonth();

  if (bill.billing_period === "yearly") {
    const month0 = Math.max(0, Math.min(11, (bill.due_month ?? 1) - 1));
    const candidates: Date[] = [];
    for (const y of [refYear - 1, refYear, refYear + 1]) {
      const lastDay = lastDayOfMonth(y, month0 + 1);
      candidates.push(new Date(y, month0, Math.min(day, lastDay)));
    }
    return candidates;
  }

  if (bill.billing_period === "quarterly") {
    // Calendar quarters: Q1=Jan(0), Q2=Apr(3), Q3=Jul(6), Q4=Oct(9)
    const qStart0 = Math.floor(refMonth0 / 3) * 3;
    const candidates: Date[] = [];
    for (let i = -1; i <= 1; i++) {
      let qMonth0 = qStart0 + i * 3;
      let y = refYear;
      if (qMonth0 < 0) { qMonth0 += 12; y--; }
      if (qMonth0 >= 12) { qMonth0 -= 12; y++; }
      const lastDay = lastDayOfMonth(y, qMonth0 + 1);
      candidates.push(new Date(y, qMonth0, Math.min(day, lastDay)));
    }
    return candidates;
  }

  return getCandidateDueDates(bill.due_date, referenceDate);
}

/**
 * Returns candidate "actual" due dates for a repeating monthly expense with day `dueDay`.
 * Checks the current month, the month before, and the month after to ensure reminders
 * that cross month boundaries are caught (e.g., a 3-day reminder for the 1st of next month).
 */
export function getCandidateDueDates(dueYmd: string, referenceDate: Date): Date[] {
  const day = getDueDayOfMonthFromYmd(dueYmd);
  if (!day) return [];

  const candidates: Date[] = [];
  const ref = new Date(referenceDate);
  const year = ref.getFullYear();
  const month = ref.getMonth(); // 0-indexed

  // Check last month, this month, and next month
  for (let i = -1; i <= 1; i++) {
    const d = new Date(year, month + i, 1);
    const y = d.getFullYear();
    const m = d.getMonth() + 1; // 1-indexed for lastDayOfMonth
    const safeDay = Math.min(day, lastDayOfMonth(y, m));
    candidates.push(new Date(y, m - 1, safeDay));
  }

  return candidates;
}

export function formatReminderDateList(
  dueYmd: string | undefined,
  days: number[] | undefined,
  formatDate: (input: Date | string) => string,
  paidMonthYm: string
): string {
  if (!dueYmd || !days?.length) return "—";
  const due = effectiveDueDateInPaidMonth(dueYmd, paidMonthYm);
  if (!due) return "—";
  return [...days]
    .sort((a, b) => b - a)
    .map((n) => {
      const dt = new Date(due);
      dt.setDate(dt.getDate() - n);
      return formatDate(dt);
    })
    .join(", ");
}
