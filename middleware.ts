import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { REFERRAL_COOKIE_NAME, REFERRAL_QUERY_PARAM } from "@/lib/constants/referral";
import { rememberReferralCode } from "@/lib/referral-cookie";
import { isProtectedRoute } from "@/lib/constants/protected-routes";

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
  const { response, user } = await updateSession(request);

  // Route gate for the protected trees. This lives here rather than in each
  // layout because only middleware sees the pathname, which is what lets us both
  // carry the intended destination through `?next=` and exempt the token-addressed
  // invite pages (see PUBLIC_ROUTE_EXEMPTIONS) that are sent to people with no account.
  //
  // GET navigation only: Server Actions resolve from the `Next-Action` header, not
  // the URL, so this does not protect them — each action guards its own session.
  if (!user && isProtectedRoute(request.nextUrl.pathname)) {
    const login = new URL("/login", request.url);
    login.searchParams.set("next", request.nextUrl.pathname + request.nextUrl.search);
    const redirect = NextResponse.redirect(login);
    rememberReferralCode(redirect, refCode, existingRef);
    return redirect;
  }

  rememberReferralCode(response, refCode, existingRef);
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|opengraph-image|sw\\.js|icon\\.svg|sitemap\\.xml|robots\\.txt|manifest\\.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
