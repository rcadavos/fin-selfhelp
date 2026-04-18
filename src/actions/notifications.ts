"use server";

import { createClient } from "@/lib/supabase/server";
import { getDueDayOfMonthFromYmd } from "@/lib/expense-due-date";
import { hasProLevelProductAccess, normalizeDbTier } from "@/lib/subscription-tier";
import type { AppNotification } from "@/types/notifications";
import { isReminderReleaseHour } from "@/lib/reminder-release-time";

type DbRow = {
  id: string;
  title: string;
  body: string;
  read_at: string | null;
  created_at: string;
};

type ExpenseReminderRow = {
  id: string;
  note: string | null;
  notes: string | null;
  due_date: string | null;
  reminder_days_before: number[] | null;
};

type ToDoTargetRow = {
  id: string;
  name: string;
  target_date: string | null;
};

type NewNotificationRow = {
  user_id: string;
  title: string;
  body: string;
  kind: string;
  dedupe_key: string;
};

function rowToApp(row: DbRow): AppNotification {
  return {
    id: row.id,
    title: row.title,
    body: row.body ?? "",
    createdAt: row.created_at,
    read: row.read_at != null,
  };
}

function formatYmdLocal(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function addDays(date: Date, days: number): Date {
  const out = new Date(date);
  out.setDate(out.getDate() + days);
  return out;
}

function monthLastDay(year: number, month1to12: number): number {
  return new Date(year, month1to12, 0).getDate();
}

function computeDueDateThisMonthFromStored(dueYmd: string, today: Date): Date | null {
  const dueDay = getDueDayOfMonthFromYmd(dueYmd);
  if (!dueDay) return null;
  const year = today.getFullYear();
  const month1to12 = today.getMonth() + 1;
  const safeDay = Math.min(dueDay, monthLastDay(year, month1to12));
  return new Date(year, month1to12 - 1, safeDay);
}

async function syncGeneratedProNotificationsForToday(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
): Promise<void> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, is_subscriber, subscription_ends_at, subscription_tier")
    .eq("user_id", userId)
    .maybeSingle();
  if (!profile?.id) return;

  const tier = normalizeDbTier(profile.subscription_tier as string | null);
  const hasProAccess = hasProLevelProductAccess(
    tier,
    (profile.subscription_ends_at as string | null) ?? null,
    Boolean(profile.is_subscriber)
  );
  if (!hasProAccess) return;

  const today = new Date();
  if (!isReminderReleaseHour(today, 8)) return;
  const todayYmd = formatYmdLocal(today);

  const [{ data: expenses }, { data: toDoRows }] = await Promise.all([
    supabase
      .from("expense_entries")
      .select("id, note, notes, due_date, reminder_days_before")
      .eq("profile_id", profile.id),
    supabase
      .from("to_do_items")
      .select("id, name, target_date")
      .eq("profile_id", profile.id)
      .eq("checked", false)
      .eq("target_date", todayYmd),
  ]);

  const rowsToInsert: NewNotificationRow[] = [];

  for (const entry of (expenses ?? []) as ExpenseReminderRow[]) {
    if (!entry.due_date || !Array.isArray(entry.reminder_days_before) || entry.reminder_days_before.length === 0) {
      continue;
    }
    const dueThisMonth = computeDueDateThisMonthFromStored(entry.due_date, today);
    if (!dueThisMonth) continue;
    const expenseLabel = (entry.notes ?? entry.note ?? "Expense").trim() || "Expense";
    for (const reminderDay of entry.reminder_days_before) {
      if (reminderDay !== 0 && reminderDay !== 1 && reminderDay !== 3) continue;
      const reminderDate = addDays(dueThisMonth, -reminderDay);
      if (formatYmdLocal(reminderDate) !== todayYmd) continue;
      rowsToInsert.push({
        user_id: userId,
        kind: "expense_reminder",
        dedupe_key: `expense:${entry.id}:${todayYmd}:d-${reminderDay}`,
        title: reminderDay === 0 ? `Due today: ${expenseLabel}` : `Expense reminder: ${expenseLabel}`,
        body:
          reminderDay === 0
            ? "This expense is due today."
            : `Due in ${reminderDay} day${reminderDay === 1 ? "" : "s"}.`,
      });
    }
  }

  for (const item of (toDoRows ?? []) as ToDoTargetRow[]) {
    rowsToInsert.push({
      user_id: userId,
      kind: "todo_target_date",
      dedupe_key: `todo:${item.id}:${todayYmd}`,
      title: `To-do target today: ${item.name}`,
      body: "This task reaches its target date today.",
    });
  }

  if (rowsToInsert.length === 0) return;

  await supabase
    .from("user_notifications")
    .upsert(rowsToInsert, { onConflict: "user_id,dedupe_key", ignoreDuplicates: true });
}

export async function loadMyNotifications(): Promise<{ items: AppNotification[]; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { items: [] };

  await syncGeneratedProNotificationsForToday(supabase, user.id);

  const { data, error } = await supabase
    .from("user_notifications")
    .select("id, title, body, read_at, created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) return { items: [], error: error.message };
  const items = (data ?? []).map((r) => rowToApp(r as DbRow));
  return { items };
}

export async function markNotificationRead(id: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not logged in." };

  const { error } = await supabase
    .from("user_notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return { error: error.message };
  return {};
}

export async function markAllNotificationsRead(): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not logged in." };

  const { error } = await supabase
    .from("user_notifications")
    .update({ read_at: new Date().toISOString() })
    .is("read_at", null);

  if (error) return { error: error.message };
  return {};
}
