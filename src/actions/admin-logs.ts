"use server";

import { createServiceRoleClient } from "@/lib/supabase/server";
import { getAdminGuard } from "@/actions/admin";

type ReminderLog = {
  id: string;
  user_id: string;
  dedupe_key: string;
  sent_at: string;
  channel: string;
};

type UserNotification = {
  id: string;
  user_id: string;
  title: string;
  body: string;
  kind: string;
  dedupe_key: string;
  read_at: string | null;
  created_at: string;
};

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

  return { logs: (data ?? []) as ReminderLog[] };
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

  return { notifications: (data ?? []) as UserNotification[] };
}
