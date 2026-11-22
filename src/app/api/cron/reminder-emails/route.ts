import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { sendReminderEmail } from "@/lib/email";
import { getCandidateDueDatesForBill } from "@/lib/expense-due-date";
import { hasProLevelProductAccess, normalizeDbTier } from "@/lib/subscription-tier";
import { getLocalDateTimeInTimeZone, isReminderReleaseHour } from "@/lib/reminder-release-time";
import {
  TODO_NOTIFICATION_KIND,
  TODO_REMINDER_SELECT,
  isTodoReminderDue,
  todoReminderDedupeKey,
  todoReminderMessage,
  type ToDoReminderRow,
} from "@/lib/reminders/notify";
import { getCurrentPaidMonth } from "@/lib/paid-month";
import { isFeatureEnabledInMode } from "@/lib/constants/app-mode";
import {
  appModeFromPreferencesJson,
  normalizeUserPreferences,
  type UserPreferences,
} from "@/lib/user-preferences";
import { INERT_AUTO_DEBIT_REMINDER_DAYS } from "@/lib/constants/bills";
import { sendPushToUser } from "@/lib/push";

type ProfileRow = {
  id: string;
  user_id: string;
  is_subscriber: boolean;
  subscription_ends_at: string | null;
  subscription_tier: string | null;
  email_unsubscribed: boolean | null;
  user_preferences: unknown;
};

type BillReminderRow = {
  id: string;
  note: string | null;
  due_date: string | null;
  billing_period: string | null;
  due_month: number | null;
  reminder_days_before: number[] | null;
  reminder_channel: string | null;
  is_auto_debit: boolean;
};

type PendingReminder = {
  dedupeKey: string;
  title: string;
  body: string;
};

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

/** Push honours the switches in Settings → Notifications: the master one, and Bill reminders for bills. */
function wantsPush(prefs: UserPreferences, kind: string): boolean {
  if (!prefs.notificationsEnabled) return false;
  return kind !== "expense_reminder" || prefs.billRemindersEnabled;
}

