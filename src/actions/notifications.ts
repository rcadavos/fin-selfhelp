"use server";

import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { sendReminderEmail } from "@/lib/email";
import { getCandidateDueDatesForBill } from "@/lib/expense-due-date";
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

type BillReminderRow = {
  id: string;
  note: string | null;
  due_date: string | null;
  billing_period: string | null;
  due_month: number | null;
  reminder_days_before: number[] | null;
  reminder_channel: string | null;
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

export async function syncGeneratedProNotificationsForToday(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  options?: { skipReleaseHourCheck?: boolean; includeDebug?: boolean }
): Promise<{ notificationsInserted: number; errors: string[]; skipped: boolean; debug?: Record<string, any> }> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, is_subscriber, subscription_ends_at, subscription_tier")
    .eq("user_id", userId)
    .maybeSingle();
  if (!profile?.id) return { notificationsInserted: 0, errors: [], skipped: false };

  const tier = normalizeDbTier(profile.subscription_tier as string | null);
  const hasProAccess = hasProLevelProductAccess(
    tier,
    (profile.subscription_ends_at as string | null) ?? null,
    Boolean(profile.is_subscriber)
  );

  const today = new Date();
  if (!options?.skipReleaseHourCheck && !isReminderReleaseHour(today, 8)) {
    return { notificationsInserted: 0, errors: [], skipped: true };
  }
  const todayYmd = formatYmdLocal(today);

  const billsQueryResult = await supabase
    .from("bills")
    .select("id, note, due_date, billing_period, due_month, reminder_days_before, reminder_channel")
    .eq("profile_id", profile.id)
    .not("reminder_days_before", "is", null);

  let toDoRows: ToDoTargetRow[] = [];

  if (hasProAccess) {
    const { data: todoData } = await supabase
      .from("to_do_items")
      .select("id, name, target_date")
      .eq("profile_id", profile.id)
      .eq("checked", false)
      .eq("target_date", todayYmd);
    toDoRows = (todoData ?? []) as ToDoTargetRow[];
  }

  const rowsToInsert: NewNotificationRow[] = [];

  for (const bill of (billsQueryResult.data ?? []) as BillReminderRow[]) {
    if (!bill.due_date || !Array.isArray(bill.reminder_days_before) || bill.reminder_days_before.length === 0) {
      continue;
    }
    const candidates = getCandidateDueDatesForBill(bill as typeof bill & { due_date: string }, today);
    const billLabel = (bill.note ?? "Planned Expense").trim() || "Planned Expense";
    const channel = bill.reminder_channel || "both";

    if (channel !== "in-app" && channel !== "both") continue;

    for (const dueThisMonth of candidates) {
      for (const reminderDay of bill.reminder_days_before) {
        if (reminderDay < 0 || reminderDay > 5) continue;
        const reminderDate = addDays(dueThisMonth, -reminderDay);
        if (formatYmdLocal(reminderDate) !== todayYmd) continue;
        rowsToInsert.push({
          user_id: userId,
          kind: "expense_reminder",
          dedupe_key: `bill:${bill.id}:${formatYmdLocal(dueThisMonth)}:d-${reminderDay}`,
          title: reminderDay === 0 ? `Due today: ${billLabel}` : `Bill reminder: ${billLabel}`,
          body:
            reminderDay === 0
              ? "This bill is due today. Please review and settle it."
              : `Due in ${reminderDay} day${reminderDay === 1 ? "" : "s"}.`,
        });
      }
    }
  }

  for (const item of toDoRows) {
    rowsToInsert.push({
      user_id: userId,
      kind: "todo_target_date",
      dedupe_key: `todo:${item.id}:${todayYmd}`,
      title: `To-do target today: ${item.name}`,
      body: "This task reaches its target date today.",
    });
  }

  if (rowsToInsert.length === 0) {
    return {
      notificationsInserted: 0,
      errors: [],
      skipped: false,
      debug: options?.includeDebug
        ? {
            todayYmd,

            toDoCount: (toDoRows ?? []).length,
            notificationsGenerated: 0,
          }
        : undefined,
    };
  }

  const serviceSupabase = createServiceRoleClient();
  const { error: insertError } = await serviceSupabase.rpc('insert_user_notifications_bulk', { notifications: rowsToInsert });

  if (insertError) {
    return {
      notificationsInserted: 0,
      errors: [insertError.message],
      skipped: false,
      debug: options?.includeDebug
        ? {
            todayYmd,

            toDoCount: (toDoRows ?? []).length,
            notificationsGenerated: rowsToInsert.length,
            insertError: insertError.message,
          }
        : undefined,
    };
  }

  return {
    notificationsInserted: rowsToInsert.length,
    errors: [],
    skipped: false,
    debug: options?.includeDebug
      ? {
          todayYmd,
          toDoCount: (toDoRows ?? []).length,
          notificationsGenerated: rowsToInsert.length,
          notificationTitles: rowsToInsert.map((n) => n.title),
        }
      : undefined,
  };
}

