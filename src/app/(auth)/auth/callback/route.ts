import { createClient } from "@/lib/supabase/server";
import { safeNextPath } from "@/lib/auth/safe-next-path";
import { sendWelcomeEmail } from "@/lib/email";
import { claimPendingReferral } from "@/actions/referrals";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeNextPath(searchParams.get("next"));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.user_metadata?.welcome_email_pending && user.email) {
        const name = user.user_metadata?.full_name as string | undefined;
        // Clear the flag first to prevent duplicate sends on re-visits.
        supabase.auth.updateUser({ data: { welcome_email_pending: null } }).catch(() => {});
        sendWelcomeEmail({ to: user.email, name }).catch(() => {});
      }

      // Every new account reaches here — email confirmation, magic link, and
      // Google OAuth all land on this callback (OAuth signups never see /setup).
      // Awaited so the cookie clear rides along on this response; the RPC no-ops
      // for returning users, so it is safe on every visit.
      if (user) {
        await claimPendingReferral().catch(() => ({ claimed: false }));
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
