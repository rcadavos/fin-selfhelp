import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { getFacebookConfig } from "@/lib/social/facebook";
import { failStalePublishingPosts, publishSocialPost } from "@/lib/social/posts";
import { SOCIAL_AUTOPUBLISH_SETTING_KEY, SOCIAL_CRON_BATCH_SIZE } from "@/lib/constants/social";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Publishes scheduled Facebook posts whose time has come. Meant to run every 5 to
 * 15 minutes (the send-reminders edge function's `?job=social`), so a post goes
 * out within one interval of its time. A missed run catches up on the next one.
 *
 * Does nothing while Facebook isn't connected or auto-publish is off in
 * /admin/settings; the queue waits.
 */
export async function GET(request: Request) {
  const bearer = request.headers.get("authorization");
  const expected = process.env.CRON_SECRET?.trim();
  if (!expected || bearer !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const admin = createServiceRoleClient();
    const stale = await failStalePublishingPosts(admin);

    if (!getFacebookConfig()) return NextResponse.json({ skipped: "Facebook isn't connected", stale });

    const { data: setting } = await admin
      .from("app_settings")
      .select("value")
      .eq("key", SOCIAL_AUTOPUBLISH_SETTING_KEY)
      .maybeSingle();
    if (setting?.value === false || setting?.value === "false") {
      return NextResponse.json({ skipped: "Auto-publish is off", stale });
    }

    const { data: due, error } = await admin
      .from("social_posts")
      .select("id")
      .eq("status", "scheduled")
      .lte("scheduled_for", new Date().toISOString())
      .order("scheduled_for", { ascending: true })
      .limit(SOCIAL_CRON_BATCH_SIZE);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const results: { id: string; ok: boolean; error?: string }[] = [];
    // One at a time: a Page posting several in the same second looks like spam to Facebook.
    for (const { id } of due ?? []) {
      const result = await publishSocialPost(admin, id, ["scheduled"]);
      results.push(result.ok ? { id, ok: true } : { id, ok: false, error: result.error });
    }

    return NextResponse.json({
      published: results.filter((r) => r.ok).length,
      failed: results.filter((r) => !r.ok).length,
      stale,
      results,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Social posts cron failed" },
      { status: 500 },
    );
  }
}
