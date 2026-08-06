import { NextResponse } from "next/server";
import { REFERRAL_COOKIE_NAME } from "@/lib/constants/referral";
import { normalizeReferralCode, REFERRAL_COOKIE_OPTIONS } from "@/lib/referral-cookie";

/**
 * Referral short link — `/r/AB23CD9F`.
 *
 * Remembers the code in a cookie and sends the visitor on to signup. Attribution
 * itself happens the moment the new account first reaches the server (the auth
 * callback, or `signUp` when email confirmation is disabled), so a friend can
 * take their time signing up and still be credited.
 *
 * An invalid code is not an error worth showing anyone — it just lands on signup.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code: rawCode } = await params;
  const code = normalizeReferralCode(rawCode);
  const { origin } = new URL(request.url);

  const response = NextResponse.redirect(`${origin}/signup`);
  if (code) {
    response.cookies.set(REFERRAL_COOKIE_NAME, code, REFERRAL_COOKIE_OPTIONS);
  }
  return response;
}
