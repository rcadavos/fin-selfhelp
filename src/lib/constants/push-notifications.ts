/**
 * Web push for the PWA. The public key is inlined into the client bundle at build
 * time; the private half (VAPID_PRIVATE_KEY) stays on the server.
 */
export const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim() ?? "";

/** Contact the push services can reach us at if our pushes misbehave. */
export const VAPID_DEFAULT_SUBJECT = "mailto:info@omnitrak.cloud";

/** The app's service worker. It also handles `push` and `notificationclick`. */
export const SERVICE_WORKER_PATH = "/sw.js";
export const SERVICE_WORKER_SCOPE = "/";

/** Icon on every push. The service worker falls back to the same file. */
export const PUSH_NOTIFICATION_ICON = "/favicon.png";

/**
 * How long a push service holds a push for a device that is offline. A morning
 * reminder is stale by evening, so it is dropped rather than delivered late.
 */
export const PUSH_TTL_SECONDS = 12 * 60 * 60;

/**
 * Up to this many reminders in one run are pushed one by one. Beyond it they fold
 * into a single summary, so a busy day is one buzz instead of a stack of them.
 */
export const PUSH_MAX_SEPARATE_NOTIFICATIONS = 3;

/** Where tapping a push opens, by `user_notifications.kind`. */
export const PUSH_URL_BY_KIND: Record<string, string> = {
  expense_reminder: "/dashboard/bills",
  todo_target_date: "/dashboard/to-do",
};

/** Where a push opens when its kind has no page of its own, and for the summary push. */
export const PUSH_DEFAULT_URL = "/account/notifications";

/** `kind` and `tag` of the push sent by "Send a test". */
export const PUSH_TEST_KIND = "push_test";
export const PUSH_TEST_TITLE = "Push notifications are on";
export const PUSH_TEST_BODY = "This is how OmniTrak reminders will look on this device.";

/** Longest sign-out waits for this device's push to be switched off before going ahead anyway. */
export const PUSH_SIGN_OUT_TIMEOUT_MS = 1500;

/** Push service responses that mean the subscription is gone for good. */
export const PUSH_GONE_STATUS_CODES = [404, 410];

/** Longest endpoint and key strings accepted from a browser. Real ones are far shorter. */
export const PUSH_ENDPOINT_MAX_CHARS = 2048;
export const PUSH_KEY_MAX_CHARS = 256;
export const PUSH_USER_AGENT_MAX_CHARS = 512;
