"use server";

import { createServiceRoleClient } from "@/lib/supabase/server";
import { getAdminGuard } from "@/actions/admin";

type ReminderLog = {
  id: string;
  user_id: string;
  full_name: string | null;
  dedupe_key: string;
  sent_at: string;
  channel: string;
};

type UserNotification = {
  id: string;
  user_id: string;
  full_name: string | null;
  title: string;
  body: string;
  kind: string;
  dedupe_key: string;
  read_at: string | null;
  created_at: string;
};

async function getProfileNames(supabase: ReturnType<typeof createServiceRoleClient>, userIds: string[]): Promise<Record<string, string | null>> {
  if (userIds.length === 0) return {};
  const { data } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  const userSet = new Set(userIds);
  const map: Record<string, string | null> = {};
  for (const user of data?.users ?? []) {
    if (userSet.has(user.id)) {
      const name = (user.user_metadata?.full_name as string | undefined)?.trim();
      map[user.id] = name || null;
    }
  }
  return map;
}

export async function getAdminReminderLogs(limit: number = 100): Promise<{
  logs: ReminderLog[];
  error?: string;
}> {
  const guard = await getAdminGuard();
  if (!guard.allowed) {
    return { logs: [], error: "Not authorized" };
  }

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("reminder_email_logs")
    .select("id, user_id, dedupe_key, sent_at, channel")
    .order("sent_at", { ascending: false })
    .limit(limit);

  if (error) {
    return { logs: [], error: error.message };
  }

  const rows = data ?? [];
  const userIds = [...new Set(rows.map((r) => r.user_id))];
  const nameMap = await getProfileNames(supabase, userIds);

  const logs = rows.map((row) => ({
    id: row.id,
    user_id: row.user_id,
    full_name: nameMap[row.user_id] ?? null,
    dedupe_key: row.dedupe_key,
    sent_at: row.sent_at,
    channel: row.channel,
  }));

  return { logs };
}

export async function getAdminUserNotifications(userId?: string, limit: number = 100): Promise<{
  notifications: UserNotification[];
  error?: string;
}> {
  const guard = await getAdminGuard();
  if (!guard.allowed) {
    return { notifications: [], error: "Not authorized" };
  }

  const supabase = createServiceRoleClient();
  let query = supabase
    .from("user_notifications")
    .select("id, user_id, title, body, kind, dedupe_key, read_at, created_at")
    .order("created_at", { ascending: false });

  if (userId) {
    query = query.eq("user_id", userId);
  }

  query = query.limit(limit);

  const { data, error } = await query;

  if (error) {
    return { notifications: [], error: error.message };
  }

  const rows = data ?? [];
  const userIds = [...new Set(rows.map((r) => r.user_id))];
  const nameMap = await getProfileNames(supabase, userIds);

  const notifications = rows.map((row) => ({
    id: row.id,
    user_id: row.user_id,
    full_name: nameMap[row.user_id] ?? null,
    title: row.title,
    body: row.body,
    kind: row.kind,
    dedupe_key: row.dedupe_key,
    read_at: row.read_at,
    created_at: row.created_at,
  }));

  return { notifications };
}
