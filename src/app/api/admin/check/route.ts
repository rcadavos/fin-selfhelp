import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

/** GET /api/admin/check — returns why you can or can't access /admin. Remove in production if desired. */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({
      ok: false,
      reason: "not_logged_in",
      message: "You are not logged in. Log in first, then try /admin again.",
    });
  }

  let admin;
  try {
    admin = createServiceRoleClient();
  } catch (e) {
    return NextResponse.json({
      ok: false,
      reason: "config_error",
      message: "SUPABASE_SERVICE_ROLE_KEY is not set. Add it to .env.local (Supabase Dashboard → Settings → API).",
    });
  }
  const { data: profile, error } = await admin
    .from("profiles")
    .select("id, is_admin")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({
      ok: false,
      reason: "profile_error",
      message: "Could not load your profile.",
      error: error.message,
      hint: "Make sure migration 006_admin.sql has been applied (profiles.is_admin column exists).",
    });
  }

  if (!profile) {
    return NextResponse.json({
      ok: false,
      reason: "no_profile",
      message: "You have no profile row. This can happen if you signed up before the profile trigger existed.",
      user_id: user.id,
    });
  }

  if (!profile.is_admin) {
    return NextResponse.json({
      ok: false,
      reason: "not_admin",
      message: "Your account is not an admin. Run this in Supabase SQL Editor:",
      sql: `update public.profiles set is_admin = true where user_id = '${user.id}';`,
    });
  }

  return NextResponse.json({
    ok: true,
    reason: "admin",
    message: "You should be able to access /admin.",
  });
}
