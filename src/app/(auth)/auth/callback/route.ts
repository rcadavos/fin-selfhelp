import { createClient } from "@/lib/supabase/server";
import { safeNextPath } from "@/lib/auth/safe-next-path";
import { sendWelcomeEmail } from "@/lib/email";
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
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
