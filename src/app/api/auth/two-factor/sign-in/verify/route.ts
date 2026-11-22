import { NextResponse } from "next/server";
import { verifySignInChallenge } from "@/lib/auth/two-factor-server";

/**
 * Mobile app: checks the emailed sign-in code. Body: `{ challengeId, code }`.
 * On success returns `{ tokenHash }`, which the app redeems with
 * `supabase.auth.verifyOtp({ type: "magiclink", token_hash })` for its session.
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { challengeId?: unknown; code?: unknown } | null;
  const result = await verifySignInChallenge(body?.challengeId, body?.code);
  return NextResponse.json(result, { status: "error" in result ? 400 : 200 });
}
