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
  timeZone = REMINDER_TIME_ZONE
): boolean {
  return getClockHourInTimeZone(date, timeZone) >= releaseHour24;
}

/** The timezone reminder dates and times are read in. */
export const REMINDER_TIME_ZONE = "Asia/Manila";

/**
 * The calendar date (`YYYY-MM-DD`) and wall-clock time (`HH:MM`) in `timeZone`.
 * Reminder times are local, and the server runs in UTC, where before 8 AM in Manila
 * it is still the previous day.
 */
export function getLocalDateTimeInTimeZone(
  date: Date,
  timeZone = REMINDER_TIME_ZONE
): { ymd: string; hhmm: string } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone,
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? "00";
  return { ymd: `${get("year")}-${get("month")}-${get("day")}`, hhmm: `${get("hour")}:${get("minute")}` };
}
