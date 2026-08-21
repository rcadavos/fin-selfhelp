/**
 * Post-payment grant side effects. Deliberately NOT a `"use server"` module.
 *
 * These functions take a `userId` and use the service-role client, so RLS does
 * not constrain them. Exported from a `"use server"` module they would each be a
 * registered Server Action — a public POST endpoint letting any caller grant a
 * subscription to, or write a receipt for, an arbitrary user id. Keeping them
 * here means the only way in is trusted server code that has already
 * established which user was actually paid for:
 *   - src/app/api/webhooks/paymongo/route.ts (HMAC-verified)
 *   - src/actions/paymongo.ts checkPayMongoPaymentStatus (session-guarded)
 */
import { revalidatePath } from "next/cache";
import { createServiceRoleClient } from "@/lib/supabase/server";

/** Grant 1 month of Pro or Premium to a user by auth user_id, extending any period still running. */
export async function recordSubscriptionPaymentForUserId(
  userId: string,
  tier: "pro" | "premium" = "pro"
): Promise<{ error?: string }> {
  const supabase = createServiceRoleClient();
  const { data: profile, error: fetchError } = await supabase
    .from("profiles")
    .select("id, subscription_ends_at")
    .eq("user_id", userId)
    .maybeSingle();
  if (fetchError) return { error: fetchError.message };
  if (!profile) return { error: "Profile not found." };
  const now = new Date();
  const currentEnd = profile.subscription_ends_at ? new Date(profile.subscription_ends_at) : null;
  const startFrom = currentEnd != null && currentEnd > now ? currentEnd : now;
  const newEndsAt = new Date(startFrom);
  newEndsAt.setUTCMonth(newEndsAt.getUTCMonth() + 1);
  const { error } = await supabase
    .from("profiles")
    .update({
      is_subscriber: true,
      subscription_tier: tier,
      subscription_ends_at: newEndsAt.toISOString(),
    })
    .eq("id", profile.id);
  if (error) return { error: error.message };
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/expenses");
  revalidatePath("/account/subscription");
  revalidatePath("/");
  return {};
}

/**
 * Record a payment for receipts. Returns `inserted: false` when the
 * `payment_intent_id` has already been recorded, so callers can treat a webhook
 * replay as a no-op instead of granting a second month.
 */
export async function saveSubscriptionPaymentReceipt(
  userId: string,
  params: {
    amountCents: number;
    currency: string;
    description?: string | null;
    paymentIntentId?: string | null;
    paidAt?: Date;
  }
): Promise<{ inserted: boolean; error?: string }> {
  const supabase = createServiceRoleClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();
  if (!profile) return { inserted: false, error: "Profile not found." };

  // Replay guard: migration 093 adds a unique index on payment_intent_id, so a
  // repeated webhook delivery conflicts here instead of stacking another month.
  const { data, error } = await supabase
    .from("subscription_payments")
    .upsert(
      {
        profile_id: profile.id,
        amount_cents: params.amountCents,
        currency: params.currency,
        description: params.description?.trim() || null,
        payment_intent_id: params.paymentIntentId || null,
        paid_at: (params.paidAt ?? new Date()).toISOString(),
      },
      { onConflict: "payment_intent_id", ignoreDuplicates: true }
    )
    .select("id");
  if (error) return { inserted: false, error: error.message };
  return { inserted: (data?.length ?? 0) > 0 };
}
