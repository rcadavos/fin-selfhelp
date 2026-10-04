import { NextResponse } from "next/server";
import { notifyAdminOfNewUser } from "@/lib/admin-new-user-alert";
import { getUserFromBearer } from "@/lib/supabase/bearer";

/**
 * The mobile app's stand-in for the side effects in `/auth/callback`.
 *
 * The app finishes Google and magic-link sign-ins itself (the code comes back to it
 * by deep link), so a phone signup never passes through that route. The app calls
 * this one with the new session's access token after every sign-in instead.
 *
 * Only the new-signup alert carries over. The welcome email and the referral claim
 * are driven by carriers (`welcome_email_pending`, the referral cookie) that only the
 * web's email signup sets, and that flow always confirms through `/auth/callback`.
 */
export async function POST(request: Request) {
  const user = await getUserFromBearer(request);
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  // Deduped per account in the database, so calling it on every sign-in is safe.
  if (user.email) {
    await notifyAdminOfNewUser({
      userId: user.id,
      email: user.email,
      name: user.user_metadata?.full_name as string | undefined,
      provider: user.app_metadata?.provider,
      signedUpAt: user.created_at ? new Date(user.created_at) : undefined,
    });
  }

  return new NextResponse(null, { status: 204 });
}
