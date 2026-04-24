import { createServiceRoleClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = createServiceRoleClient();

    const [usersResult, subscribersResult, pageViewsResult] = await Promise.all([
      supabase.from("profiles").select("*", { count: "exact", head: true }),
      supabase.from("profiles").select("*", { count: "exact", head: true }).eq("is_subscriber", true),
      supabase.from("page_views").select("*", { count: "exact", head: true }),
    ]);

    return NextResponse.json({
      users: usersResult.count ?? 0,
      subscribers: subscribersResult.count ?? 0,
      pageVisitors: pageViewsResult.count ?? 0,
    });
  } catch {
    return NextResponse.json(
      { users: 0, subscribers: 0, pageVisitors: 0 },
      { status: 500 }
    );
  }
}
