import { NextResponse } from "next/server";
import { startSignInChallenge } from "@/lib/auth/two-factor-server";
import { getBearerToken } from "@/lib/supabase/bearer";

/**
 * Mobile app: second step of a password sign-in for a two-step account.
 *
 * `Authorization: Bearer <access token>` carries the session the app got from its
 * in-memory password check. That session is revoked and a code is emailed. The
 * response's `challengeId` goes back with the code to `./verify`; the app has no
 * cookies, so it holds it in memory. The web's equivalent is `beginTwoFactorSignIn`.
 */
export async function POST(request: Request) {
  const token = getBearerToken(request);
  if (!token) return NextResponse.json({ error: "Not signed in.", restart: true }, { status: 401 });

  const result = await startSignInChallenge(token);
  return NextResponse.json(result, { status: "error" in result ? 400 : 200 });
}
