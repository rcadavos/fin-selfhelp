import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { getDueDayOfMonthFromYmd } from "@/lib/expense-due-date";
import { hasProLevelProductAccess, normalizeDbTier } from "@/lib/subscription-tier";
import { isReminderReleaseHour } from "@/lib/reminder-release-time";

type ProfileRow = {
  id: string;
  user_id: string;
  is_subscriber: boolean;
  subscription_ends_at: string | null;
  subscription_tier: string | null;
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

async function sendReminderEmail(params: {
  to: string;
  from: string;
  items: PendingReminder[];
  todayYmd: string;
}): Promise<{ ok: boolean; error?: string }> {
  const smtpHost = process.env.SMTP_HOST?.trim();
  const smtpPortRaw = process.env.SMTP_PORT?.trim();
  const smtpUser = process.env.SMTP_USER?.trim();
  const smtpPass = process.env.SMTP_PASS?.trim();
  if (!smtpHost || !smtpPortRaw || !smtpUser || !smtpPass) {
    return {
      ok: false,
      error: "SMTP_HOST, SMTP_PORT, SMTP_USER, and SMTP_PASS must all be set",
    };
  }
  const smtpPort = Number(smtpPortRaw);
  if (!Number.isFinite(smtpPort) || smtpPort <= 0) {
    return { ok: false, error: "SMTP_PORT must be a valid positive number" };
  }
  const smtpSecure = String(process.env.SMTP_SECURE ?? "").toLowerCase() === "true";

  const subject = `OmniTrak reminders for ${params.todayYmd}`;
  const textLines = [
    "You have reminders today:",
    "",
    ...params.items.map((item) => `- ${item.title}: ${item.body}`),
  ];

  const html = [
    "<p>You have reminders today:</p>",
    "<ul>",
    ...params.items.map(
      (item) =>
        `<li><strong>${item.title.replace(/</g, "&lt;")}</strong>: ${item.body.replace(/</g, "&lt;")}</li>`
    ),
    "</ul>",
  ].join("");

  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpSecure,
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  });

  try {
    await transporter.sendMail({
      from: params.from,
      to: params.to,
      subject,
      text: textLines.join("\n"),
      html,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, error: `SMTP send failed: ${message}` };
  }

  return { ok: true };
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

    const supabase = createServiceRoleClient();

    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, user_id, is_subscriber, subscription_ends_at, subscription_tier");
    if (profilesError) {
      return NextResponse.json({ error: profilesError.message }, { status: 500 });
    }

    let processedUsers = 0;
    let sentEmails = 0;
    const errors: string[] = [];

    for (const profile of (profiles ?? []) as ProfileRow[]) {
      const tier = normalizeDbTier(profile.subscription_tier);
      const hasProAccess = hasProLevelProductAccess(
        tier,
        profile.subscription_ends_at,
        Boolean(profile.is_subscriber)
      );
      if (!hasProAccess) continue;

      processedUsers += 1;

      const [{ data: expenses }, { data: toDoRows }, authUserResult] = await Promise.all([
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
        supabase.auth.admin.getUserById(profile.user_id),
      ]);

      const toEmail = authUserResult.data.user?.email?.trim();
      if (!toEmail) continue;

      const pending: PendingReminder[] = [];
      for (const entry of (expenses ?? []) as ExpenseReminderRow[]) {
        if (!entry.due_date || !Array.isArray(entry.reminder_days_before) || entry.reminder_days_before.length === 0) {
          continue;
        }
        const dueThisMonth = computeDueDateThisMonthFromStored(entry.due_date, now);
        if (!dueThisMonth) continue;
        const expenseLabel = (entry.notes ?? entry.note ?? "Expense").trim() || "Expense";
        for (const reminderDay of entry.reminder_days_before) {
          if (reminderDay !== 0 && reminderDay !== 1 && reminderDay !== 3) continue;
          const reminderDate = addDays(dueThisMonth, -reminderDay);
          if (formatYmdLocal(reminderDate) !== todayYmd) continue;
          pending.push({
            dedupeKey: `expense:${entry.id}:${todayYmd}:d-${reminderDay}`,
            title: reminderDay === 0 ? `Due today: ${expenseLabel}` : `Expense reminder: ${expenseLabel}`,
            body:
              reminderDay === 0
                ? "This expense is due today."
                : `Due in ${reminderDay} day${reminderDay === 1 ? "" : "s"}.`,
          });
        }
      }

      for (const item of (toDoRows ?? []) as ToDoTargetRow[]) {
        pending.push({
          dedupeKey: `todo:${item.id}:${todayYmd}`,
          title: `To-do target today: ${item.name}`,
          body: "This task reaches its target date today.",
        });
      }

      if (pending.length === 0) continue;

      const { data: insertedLogs, error: logsError } = await supabase
        .from("reminder_email_logs")
        .upsert(
          pending.map((item) => ({
            user_id: profile.user_id,
            dedupe_key: item.dedupeKey,
          })),
          { onConflict: "user_id,dedupe_key", ignoreDuplicates: true }
        )
        .select("dedupe_key");

      if (logsError) {
        errors.push(`log upsert failed for user ${profile.user_id}: ${logsError.message}`);
        continue;
      }

      const insertedKeys = new Set((insertedLogs ?? []).map((r) => String(r.dedupe_key)));
      const newlyPending = pending.filter((item) => insertedKeys.has(item.dedupeKey));
      if (newlyPending.length === 0) continue;

      const from = process.env.REMINDER_FROM_EMAIL?.trim() || "OmniTrak <reminders@omnitrak.cloud>";
      const sendResult = await sendReminderEmail({
        to: toEmail,
        from,
        items: newlyPending,
        todayYmd,
      });

      if (!sendResult.ok) {
        errors.push(`email send failed for user ${profile.user_id}: ${sendResult.error}`);
        continue;
      }
      sentEmails += 1;
    }

    return NextResponse.json(
      {
        ok: true,
        date: todayYmd,
        processedUsers,
        sentEmails,
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
