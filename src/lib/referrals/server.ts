/**
 * Referral conversion payout. Deliberately NOT a `"use server"` module.
 *
 * `mark_referral_converted` is a SECURITY DEFINER RPC and this call passes a
 * caller-supplied user id, so exporting it from a `"use server"` module would
 * publish a POST endpoint that pays out a referral for any user id. The only
 * caller is the HMAC-verified PayMongo webhook.
 */
import { createServiceRoleClient } from "@/lib/supabase/server";

/**
 * Called after a successful paid upgrade.
 *
 * The `subscription_payments_referral_conversion` trigger already fires whenever
 * a payment is recorded, so this is a belt-and-braces call for code paths that
 * want the payout to have definitely happened before they return. Idempotent.
 */
export async function markReferralConvertedForUserId(
  userId: string
): Promise<{ error?: string }> {
  try {
    const supabase = createServiceRoleClient();
    const { error } = await supabase.rpc("mark_referral_converted", {
      p_referred_user_id: userId,
    });
    if (error) return { error: error.message };
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to record referral conversion." };
  }
}
