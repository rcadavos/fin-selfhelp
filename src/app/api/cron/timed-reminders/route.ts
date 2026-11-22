import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { hasProLevelProductAccess, normalizeDbTier } from "@/lib/subscription-tier";
import { normalizeUserPreferences } from "@/lib/user-preferences";
import { getLocalDateTimeInTimeZone } from "@/lib/reminder-release-time";
import { sendPushToUser } from "@/lib/push";
import { REMINDER_PUSH_GRACE_MINUTES } from "@/lib/constants/reminders";
import {
  TODO_NOTIFICATION_KIND,
  todoReminderDedupeKey,
  todoReminderMessage,
  type ToDoReminderRow,
} from "@/lib/reminders/notify";
import { minutesOfHhmm } from "@/lib/reminders/time";

type DueRow = ToDoReminderRow & { profile_id: string };

type ProfileRow = {
  id: string;
  user_id: string;
  is_subscriber: boolean;
  subscription_ends_at: string | null;
  subscription_tier: string | null;
  user_preferences: unknown;
};

/**
 * Sends reminders that have a time of day, as their time comes. Meant to run every few
 * minutes; reminders without a time still go out with the 8 AM run in reminder-emails.
 *
 * Each run picks up every open reminder due today at or before now, so a missed run
 * catches up on the next one. The in-app row is deduplicated per reminder, day and time,
 * and only rows this run created are pushed, so nothing buzzes twice. A reminder found
 * long after its time still lands in the in-app list, but is not pushed.
 */
export async function GET(request: Request) {
  try {
    const bearer = request.headers.get("authorization");
    const expected = process.env.CRON_SECRET?.trim();
    if (!expected || bearer !== `Bearer ${expected}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { ymd, hhmm } = getLocalDateTimeInTimeZone(new Date());
    const nowMinutes = minutesOfHhmm(hhmm) ?? 0;
    const supabase = createServiceRoleClient();

    const { data: dueData, error: dueError } = await supabase
      .from("to_do_items")
      .select("id, name, target_date, target_time, profile_id")
      .eq("checked", false)
      .eq("target_date", ymd)
      .not("target_time", "is", null)
      .lte("target_time", `${hhmm}:59`);
    if (dueError) {
      return NextResponse.json({ error: dueError.message }, { status: 500 });
    }

    const byProfile = new Map<string, DueRow[]>();
    for (const row of (dueData ?? []) as DueRow[]) {
      const list = byProfile.get(row.profile_id) ?? [];
      list.push(row);
      byProfile.set(row.profile_id, list);
    }
    if (byProfile.size === 0) {
      return NextResponse.json({ ok: true, date: ymd, time: hhmm, due: 0 }, { status: 200 });
    }

    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, user_id, is_subscriber, subscription_ends_at, subscription_tier, user_preferences")
      .in("id", Array.from(byProfile.keys()));
    if (profilesError) {
      return NextResponse.json({ error: profilesError.message }, { status: 500 });
    }

    let inserted = 0;
    let sentPushes = 0;
    const errors: string[] = [];

    for (const profile of (profiles ?? []) as ProfileRow[]) {
      // Dated reminders are a Pro feature, same as in the 8 AM run.
      const hasProAccess = hasProLevelProductAccess(
        normalizeDbTier(profile.subscription_tier),
        profile.subscription_ends_at,
        Boolean(profile.is_subscriber)
      );
      if (!hasProAccess) continue;

      const rows = byProfile.get(profile.id) ?? [];
      const notifications = rows.map((row) => ({
        user_id: profile.user_id,
        kind: TODO_NOTIFICATION_KIND,
        dedupe_key: todoReminderDedupeKey(row, ymd),
        ...todoReminderMessage(row),
        minutesLate: nowMinutes - (minutesOfHhmm(row.target_time) ?? nowMinutes),
      }));

      const { data: created, error: upsertError } = await supabase
        .from("user_notifications")
        .upsert(
          notifications.map(({ minutesLate: _late, ...n }) => n),
          { onConflict: "user_id,dedupe_key", ignoreDuplicates: true }
        )
        .select("dedupe_key");
      if (upsertError) {
        errors.push(`notification upsert failed for user ${profile.user_id}: ${upsertError.message}`);
        continue;
      }
      const createdKeys = new Set((created ?? []).map((r) => String(r.dedupe_key)));
      inserted += createdKeys.size;

      const prefs = normalizeUserPreferences(profile.user_preferences);
      if (!prefs.notificationsEnabled) continue;
      const toPush = notifications.filter(
        (n) => createdKeys.has(n.dedupe_key) && n.minutesLate <= REMINDER_PUSH_GRACE_MINUTES
      );
      if (toPush.length === 0) continue;

      const pushResult = await sendPushToUser(
        supabase,
        { userId: profile.user_id },
        toPush.map((n) => ({ kind: n.kind, title: n.title, body: n.body, dedupeKey: n.dedupe_key }))
      );
      sentPushes += pushResult.sent;
      for (const message of pushResult.errors) {
        errors.push(`push failed for user ${profile.user_id}: ${message}`);
      }
    }

    return NextResponse.json(
      { ok: true, date: ymd, time: hhmm, due: dueData?.length ?? 0, inserted, sentPushes, errors },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown timed reminder failure" },
      { status: 500 }
    );
  }
}
