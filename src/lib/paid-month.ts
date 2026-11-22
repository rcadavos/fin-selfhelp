/** Calendar month key for expense "paid this month" (YYYY-MM), local timezone. */
export function getCurrentPaidMonth(d = new Date()): string {
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  return `${y}-${String(m).padStart(2, "0")}`;
}

/** The month `delta` months after `ym` (negative goes back), as YYYY-MM. Null when `ym` is malformed. */
export function shiftPaidMonth(ym: string, delta: number): string | null {
  const m = ym.match(/^(\d{4})-(\d{2})$/);
  if (!m) return null;
  return getCurrentPaidMonth(new Date(Number(m[1]), Number(m[2]) - 1 + delta, 1));
}

/** "November" (or "Nov" with `style: "short"`) for a YYYY-MM key; the key itself when malformed. */
export function paidMonthName(ym: string, style: "long" | "short" = "long"): string {
  const m = ym.match(/^(\d{4})-(\d{2})$/);
  if (!m) return ym;
  return new Date(Number(m[1]), Number(m[2]) - 1, 1).toLocaleDateString("en-PH", { month: style });
}

/** Last `count` months including current, oldest first. */
export function getRecentPaidMonths(count: number, d = new Date()): string[] {
  const out: string[] = [];
  const cursor = new Date(d.getFullYear(), d.getMonth(), 1);
  for (let i = count - 1; i >= 0; i--) {
    const dt = new Date(cursor.getFullYear(), cursor.getMonth() - i, 1);
    out.push(getCurrentPaidMonth(dt));
  }
  return out;
}
