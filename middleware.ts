import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { REFERRAL_COOKIE_NAME, REFERRAL_QUERY_PARAM } from "@/lib/constants/referral";
import { rememberReferralCode } from "@/lib/referral-cookie";

export async function middleware(request: NextRequest) {
  // A `?ref=CODE` on any URL is remembered here. Middleware runs ahead of the
  // ISR cache, so this is the only place the statically-served landing page can
  // capture a referral. The `/r/<code>` short link handles itself.
  const refCode = request.nextUrl.searchParams.get(REFERRAL_QUERY_PARAM);
  const existingRef = request.cookies.get(REFERRAL_COOKIE_NAME)?.value;

  // Optimization: Skip session check/refresh for the root path (landing page)
  // which is mostly public and static. The client-side useUser hook handles
  // the UI state once the page loads.
  if (request.nextUrl.pathname === "/") {
    const response = NextResponse.next();
    rememberReferralCode(response, refCode, existingRef);
    return response;
  }

  // updateSession builds and returns its own response, so the referral cookie
  // must be set on that object or it would be discarded.
  const response = await updateSession(request);
  rememberReferralCode(response, refCode, existingRef);
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|opengraph-image|sw\\.js|icon\\.svg|sitemap\\.xml|robots\\.txt|manifest\\.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
