"use server";

import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { isPushConfigured, sendPushToUser } from "@/lib/push";
import {
  PUSH_ENDPOINT_MAX_CHARS,
  PUSH_KEY_MAX_CHARS,
  PUSH_TEST_BODY,
  PUSH_TEST_KIND,
  PUSH_TEST_TITLE,
  PUSH_USER_AGENT_MAX_CHARS,
} from "@/lib/constants/push-notifications";

/** A browser's push subscription, as `PushSubscription.toJSON()` gives it. */
export type PushSubscriptionInput = {
  endpoint: string;
  p256dh: string;
  auth: string;
  userAgent?: string;
};

const BASE64URL_PATTERN = /^[A-Za-z0-9_-]+=*$/;

function sanitize(input: PushSubscriptionInput): PushSubscriptionInput | null {
  const endpoint = typeof input?.endpoint === "string" ? input.endpoint.trim() : "";
  const p256dh = typeof input?.p256dh === "string" ? input.p256dh.trim() : "";
  const auth = typeof input?.auth === "string" ? input.auth.trim() : "";
  if (!endpoint || endpoint.length > PUSH_ENDPOINT_MAX_CHARS) return null;
  try {
    if (new URL(endpoint).protocol !== "https:") return null;
  } catch {
    return null;
  }
  for (const key of [p256dh, auth]) {
    if (!key || key.length > PUSH_KEY_MAX_CHARS || !BASE64URL_PATTERN.test(key)) return null;
  }
  const userAgent =
    typeof input.userAgent === "string" ? input.userAgent.slice(0, PUSH_USER_AGENT_MAX_CHARS) : undefined;
  return { endpoint, p256dh, auth, userAgent };
}

async function getSignedInUserId(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

async function upsertSubscription(userId: string, sub: PushSubscriptionInput): Promise<{ error?: string }> {
  const { error } = await createServiceRoleClient()
    .from("push_subscriptions")
    .upsert(
      {
        user_id: userId,
        endpoint: sub.endpoint,
        p256dh: sub.p256dh,
        auth: sub.auth,
        user_agent: sub.userAgent ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "endpoint" },
    );
  return error ? { error: error.message } : {};
}

/**
 * Turns push on for this device. The device is claimed for the signed-in user even
 * if someone else turned push on there before: it belongs to whoever is using it now.
 */
export async function savePushSubscription(input: PushSubscriptionInput): Promise<{ error?: string }> {
  if (!isPushConfigured()) return { error: "Push notifications are not set up on the server yet." };
  const userId = await getSignedInUserId();
  if (!userId) return { error: "Not signed in." };
  const sub = sanitize(input);
  if (!sub) return { error: "This browser returned an invalid push subscription." };
  return upsertSubscription(userId, sub);
}

/**
 * Keeps the server's copy of this device's subscription current without claiming it.
 * Run on page load: a browser can renew its subscription on its own, and the old
 * endpoint stops working. `active` is false when the device belongs to another
 * account, so the caller can show push as off for this one.
 */
export async function syncPushSubscription(
  input: PushSubscriptionInput,
): Promise<{ active: boolean; error?: string }> {
  if (!isPushConfigured()) return { active: false };
  const userId = await getSignedInUserId();
  if (!userId) return { active: false };
  const sub = sanitize(input);
  if (!sub) return { active: false };

  const { data: existing, error } = await createServiceRoleClient()
    .from("push_subscriptions")
    .select("user_id")
    .eq("endpoint", sub.endpoint)
    .maybeSingle();
  if (error) return { active: false, error: error.message };
  if (existing && existing.user_id !== userId) return { active: false };

  const saved = await upsertSubscription(userId, sub);
  return saved.error ? { active: false, error: saved.error } : { active: true };
}

/** Turns push off for this device. Only the signed-in user's own row is removed. */
export async function deletePushSubscription(endpoint: string): Promise<{ error?: string }> {
  const userId = await getSignedInUserId();
  if (!userId) return { error: "Not signed in." };
  if (typeof endpoint !== "string" || !endpoint) return {};
  const { error } = await createServiceRoleClient()
    .from("push_subscriptions")
    .delete()
    .eq("user_id", userId)
    .eq("endpoint", endpoint);
  return error ? { error: error.message } : {};
}

/** Sends a sample push to this device only, so the user can see it works. */
export async function sendTestPush(endpoint: string): Promise<{ error?: string }> {
  if (!isPushConfigured()) return { error: "Push notifications are not set up on the server yet." };
  const userId = await getSignedInUserId();
  if (!userId) return { error: "Not signed in." };
  if (typeof endpoint !== "string" || !endpoint) return { error: "Push is not on for this device." };

  const result = await sendPushToUser(createServiceRoleClient(), { userId, endpoint }, [
    { kind: PUSH_TEST_KIND, title: PUSH_TEST_TITLE, body: PUSH_TEST_BODY, dedupeKey: PUSH_TEST_KIND },
  ]);
  if (result.errors.length > 0) return { error: result.errors[0] };
  if (result.removed > 0) return { error: "This device's subscription has expired. Turn push off and on again." };
  if (result.sent === 0) return { error: "Push is not on for this device." };
  return {};
}
