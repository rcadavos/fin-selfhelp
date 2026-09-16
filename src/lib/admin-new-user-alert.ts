import { createServiceRoleClient } from "@/lib/supabase/server";
import { sendNewUserSignupAlertEmail } from "@/lib/email";
import { getAdminAlertRecipients } from "@/lib/constants/admin-alerts";

type NotifyResult = { sent: boolean; reason?: string };

/**
 * Emails the team once when an account is created, and never again for that
 * account.
 *
 * Call it on every authenticated entry point rather than only where a signup is
 * expected: `/auth/callback` is the one place every new account passes through
 * (email confirmation, magic link and Google OAuth all land there), but
 * returning users land there too. Deduping is therefore the caller's protection
 * as well as ours, and it lives in the database: the `profiles.signup_notified_at`
 * claim below is a single conditional UPDATE, so two callbacks racing on the
 * same account can only have one of them win the row.
 *
 * Never throws — a failed alert must not break a sign-in.
 */
export async function notifyAdminOfNewUser(params: {
  userId: string;
  email: string;
  name?: string | null;
  provider?: string | null;
  signedUpAt?: Date;
}): Promise<NotifyResult> {
  if (!params.email?.includes("@")) return { sent: false, reason: "no email" };

  try {
    const admin = createServiceRoleClient();

    // Claim the alert. Only the caller that flips null → now() sends, so a
    // re-visited callback and a second concurrent request both no-op here.
    const { data: claimed, error: claimError } = await admin
      .from("profiles")
      .update({ signup_notified_at: new Date().toISOString() })
      .eq("user_id", params.userId)
      .is("signup_notified_at", null)
      .select("user_id")
      .maybeSingle();

    if (claimError) return { sent: false, reason: claimError.message };
    if (!claimed) return { sent: false, reason: "already notified" };

    const { count } = await admin
      .from("profiles")
      .select("user_id", { count: "exact", head: true });

    const result = await sendNewUserSignupAlertEmail({
      to: getAdminAlertRecipients(),
      userEmail: params.email,
      name: params.name,
      provider: params.provider,
      signedUpAt: params.signedUpAt,
      totalUsers: count ?? null,
    });

    if (!result.ok) {
      // Release the claim so the next sign-in retries rather than losing the
      // alert to a transient Resend failure.
      await admin
        .from("profiles")
        .update({ signup_notified_at: null })
        .eq("user_id", params.userId);
      return { sent: false, reason: result.error };
    }

    return { sent: true };
  } catch (err) {
    return { sent: false, reason: err instanceof Error ? err.message : String(err) };
  }
}
