import { sendNotification, WebPushError, type RequestOptions } from "web-push";
import type { createServiceRoleClient } from "@/lib/supabase/server";
import {
  PUSH_DEFAULT_URL,
  PUSH_GONE_STATUS_CODES,
  PUSH_MAX_SEPARATE_NOTIFICATIONS,
  PUSH_NOTIFICATION_ICON,
  PUSH_TTL_SECONDS,
  PUSH_URL_BY_KIND,
  VAPID_DEFAULT_SUBJECT,
  VAPID_PUBLIC_KEY,
} from "@/lib/constants/push-notifications";

/**
 * Server-side web push. Callers pass a service-role client: `push_subscriptions`
 * has no RLS policies, and the cron that sends reminders has no user session.
 */

type ServiceClient = ReturnType<typeof createServiceRoleClient>;

/** One notification to push — the same title and body as its `user_notifications` row. */
export type PushNotificationInput = {
  kind: string;
  title: string;
  body: string;
  /** The row's dedupe key. Reused as the push `tag`, so a re-send replaces rather than stacks. */
  dedupeKey: string;
};

/** What the service worker's `push` handler reads (public/sw.js). */
type PushPayload = {
  title: string;
  body: string;
  url: string;
  tag: string;
  icon: string;
};

export type PushSendResult = {
  sent: number;
  /** Subscriptions deleted because their push service said they are gone. */
  removed: number;
  errors: string[];
};

/** VAPID details, or null when the keys are not set — push is then switched off, not an error. */
function getVapidDetails(): RequestOptions["vapidDetails"] | null {
  const privateKey = process.env.VAPID_PRIVATE_KEY?.trim();
  if (!VAPID_PUBLIC_KEY || !privateKey) return null;
  return {
    subject: process.env.VAPID_SUBJECT?.trim() || VAPID_DEFAULT_SUBJECT,
    publicKey: VAPID_PUBLIC_KEY,
    privateKey,
  };
}

export function isPushConfigured(): boolean {
  return getVapidDetails() !== null;
}

function buildPayloads(items: PushNotificationInput[]): PushPayload[] {
  if (items.length <= PUSH_MAX_SEPARATE_NOTIFICATIONS) {
    return items.map((item) => ({
      title: item.title,
      body: item.body,
      url: PUSH_URL_BY_KIND[item.kind] ?? PUSH_DEFAULT_URL,
      tag: item.dedupeKey,
      icon: PUSH_NOTIFICATION_ICON,
    }));
  }
  const shown = items.slice(0, PUSH_MAX_SEPARATE_NOTIFICATIONS).map((item) => item.title);
  const more = items.length - shown.length;
  return [
    {
      title: `${items.length} reminders today`,
      body: [...shown, `+${more} more`].join(" • "),
      url: PUSH_DEFAULT_URL,
      tag: "reminders-summary",
      icon: PUSH_NOTIFICATION_ICON,
    },
  ];
}

/**
 * Pushes `items` to every device the user turned push on for — or, with `endpoint`,
 * to that one device only. Never throws: failures come back in `errors`, and a
 * subscription the push service reports as gone is deleted.
 */
export async function sendPushToUser(
  supabase: ServiceClient,
  target: { userId: string; endpoint?: string },
  items: PushNotificationInput[],
): Promise<PushSendResult> {
  const result: PushSendResult = { sent: 0, removed: 0, errors: [] };
  if (items.length === 0) return result;

  const vapidDetails = getVapidDetails();
  if (!vapidDetails) return result;

  let query = supabase
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("user_id", target.userId);
  if (target.endpoint) query = query.eq("endpoint", target.endpoint);

  const { data: subscriptions, error } = await query;
  if (error) {
    result.errors.push(error.message);
    return result;
  }
  if (!subscriptions?.length) return result;

  const payloads = buildPayloads(items);
  const goneIds: string[] = [];

  await Promise.all(
    subscriptions.map(async (sub) => {
      for (const payload of payloads) {
        try {
          await sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            JSON.stringify(payload),
            { vapidDetails, TTL: PUSH_TTL_SECONDS, urgency: "normal" },
          );
          result.sent += 1;
        } catch (err) {
          if (err instanceof WebPushError && PUSH_GONE_STATUS_CODES.includes(err.statusCode)) {
            goneIds.push(sub.id);
            return;
          }
          result.errors.push(err instanceof Error ? err.message : "Push send failed");
        }
      }
    }),
  );

  if (goneIds.length > 0) {
    const { error: deleteError } = await supabase.from("push_subscriptions").delete().in("id", goneIds);
    if (deleteError) result.errors.push(deleteError.message);
    else result.removed = goneIds.length;
  }

  return result;
}
