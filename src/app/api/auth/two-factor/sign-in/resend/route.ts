import { NextResponse } from "next/server";
import { resendSignInChallenge } from "@/lib/auth/two-factor-server";

/** Mobile app: emails a new code for a pending sign-in. Body: `{ challengeId }`. */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { challengeId?: unknown } | null;
  const result = await resendSignInChallenge(body?.challengeId);
  return NextResponse.json(result, { status: "error" in result ? 400 : 200 });
}
