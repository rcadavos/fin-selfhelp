import { createServiceRoleClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = createServiceRoleClient();

    const [usersResult, goalsResult, buyItemsResult, doItemsResult] = await Promise.all([
      supabase.from("profiles").select("*", { count: "exact", head: true }),
      supabase.from("goal_entries").select("*", { count: "exact", head: true }),
      supabase.from("to_buy_items").select("*", { count: "exact", head: true }),
      supabase.from("to_do_items").select("*", { count: "exact", head: true }),
    ]);

    return NextResponse.json({
      users: usersResult.count ?? 0,
      goalsSet: goalsResult.count ?? 0,
      listItems: (buyItemsResult.count ?? 0) + (doItemsResult.count ?? 0),
    });
  } catch {
    return NextResponse.json(
      { users: 0, goalsSet: 0, listItems: 0 },
      { status: 500 }
    );
  }
}