export async function GET(request: Request) {
  try {
    const bearer = request.headers.get("authorization");
    const expected = process.env.CRON_SECRET?.trim();
    if (!expected || bearer !== `Bearer ${expected}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();
    if (!isReminderReleaseHour(now, 8)) {
      return NextResponse.json(
        { ok: true, skipped: "Before 08:00 Asia/Manila (reminder release window)." },
        { status: 200 }
      );
    }
    const todayYmd = formatYmdLocal(now);
    const localTime = getLocalDateTimeInTimeZone(now).hhmm;

    const supabase = createServiceRoleClient();

    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, user_id, is_subscriber, subscription_ends_at, subscription_tier, email_unsubscribed, user_preferences");
    if (profilesError) {
      return NextResponse.json({ error: profilesError.message }, { status: 500 });
    }

    let processedUsers = 0;
    let sentEmails = 0;
    let sentPushes = 0;
    const errors: string[] = [];



    for (const profile of (profiles ?? []) as ProfileRow[]) {
      // Unsubscribing stops the emails only. In-app and push reminders still go out.
      const canEmail = !profile.email_unsubscribed;

      const tier = normalizeDbTier(profile.subscription_tier);
      const hasProAccess = hasProLevelProductAccess(
        tier,
        profile.subscription_ends_at,
        Boolean(profile.is_subscriber)
      );

      processedUsers += 1;

      const autoDebitRuns = isFeatureEnabledInMode(
        appModeFromPreferencesJson(profile.user_preferences),
        "autoDebit",
      );

      let billsQuery = supabase
        .from("bills")
        .select("id, note, due_date, billing_period, due_month, reminder_days_before, reminder_channel, is_auto_debit")
        .eq("profile_id", profile.id);
      // Auto-debit bills are excluded from reminders because the debit cron pays them.
      // Where the app mode switches auto-debit off, nothing pays them, so they must stay
      // in — otherwise they get neither a payment nor a reminder.
      if (autoDebitRuns) {
        billsQuery = billsQuery
          .eq("is_auto_debit", false)
          .not("reminder_days_before", "is", null);
      }

      const authUserPromise = canEmail
        ? supabase.auth.admin.getUserById(profile.user_id)
        : Promise.resolve(null);

      let toDoRows: ToDoReminderRow[] = [];

      if (hasProAccess) {
        const { data: todoData } = await supabase
          .from("to_do_items")
          .select(TODO_REMINDER_SELECT)
          .eq("profile_id", profile.id)
          .eq("checked", false)
          .eq("target_date", todayYmd);
        toDoRows = (todoData ?? []) as ToDoReminderRow[];
      }

      const candidatePaidMonths: string[] = [];
      for (let i = -1; i <= 1; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
        candidatePaidMonths.push(getCurrentPaidMonth(d));
      }

      const paidPaymentsPromise = supabase
        .from("bill_payments")
        .select("bill_id, paid_month")
        .eq("profile_id", profile.id)
        .in("paid_month", candidatePaidMonths)
        // Only a real payment suppresses a reminder. A legacy status="failed" row from
        // before an app-mode switch would otherwise silence that month permanently.
        .eq("status", "paid");

      const carriedOutPromise = supabase
        .from("bill_carryovers")
        .select("bill_id, from_month")
        .eq("profile_id", profile.id)
        .in("from_month", candidatePaidMonths);

      const [[{ data: billsRaw }, authUserResult, { data: paidRows }, { data: carriedOutRows }], lockRow] = await Promise.all([
        Promise.all([billsQuery, authUserPromise, paidPaymentsPromise, carriedOutPromise]),
        hasProAccess
          ? Promise.resolve(null)
          : supabase
              .from("user_notifications")
              .select("dedupe_key")
              .eq("user_id", profile.user_id)
              .like("dedupe_key", "bill:%")
              .limit(1),
      ]);

      const paidBillMonths = new Set(
        (paidRows ?? []).map((r) => `${String(r.bill_id)}:${String(r.paid_month)}`)
      );
      // A month the bill was carried over out of is skipped, so it gets no reminder either.
      for (const r of carriedOutRows ?? []) {
        paidBillMonths.add(`${String(r.bill_id)}:${String(r.from_month)}`);
      }

      // Null for unsubscribed accounts and for phone signups with no email: those get
      // their reminders in-app and by push only.
      const toEmail = authUserResult?.data.user?.email?.trim() || null;

      // Free-tier: only the bill that previously fired keeps its slot; if none
      // has fired yet the first one to match today gets to fire and lock itself.
      const lockedFreeBillId = hasProAccess
        ? null
        : ((lockRow as { data: { dedupe_key: string }[] | null } | null)
            ?.data?.[0]?.dedupe_key?.match(/^bill:([^:]+):/)?.[1] ?? null);
      let freeTierBillFired = false;

      const pending: PendingReminder[] = [];
      const notificationsToInsert: any[] = [];

      for (const bill of (billsRaw ?? []) as BillReminderRow[]) {
        // Auto-debit suppresses reminders only where auto-debit actually RUNS. When the
        // app mode switches auto-debit off, the bill is paid by nobody, so it falls back
        // to a due-date reminder. Read-time only: the stored columns are never rewritten,
        // so switching back to Full cashflow restores auto-debit-wins exactly.
        const reminderDays =
          Array.isArray(bill.reminder_days_before) && bill.reminder_days_before.length > 0
            ? bill.reminder_days_before
            : !autoDebitRuns && bill.is_auto_debit
              ? INERT_AUTO_DEBIT_REMINDER_DAYS
              : [];
        if (!bill.due_date || reminderDays.length === 0) {
          continue;
        }
        if (!hasProAccess) {
          if (lockedFreeBillId !== null && bill.id !== lockedFreeBillId) continue;
          if (lockedFreeBillId === null && freeTierBillFired) continue;
        }
        const candidates = getCandidateDueDatesForBill(bill as typeof bill & { due_date: string }, now);
        const billLabel = (bill.note ?? "Bill").trim() || "Bill";
        const channel = bill.reminder_channel || "both";

        for (const dueThisMonth of candidates) {
          const dueYm = getCurrentPaidMonth(dueThisMonth);
          if (paidBillMonths.has(`${bill.id}:${dueYm}`)) continue;
          for (const reminderDay of reminderDays) {
            if (reminderDay < 0 || reminderDay > 5) continue;
            const reminderDate = addDays(dueThisMonth, -reminderDay);
            if (formatYmdLocal(reminderDate) !== todayYmd) continue;

            const dedupeKey = `bill:${bill.id}:${formatYmdLocal(dueThisMonth)}:d-${reminderDay}`;
            const title = reminderDay === 0 ? `Due today: ${billLabel}` : `Bill reminder: ${billLabel}`;
            const body = reminderDay === 0
              ? "This bill is due today. Please review and settle it."
              : `Due in ${reminderDay} day${reminderDay === 1 ? "" : "s"}.`;

            if (toEmail && (channel === "email" || channel === "both")) {
              pending.push({ dedupeKey, title, body });
              if (!hasProAccess) freeTierBillFired = true;
            }
            if (channel === "in-app" || channel === "both") {
              notificationsToInsert.push({
                user_id: profile.user_id,
                kind: "expense_reminder",
                dedupe_key: dedupeKey,
                title,
                body,
              });
              if (!hasProAccess) freeTierBillFired = true;
            }
          }
        }
      }

      for (const item of toDoRows) {
        const { title, body } = todoReminderMessage(item);

        // The morning email lists all of today's reminders, the timed ones included.
        if (toEmail) pending.push({ dedupeKey: `todo:${item.id}:${todayYmd}`, title, body });

        // In-app and push for a timed reminder wait for its time; /api/cron/timed-reminders sends it.
        if (!isTodoReminderDue(item, localTime, true)) continue;
        notificationsToInsert.push({
          user_id: profile.user_id,
          kind: TODO_NOTIFICATION_KIND,
          dedupe_key: todoReminderDedupeKey(item, todayYmd),
          title,
          body,
        });
      }

      if (pending.length === 0 && notificationsToInsert.length === 0) continue;

      const [logsResult, notificationsResult] = await Promise.all([
        supabase
          .from("reminder_email_logs")
          .upsert(
            pending.map((item) => ({
              user_id: profile.user_id,
              dedupe_key: item.dedupeKey,
            })),
            { onConflict: "user_id,dedupe_key", ignoreDuplicates: true }
          )
          .select("dedupe_key"),
        supabase
          .from("user_notifications")
          .upsert(notificationsToInsert, { onConflict: "user_id,dedupe_key", ignoreDuplicates: true })
          .select("dedupe_key"),
      ]);

      if (notificationsResult.error) {
        errors.push(`notification upsert failed for user ${profile.user_id}: ${notificationsResult.error.message}`);
      } else {
        // Push only rows this run created, so a re-run of the cron never buzzes twice.
        const insertedNotificationKeys = new Set(
          (notificationsResult.data ?? []).map((r) => String(r.dedupe_key))
        );
        const prefs = normalizeUserPreferences(profile.user_preferences);
        const toPush = notificationsToInsert.filter(
          (n) => insertedNotificationKeys.has(n.dedupe_key) && wantsPush(prefs, n.kind)
        );
        if (toPush.length > 0) {
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
      }

      if (logsResult.error) {
        errors.push(`log upsert failed for user ${profile.user_id}: ${logsResult.error.message}`);
        continue;
      }

      const insertedLogs = logsResult.data;

      const insertedKeys = new Set((insertedLogs ?? []).map((r) => String(r.dedupe_key)));
      const newlyPending = pending.filter((item) => insertedKeys.has(item.dedupeKey));
      
      if (toEmail && newlyPending.length > 0) {
        const sendResult = await sendReminderEmail({
          to: toEmail,
          items: newlyPending,
          todayYmd,
          userId: profile.user_id,
        });

        if (!sendResult.ok) {
          errors.push(`email send failed for user ${profile.user_id}: ${sendResult.error}`);
          // Roll back log entries so the next cron run can retry.
          await supabase
            .from("reminder_email_logs")
            .delete()
            .eq("user_id", profile.user_id)
            .in("dedupe_key", newlyPending.map((p) => p.dedupeKey));
          continue;
        }
        sentEmails += 1;
      }
    }

    return NextResponse.json(
      {
        ok: true,
        date: todayYmd,
        processedUsers,
        sentEmails,
        sentPushes,
        errors,
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown reminder email failure",
      },
      { status: 500 }
    );
  }
}
