import { NextResponse } from "next/server";
import { confirmSettingsCode } from "@/lib/auth/two-factor-server";
import { getUserFromBearer } from "@/lib/supabase/bearer";

/**
 * Mobile app: checks the settings code and turns two-step verification on or off.
 * Bearer-authenticated; body: `{ purpose: "enable" | "disable", code }`.
 */
export async function POST(request: Request) {
  const user = await getUserFromBearer(request);
  if (!user) return NextResponse.json({ error: "Not signed in.", restart: true }, { status: 401 });

  const body = (await request.json().catch(() => null)) as { purpose?: unknown; code?: unknown } | null;
  const result = await confirmSettingsCode(user, body?.purpose, body?.code);
  return NextResponse.json(result, { status: "error" in result ? 400 : 200 });
}
