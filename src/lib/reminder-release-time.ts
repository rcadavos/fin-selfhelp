/**
 * Bill reminder emails and in-app reminder rows are released once the user's local
 * clock reaches this hour (default 8). OmniTrak targets Philippines users — use
 * Asia/Manila so Vercel UTC cron + server actions align with local morning.
 */

/** Clock hour 0–23 in `timeZone` for `date` (via Intl, not server default TZ). */
export function getClockHourInTimeZone(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    hour12: false,
    timeZone,
  }).formatToParts(date);
  const raw = parts.find((p) => p.type === "hour")?.value;
  const n = raw != null ? Number(raw) : NaN;
  return Number.isFinite(n) ? n : date.getHours();
}

/** True when local time in `timeZone` is at or past `releaseHour24` (e.g. 8 → 8:00 AM). */
export function isReminderReleaseHour(
  date: Date,
  releaseHour24: number,
  timeZone = "Asia/Manila"
): boolean {
  return getClockHourInTimeZone(date, timeZone) >= releaseHour24;
}
