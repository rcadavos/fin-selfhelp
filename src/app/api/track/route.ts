import { createServiceRoleClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const path = new URL(req.url).searchParams.get("path") ?? "/";
    const supabase = createServiceRoleClient();
    await supabase.from("page_views").insert({ path });
  } catch {
    // silently fail — never block the visitor
  }
  return new NextResponse(null, { status: 204 });
}
