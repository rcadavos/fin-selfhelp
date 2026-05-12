import { NextRequest, NextResponse } from "next/server";
import { verifyUnsubscribeToken } from "@/lib/email-unsubscribe";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { getBaseUrl } from "@/lib/seo";

export async function GET(req: NextRequest) {
  const base = getBaseUrl();
  const uid = req.nextUrl.searchParams.get("uid") ?? "";
  const sig = req.nextUrl.searchParams.get("sig") ?? "";

  const userId = verifyUnsubscribeToken(uid, sig);
  if (!userId) {
    return NextResponse.redirect(`${base}/unsubscribed?error=invalid`);
  }

  try {
    const supabase = createServiceRoleClient();
    const { error } = await supabase
      .from("profiles")
      .update({ email_unsubscribed: true })
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return NextResponse.redirect(`${base}/unsubscribed`);
  } catch {
    return NextResponse.redirect(`${base}/unsubscribed?error=server`);
  }
}
