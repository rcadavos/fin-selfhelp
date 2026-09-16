/**
 * Internal admin alerts — operational emails about the app itself (new signups
 * and the like), sent to the team rather than to users. These are not user mail:
 * they carry no unsubscribe footer and are never part of a broadcast.
 */

/** Default inbox for admin alerts when `ADMIN_ALERT_EMAILS` is unset. */
export const DEFAULT_ADMIN_ALERT_EMAIL = "rgcadavos@gmail.com";

/** Timezone the app reports local times in (matches the reminder release window). */
export const ADMIN_ALERT_TIME_ZONE = "Asia/Manila";

/**
 * Who receives admin alerts. Set `ADMIN_ALERT_EMAILS` to a comma-separated list
 * to send to more than one inbox, or to route alerts somewhere else entirely;
 * falls back to {@link DEFAULT_ADMIN_ALERT_EMAIL}.
 */
export function getAdminAlertRecipients(): string[] {
  const configured = (process.env.ADMIN_ALERT_EMAILS ?? "")
    .split(",")
    .map((address) => address.trim())
    .filter((address) => address.includes("@"));

  return configured.length > 0 ? configured : [DEFAULT_ADMIN_ALERT_EMAIL];
}
