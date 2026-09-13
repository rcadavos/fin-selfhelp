import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { recordSubscriptionPaymentForUserId } from "@/lib/billing/grant";

/**
 * Grants the birth-month Pro perk: one free month of Pro per year, during the
 * user's own birth month.
 *
 * Runs daily rather than monthly so a user who sets their birth month partway
 * through that month still gets it, and so a failed day self-heals on the next
 * run. Re-running the same day is a no-op.
 *
 * Idempotency comes from the unique (profile_id, grant_year) index on
 * birthday_pro_grants, not from the read below: the ledger row is inserted
 * FIRST, and only a successful insert proceeds to grant. A duplicate insert
 * fails, and that user is skipped — so two overlapping runs cannot both grant.
 */
export const dynamic = "force-dynamic";

/** Manila is UTC+8; the perk should follow the user's calendar, not UTC's. */
const MANILA_OFFSET_MS = 8 * 60 * 60 * 1000;

function manilaNow(now: Date): Date {
  return new Date(now.getTime() + MANILA_OFFSET_MS);
}

type ProfileRow = {
  id: string;
  user_id: string;
  birth_month: number | null;
};

export async function GET(request: Request) {
  try {
    const bearer = request.headers.get("authorization");
    const expected = process.env.CRON_SECRET?.trim();
    if (!expected || bearer !== `Bearer ${expected}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const local = manilaNow(new Date());
    const month = local.getUTCMonth() + 1; // 1-12, already shifted to Manila
    const year = local.getUTCFullYear();

    const supabase = createServiceRoleClient();

    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, user_id, birth_month")
      .eq("birth_month", month);

    if (profilesError) {
      return NextResponse.json({ error: profilesError.message }, { status: 500 });
    }

    const candidates = (profiles ?? []) as ProfileRow[];
    const errors: string[] = [];
    let granted = 0;
    let alreadyGranted = 0;

    for (const profile of candidates) {
      // Claim the year first. A duplicate key here means another run (or an
      // earlier day this month) already granted it, so skip without granting.
      const { error: claimError } = await supabase.from("birthday_pro_grants").insert({
        profile_id: profile.id,
        grant_year: year,
        birth_month: month,
      });

      if (claimError) {
        // 23505 = unique_violation: already claimed for this year, as expected.
        if (claimError.code === "23505") {
          alreadyGranted += 1;
          continue;
        }
        errors.push(`${profile.id}: ${claimError.message}`);
        continue;
      }

      const { error: grantError } = await recordSubscriptionPaymentForUserId(profile.user_id, "pro");

      if (grantError) {
        // Release the claim so the next daily run retries instead of the user
        // silently losing the perk for the whole year.
        await supabase
          .from("birthday_pro_grants")
          .delete()
          .eq("profile_id", profile.id)
          .eq("grant_year", year);
        errors.push(`${profile.id}: ${grantError}`);
        continue;
      }

      granted += 1;
    }

    return NextResponse.json({
      ok: errors.length === 0,
      month,
      year,
      candidates: candidates.length,
      granted,
      alreadyGranted,
      ...(errors.length ? { errors } : {}),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
