/** Calendar month key for expense "paid this month" (YYYY-MM), local timezone. */
export function getCurrentPaidMonth(d = new Date()): string {
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  return `${y}-${String(m).padStart(2, "0")}`;
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
