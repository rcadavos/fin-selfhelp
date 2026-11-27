/**
 * Schedule times for social posts are picked and shown in Manila time, whatever
 * the admin's own device is set to. Pure, so client components can use it.
 */

import { getLocalDateTimeInTimeZone } from "@/lib/reminder-release-time";
import { getPublicSiteUrl } from "@/lib/seo";
import { SOCIAL_TIME_ZONE, SOCIAL_TIME_ZONE_OFFSET } from "@/lib/constants/social";

/** `YYYY-MM-DD` + `HH:MM` in Manila → ISO timestamp, or null if either is missing or malformed. */
export function manilaToIso(ymd: string, hhmm: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd) || !/^\d{2}:\d{2}$/.test(hhmm)) return null;
  const date = new Date(`${ymd}T${hhmm}:00${SOCIAL_TIME_ZONE_OFFSET}`);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

/** ISO timestamp → its Manila date and time, for filling the composer. */
export function isoToManila(iso: string): { ymd: string; hhmm: string } {
  return getLocalDateTimeInTimeZone(new Date(iso), SOCIAL_TIME_ZONE);
}

/** "Tue, Nov 25 • 7:30 PM" in Manila time. */
export function formatManila(iso: string): string {
  const date = new Date(iso);
  const day = date.toLocaleDateString("en-US", { timeZone: SOCIAL_TIME_ZONE, weekday: "short", month: "short", day: "numeric" });
  const time = date.toLocaleTimeString("en-US", { timeZone: SOCIAL_TIME_ZONE, hour: "numeric", minute: "2-digit" });
  return `${day} • ${time}`;
}

/** "7:30 PM" for a `HH:MM` chip. */
export function formatHhmm(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${suffix}`;
}

/** A path on the live site as a full link for a post (never localhost, even in development). */
export function socialLinkUrl(path: string): string {
  return `${getPublicSiteUrl().replace(/\/+$/, "")}${path === "/" ? "" : path}`;
}

/** Today in Manila plus `days`, as `YYYY-MM-DD`. */
export function manilaYmdFromToday(days = 0): string {
  return getLocalDateTimeInTimeZone(new Date(Date.now() + days * 86_400_000), SOCIAL_TIME_ZONE).ymd;
}
