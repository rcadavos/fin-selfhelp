import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { getDueDayOfMonthFromYmd } from "@/lib/expense-due-date";
import { hasProLevelProductAccess, normalizeDbTier } from "@/lib/subscription-tier";
import { isReminderReleaseHour } from "@/lib/reminder-release-time";
import { getBaseUrl } from "@/lib/seo";

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
  reminder_channel: string | null;
};

type BillReminderRow = {
  id: string;
  note: string | null;
  due_date: string | null;
  reminder_days_before: number[] | null;
  reminder_channel: string | null;
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
  const siteUrl = getBaseUrl();
  const textLines = [
    `OmniTrak reminder summary for ${params.todayYmd}`,
    "",
    "You have reminders scheduled in OmniTrak:",
    "",
    ...params.items.map((item) => `- ${item.title}: ${item.body}`),
    "",
    "Review and manage your reminders in OmniTrak:",
    `${siteUrl}/dashboard/notifications`,
    "",
    "If you no longer wish to receive reminder emails, update your notification preferences in OmniTrak.",
    "",
    "Thank you,",
    "The OmniTrak Team",
  ];

  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>OmniTrak reminders</title>
  </head>
  <body style="margin:0;padding:0;background:#f6f8fb;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f6f8fb;padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:600px;background:#ffffff;border:1px solid #e2e8f0;border-radius:14px;overflow:hidden;">
            <tr>
              <td align="center" style="padding:28px 24px 14px 24px;">
                <img
                  src="${siteUrl}/omnitrak-logo.png"
                  alt="OmniTrak"
                  width="160"
                  style="display:block;width:160px;max-width:100%;height:auto;border:0;outline:none;text-decoration:none;"
                />
              </td>
            </tr>
            <tr>
              <td style="padding:0 24px 0 24px;text-align:center;">
                <h1 style="margin:0;font-size:24px;line-height:1.3;font-weight:700;color:#0f172a;">
                  Today’s reminders from OmniTrak
                </h1>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 24px 0 24px;">
                <p style="margin:0;font-size:15px;line-height:1.7;color:#334155;">
                  Here are your scheduled reminders for <strong>${params.todayYmd}</strong>. Review them in OmniTrak to keep your bills and tasks on track.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 24px 0 24px;">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:separate;border-spacing:0;">
                  ${params.items
                    .map(
                      (item) => `
                    <tr>
                      <td style="padding:12px 16px;border:1px solid #e2e8f0;border-radius:10px;margin-bottom:10px;">
                        <p style="margin:0;font-size:15px;font-weight:600;color:#0f172a;">${item.title.replace(/</g, "&lt;")}</p>
                        <p style="margin:6px 0 0 0;font-size:14px;line-height:1.7;color:#475569;">${item.body.replace(/</g, "&lt;")}</p>
                      </td>
                    </tr>`
                    )
                    .join("")}
                </table>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:24px 24px 8px 24px;">
                <a
                  href="${siteUrl}/dashboard/notifications"
                  style="display:inline-block;background:#16A34A;color:#ffffff;text-decoration:none;font-size:14px;font-weight:500;line-height:20px;padding:12px 18px;border-radius:8px;"
                >
                  View reminders in OmniTrak
                </a>
              </td>
            </tr>
            <tr>
              <td style="padding:12px 24px 0 24px;">
                <p style="margin:0;font-size:13px;line-height:1.7;color:#64748b;text-align:center;">
                  If you do not wish to receive reminder emails, please update your notification preferences in OmniTrak.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 24px 24px 24px;">
                <p style="margin:0;font-size:12px;line-height:1.7;color:#94a3b8;text-align:center;">
                  OmniTrak • Your all-in-one personal tracker for expenses, payments, and reminders
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

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

    const { getCandidateDueDates } = await import("@/lib/expense-due-date");

    for (const profile of (profiles ?? []) as ProfileRow[]) {
      const tier = normalizeDbTier(profile.subscription_tier);
      const hasProAccess = hasProLevelProductAccess(
        tier,
        profile.subscription_ends_at,
        Boolean(profile.is_subscriber)
      );

      processedUsers += 1;

      const billsQuery = supabase
        .from("bills")
        .select("id, note, due_date, reminder_days_before, reminder_channel")
        .eq("profile_id", profile.id)
        .not("reminder_days_before", "is", null);

      const authUserPromise = supabase.auth.admin.getUserById(profile.user_id);

      let expenses: ExpenseReminderRow[] = [];
      let toDoRows: ToDoTargetRow[] = [];

      if (hasProAccess) {
        const [{ data: expData }, { data: todoData }] = await Promise.all([
          supabase
            .from("expense_entries")
            .select("id, note, notes, due_date, reminder_days_before, reminder_channel")
            .eq("profile_id", profile.id),
          supabase
            .from("to_do_items")
            .select("id, name, target_date")
            .eq("profile_id", profile.id)
            .eq("checked", false)
            .eq("target_date", todayYmd),
        ]);
        expenses = (expData ?? []) as ExpenseReminderRow[];
        toDoRows = (todoData ?? []) as ToDoTargetRow[];
      }

      const [{ data: billsRaw }, authUserResult] = await Promise.all([billsQuery, authUserPromise]);

      const toEmail = authUserResult.data.user?.email?.trim();
      if (!toEmail) continue;

      const pending: PendingReminder[] = [];
      const notificationsToInsert: any[] = [];

      for (const bill of (billsRaw ?? []) as BillReminderRow[]) {
        if (!bill.due_date || !Array.isArray(bill.reminder_days_before) || bill.reminder_days_before.length === 0) {
          continue;
        }
        const candidates = getCandidateDueDates(bill.due_date, now);
        const billLabel = (bill.note ?? "Bill").trim() || "Bill";
        const channel = bill.reminder_channel || "both";

        for (const dueThisMonth of candidates) {
          for (const reminderDay of bill.reminder_days_before) {
            if (reminderDay !== 0 && reminderDay !== 1 && reminderDay !== 3) continue;
            const reminderDate = addDays(dueThisMonth, -reminderDay);
            if (formatYmdLocal(reminderDate) !== todayYmd) continue;

            const dedupeKey = `bill:${bill.id}:${formatYmdLocal(dueThisMonth)}:d-${reminderDay}`;
            const title = reminderDay === 0 ? `Due today: ${billLabel}` : `Bill reminder: ${billLabel}`;
            const body = reminderDay === 0
              ? "This bill is due today. Please review and settle it."
              : `Due in ${reminderDay} day${reminderDay === 1 ? "" : "s"}.`;

            if (channel === "email" || channel === "both") {
              pending.push({ dedupeKey, title, body });
            }
            if (channel === "in-app" || channel === "both") {
              notificationsToInsert.push({
                user_id: profile.user_id,
                kind: "expense_reminder",
                dedupe_key: dedupeKey,
                title,
                body,
              });
            }
          }
        }
      }

      for (const entry of expenses) {
        if (!entry.due_date || !Array.isArray(entry.reminder_days_before) || entry.reminder_days_before.length === 0) {
          continue;
        }
        const candidates = getCandidateDueDates(entry.due_date, now);
        const expenseLabel = (entry.notes ?? entry.note ?? "Expense").trim() || "Expense";
        const channel = entry.reminder_channel || "both";

        for (const dueThisMonth of candidates) {
          for (const reminderDay of entry.reminder_days_before) {
            if (reminderDay !== 0 && reminderDay !== 1 && reminderDay !== 3) continue;
            const reminderDate = addDays(dueThisMonth, -reminderDay);
            if (formatYmdLocal(reminderDate) !== todayYmd) continue;

            const dedupeKey = `expense:${entry.id}:${formatYmdLocal(dueThisMonth)}:d-${reminderDay}`;
            const title = reminderDay === 0 ? `Due today: ${expenseLabel}` : `Expense reminder: ${expenseLabel}`;
            const body = reminderDay === 0
              ? "This expense is due today. Please review and settle it."
              : `Due in ${reminderDay} day${reminderDay === 1 ? "" : "s"}.`;

            if (channel === "email" || channel === "both") {
              pending.push({ dedupeKey, title, body });
            }
            if (channel === "in-app" || channel === "both") {
              notificationsToInsert.push({
                user_id: profile.user_id,
                kind: "expense_reminder",
                dedupe_key: dedupeKey,
                title,
                body,
              });
            }
          }
        }
      }

      for (const item of toDoRows) {
        const dedupeKey = `todo:${item.id}:${todayYmd}`;
        const title = `To-do target today: ${item.name}`;
        const body = "This task reaches its target date today.";

        pending.push({ dedupeKey, title, body });
        notificationsToInsert.push({
          user_id: profile.user_id,
          kind: "todo_target_date",
          dedupe_key: dedupeKey,
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
          .upsert(notificationsToInsert, { onConflict: "user_id,dedupe_key", ignoreDuplicates: true }),
      ]);

      if (logsResult.error) {
        errors.push(`log upsert failed for user ${profile.user_id}: ${logsResult.error.message}`);
        continue;
      }
      if (notificationsResult.error) {
        errors.push(`notification upsert failed for user ${profile.user_id}: ${notificationsResult.error.message}`);
      }

      const insertedLogs = logsResult.data;

      const insertedKeys = new Set((insertedLogs ?? []).map((r) => String(r.dedupe_key)));
      const newlyPending = pending.filter((item) => insertedKeys.has(item.dedupeKey));
      
      if (newlyPending.length > 0) {
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
