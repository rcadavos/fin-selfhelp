import { createServiceRoleClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = createServiceRoleClient();

    const [usersResult, billsResult, paymentsResult, goalsResult] = await Promise.all([
      supabase.from("profiles").select("*", { count: "exact", head: true }),
      supabase.from("expense_entries").select("*", { count: "exact", head: true }),
      supabase.from("expense_payments").select("*", { count: "exact", head: true }),
      supabase.from("goal_entries").select("*", { count: "exact", head: true }),
    ]);

    return NextResponse.json({
      users: usersResult.count ?? 0,
      billsTracked: billsResult.count ?? 0,
      paymentsMade: paymentsResult.count ?? 0,
      goalsSet: goalsResult.count ?? 0,
    });
  } catch {
    return NextResponse.json(
      { users: 0, billsTracked: 0, paymentsMade: 0, goalsSet: 0 },
      { status: 500 }
    );
  }
}
