/** Time-of-day helpers for reminders. `HH:MM` strings are 24-hour local time. */

const HHMM_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function isHhmm(value: string | null | undefined): value is string {
  return !!value && HHMM_RE.test(value);
}

/** Minutes since midnight, or null for a missing or malformed time. */
export function minutesOfHhmm(value: string | null | undefined): number | null {
  const m = value ? HHMM_RE.exec(value.slice(0, 5)) : null;
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}

export function hhmmFromMinutes(minutes: number): string {
  const m = ((Math.round(minutes) % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

/** "15:00" → "3:00 PM". Formatted by hand so server and client always agree. */
export function formatTimeLabel(value: string | null | undefined): string {
  const minutes = minutesOfHhmm(value);
  if (minutes === null) return "";
  const h = Math.floor(minutes / 60);
  const mm = String(minutes % 60).padStart(2, "0");
  return `${h % 12 === 0 ? 12 : h % 12}:${mm} ${h < 12 ? "AM" : "PM"}`;
}

/** "in 1h 20m", "in 5m", "now" — how long until a time later today. */
export function formatTimeUntil(minutesFromNow: number): string {
  if (minutesFromNow <= 0) return "now";
  const h = Math.floor(minutesFromNow / 60);
  const m = minutesFromNow % 60;
  return `in ${[h ? `${h}h` : "", m ? `${m}m` : ""].filter(Boolean).join(" ")}`;
}