type PendingReminder = {
  dedupeKey: string;
  title: string;
  body: string;
};

type EmailResult = {
  emailsSent: number;
  pendingCount: number;
  skipped: boolean;
  errors: string[];
  debug?: Record<string, any>;
};

export async function sendGeneratedProReminderEmailsForToday(
  userId: string,
  options?: { skipReleaseHourCheck?: boolean; includeDebug?: boolean }
): Promise<EmailResult> {
  const supabase = createServiceRoleClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, is_subscriber, subscription_ends_at, subscription_tier")
    .eq("user_id", userId)
    .maybeSingle();
  if (!profile?.id) {
    return { emailsSent: 0, pendingCount: 0, skipped: false, errors: [] };
  }

  const tier = normalizeDbTier(profile.subscription_tier as string | null);
  const hasProAccess = hasProLevelProductAccess(
    tier,
    (profile.subscription_ends_at as string | null) ?? null,
    Boolean(profile.is_subscriber)
  );

  const today = new Date();
  if (!options?.skipReleaseHourCheck && !isReminderReleaseHour(today, 8)) {
    return { emailsSent: 0, pendingCount: 0, skipped: true, errors: [] };
  }

  const todayYmd = formatYmdLocal(today);

  const [billsQueryResult, authUserResult, lockRow] = await Promise.all([
    supabase
      .from("bills")
      .select("id, note, due_date, billing_period, due_month, reminder_days_before, reminder_channel")
      .eq("profile_id", profile.id)
      .not("reminder_days_before", "is", null),
    supabase.auth.admin.getUserById(userId),
    hasProAccess
      ? Promise.resolve(null)
      : supabase
          .from("user_notifications")
          .select("dedupe_key")
          .eq("user_id", userId)
          .like("dedupe_key", "bill:%")
          .limit(1),
  ]);

  let toDoRows: ToDoTargetRow[] = [];

  if (hasProAccess) {
    const { data: todoData } = await supabase
      .from("to_do_items")
      .select("id, name, target_date")
      .eq("profile_id", profile.id)
      .eq("checked", false)
      .eq("target_date", todayYmd);
    toDoRows = (todoData ?? []) as ToDoTargetRow[];
  }

  const toEmail = authUserResult.data.user?.email?.trim();
  if (!toEmail) {
    return {
      emailsSent: 0,
      pendingCount: 0,
      skipped: false,
      errors: ["No email address available for user."],
    };
  }

  const lockedFreeBillId = hasProAccess
    ? null
    : ((lockRow as { data: { dedupe_key: string }[] | null } | null)
        ?.data?.[0]?.dedupe_key?.match(/^bill:([^:]+):/)?.[1] ?? null);
  let freeTierBillFired = false;

  const pending: PendingReminder[] = [];

  for (const bill of (billsQueryResult.data ?? []) as BillReminderRow[]) {
    if (!bill.due_date || !Array.isArray(bill.reminder_days_before) || bill.reminder_days_before.length === 0) {
      continue;
    }
    if (!hasProAccess) {
      if (lockedFreeBillId !== null && bill.id !== lockedFreeBillId) continue;
      if (lockedFreeBillId === null && freeTierBillFired) continue;
    }
    const candidates = getCandidateDueDatesForBill(bill as typeof bill & { due_date: string }, today);
    const billLabel = (bill.note ?? "Planned Expense").trim() || "Planned Expense";
    const channel = bill.reminder_channel || "both";

    if (channel !== "email" && channel !== "both") continue;

    for (const dueThisMonth of candidates) {
      for (const reminderDay of bill.reminder_days_before) {
        if (reminderDay < 0 || reminderDay > 5) continue;
        const reminderDate = addDays(dueThisMonth, -reminderDay);
        if (formatYmdLocal(reminderDate) !== todayYmd) continue;

        const dedupeKey = `bill:${bill.id}:${formatYmdLocal(dueThisMonth)}:d-${reminderDay}`;
        pending.push({
          dedupeKey,
          title: reminderDay === 0 ? `Due today: ${billLabel}` : `Bill reminder: ${billLabel}`,
          body: reminderDay === 0
            ? "This bill is due today. Please review and settle it."
            : `Due in ${reminderDay} day${reminderDay === 1 ? "" : "s"}.`,
        });
        if (!hasProAccess) freeTierBillFired = true;
      }
    }
  }

  for (const item of toDoRows) {
    const dedupeKey = `todo:${item.id}:${todayYmd}`;
    pending.push({
      dedupeKey,
      title: `To-do target today: ${item.name}`,
      body: "This task reaches its target date today.",
    });
  }

  if (pending.length === 0) {
    return {
      emailsSent: 0,
      pendingCount: 0,
      skipped: false,
      errors: [],
      debug: options?.includeDebug
        ? {
            todayYmd,

            toDoCount: (toDoRows ?? []).length,
            pendingCount: 0,
          }
        : undefined,
    };
  }

  const { data: insertedLogs, error: logsError } = await supabase
    .from("reminder_email_logs")
    .upsert(
      pending.map((item) => ({
        user_id: userId,
        dedupe_key: item.dedupeKey,
      })),
      { onConflict: "user_id,dedupe_key", ignoreDuplicates: true }
    )
    .select("dedupe_key");

  if (logsError) {
    return {
      emailsSent: 0,
      pendingCount: pending.length,
      skipped: false,
      errors: [logsError.message],
      debug: options?.includeDebug
        ? {
            todayYmd,

            toDoCount: (toDoRows ?? []).length,
            pendingCount: pending.length,
          }
        : undefined,
    };
  }

  const insertedKeys = new Set((insertedLogs ?? []).map((r) => String(r.dedupe_key)));
  const newlyPending = pending.filter((item) => insertedKeys.has(item.dedupeKey));

  if (newlyPending.length === 0) {
    return {
      emailsSent: 0,
      pendingCount: pending.length,
      skipped: false,
      errors: [],
      debug: options?.includeDebug
        ? {
            todayYmd,

            toDoCount: (toDoRows ?? []).length,
            pendingCount: pending.length,
            emailed: false,
          }
        : undefined,
    };
  }

  const sendResult = await sendReminderEmail({
    to: toEmail,
    items: newlyPending,
    todayYmd,
    userId,
  });

  if (!sendResult.ok) {
    // Roll back the log entries so the next run can retry them.
    await supabase
      .from("reminder_email_logs")
      .delete()
      .eq("user_id", userId)
      .in("dedupe_key", newlyPending.map((p) => p.dedupeKey));
    return {
      emailsSent: 0,
      pendingCount: pending.length,
      skipped: false,
      errors: [sendResult.error ?? "Failed to send reminder email."],
      debug: options?.includeDebug
        ? {
            todayYmd,

            toDoCount: (toDoRows ?? []).length,
            pendingCount: pending.length,
            emailed: false,
          }
        : undefined,
    };
  }

  return {
    emailsSent: 1,
    pendingCount: pending.length,
    skipped: false,
    errors: [],
    debug: options?.includeDebug
      ? {
          todayYmd,
          toDoCount: (toDoRows ?? []).length,
          pendingCount: pending.length,
          emailed: true,
          email: toEmail,
          emailTitles: newlyPending.map((item) => item.title),
        }
      : undefined,
  };
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
    .eq("user_id", user.id)
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
