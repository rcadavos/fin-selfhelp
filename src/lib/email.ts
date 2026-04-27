import nodemailer from "nodemailer";
import { getBaseUrl } from "@/lib/seo";

function getSmtpConfig() {
  const host = process.env.SMTP_HOST?.trim();
  const portRaw = process.env.SMTP_PORT?.trim();
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();

  if (!host || !portRaw || !user || !pass) {
    throw new Error("SMTP_HOST, SMTP_PORT, SMTP_USER, and SMTP_PASS must all be set");
  }

  const port = Number(portRaw);
  if (!Number.isFinite(port) || port <= 0) {
    throw new Error("SMTP_PORT must be a valid positive number");
  }

  const secure = String(process.env.SMTP_SECURE ?? "").toLowerCase() === "true";
  return { host, port, secure, user, pass };
}

function createTransporter() {
  const { host, port, secure, user, pass } = getSmtpConfig();
  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });
}

function getFromAddress() {
  return process.env.REMINDER_FROM_EMAIL?.trim() ?? "OmniTrak <hello@omnitrak.cloud>";
}

export async function sendWelcomeEmail(params: {
  to: string;
  name?: string;
}): Promise<{ ok: boolean; error?: string }> {
  const siteUrl = getBaseUrl();
  const firstName = params.name?.split(" ")[0]?.trim() || "there";

  const subject = "Welcome to OmniTrak 🎉";

  const text = [
    `Hi ${firstName},`,
    "",
    "Welcome to OmniTrak — your all-in-one personal finance tracker.",
    "",
    "Here's what you can do right away:",
    "• Track your expenses and categorize spending",
    "• Manage recurring bills and never miss a due date",
    "• Set savings goals and monitor progress",
    "• Manage your to-buy and to-do lists",
    "• Use built-in debt payoff and savings calculators",
    "",
    "Get started here:",
    `${siteUrl}/dashboard`,
    "",
    "If you have any questions, feel free to reach out.",
    "",
    "Thanks for joining,",
    "The OmniTrak Team",
  ].join("\n");

  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Welcome to OmniTrak</title>
  </head>
  <body style="margin:0;padding:0;background:#f6f8fb;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f6f8fb;padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:600px;background:#ffffff;border:1px solid #e2e8f0;border-radius:14px;overflow:hidden;">

            <!-- Logo -->
            <tr>
              <td align="center" style="padding:32px 24px 16px 24px;">
                <img
                  src="${siteUrl}/omnitrak-logo.png"
                  alt="OmniTrak"
                  width="160"
                  style="display:block;width:160px;max-width:100%;height:auto;border:0;outline:none;text-decoration:none;"
                />
              </td>
            </tr>

            <!-- Heading -->
            <tr>
              <td style="padding:0 24px;text-align:center;">
                <h1 style="margin:0;font-size:26px;line-height:1.3;font-weight:700;color:#0f172a;">
                  Welcome to OmniTrak, ${firstName}! 🎉
                </h1>
              </td>
            </tr>

            <!-- Intro -->
            <tr>
              <td style="padding:16px 24px 0 24px;">
                <p style="margin:0;font-size:15px;line-height:1.7;color:#334155;">
                  Your account is all set. OmniTrak helps you stay on top of your finances — tracking expenses, bills, goals, and more in one place.
                </p>
              </td>
            </tr>

            <!-- Feature list -->
            <tr>
              <td style="padding:20px 24px 0 24px;">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">

                  <tr>
                    <td style="padding:12px 16px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;">
                      <p style="margin:0;font-size:14px;font-weight:700;color:#0f172a;">💰 Expense Tracker</p>
                      <p style="margin:4px 0 0 0;font-size:13px;line-height:1.6;color:#475569;">Log daily spending and categorize your expenses to see where your money goes.</p>
                    </td>
                  </tr>

                  <tr><td style="padding:6px 0;"></td></tr>

                  <tr>
                    <td style="padding:12px 16px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;">
                      <p style="margin:0;font-size:14px;font-weight:700;color:#0f172a;">📋 Bills Board</p>
                      <p style="margin:4px 0 0 0;font-size:13px;line-height:1.6;color:#475569;">Track recurring bills, mark them paid, and set due dates so nothing slips through.</p>
                    </td>
                  </tr>

                  <tr><td style="padding:6px 0;"></td></tr>

                  <tr>
                    <td style="padding:12px 16px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;">
                      <p style="margin:0;font-size:14px;font-weight:700;color:#0f172a;">🎯 Goals & Savings</p>
                      <p style="margin:4px 0 0 0;font-size:13px;line-height:1.6;color:#475569;">Set short-term and long-term savings goals and track your progress toward them.</p>
                    </td>
                  </tr>

                  <tr><td style="padding:6px 0;"></td></tr>

                  <tr>
                    <td style="padding:12px 16px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;">
                      <p style="margin:0;font-size:14px;font-weight:700;color:#0f172a;">🧮 Calculators</p>
                      <p style="margin:4px 0 0 0;font-size:13px;line-height:1.6;color:#475569;">Use the debt payoff and savings calculators to plan your financial future.</p>
                    </td>
                  </tr>

                </table>
              </td>
            </tr>

            <!-- CTA -->
            <tr>
              <td align="center" style="padding:28px 24px 8px 24px;">
                <a
                  href="${siteUrl}/dashboard"
                  style="display:inline-block;background:#16A34A;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;line-height:20px;padding:14px 32px;border-radius:8px;"
                >
                  Go to your Dashboard →
                </a>
              </td>
            </tr>

            <!-- Upgrade nudge -->
            <tr>
              <td style="padding:16px 24px 0 24px;">
                <p style="margin:0;font-size:13px;line-height:1.7;color:#64748b;text-align:center;">
                  Want email reminders for bills and partner sharing? Upgrade to <a href="${siteUrl}/account/subscription" style="color:#16A34A;text-decoration:none;font-weight:600;">Pro</a> anytime.
                </p>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="padding:20px 24px 28px 24px;">
                <p style="margin:0;font-size:12px;line-height:1.7;color:#94a3b8;text-align:center;">
                  OmniTrak &bull; Your all-in-one personal tracker for expenses, payments, and reminders
                </p>
              </td>
            </tr>

          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  try {
    const transporter = createTransporter();
    await transporter.sendMail({
      from: getFromAddress(),
      to: params.to,
      subject,
      text,
      html,
    });
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: `Welcome email failed: ${message}` };
  }
}

export async function sendPhoneChangedEmail(params: {
  to: string;
  name?: string;
  newPhone: string;
}): Promise<{ ok: boolean; error?: string }> {
  const siteUrl = getBaseUrl();
  const firstName = params.name?.split(" ")[0]?.trim() || "there";
  const subject = "Your phone number was updated — OmniTrak";

  const text = [
    `Hi ${firstName},`,
    "",
    "This is a confirmation that the phone number on your OmniTrak account has been updated.",
    "",
    `New phone number: ${params.newPhone}`,
    "",
    "If you made this change, no further action is needed.",
    "",
    "If you did not make this change, please secure your account immediately:",
    `${siteUrl}/account/security`,
    "",
    "— The OmniTrak Team",
  ].join("\n");

  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Phone number updated</title>
  </head>
  <body style="margin:0;padding:0;background:#f6f8fb;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f6f8fb;padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:600px;background:#ffffff;border:1px solid #e2e8f0;border-radius:14px;overflow:hidden;">

            <!-- Logo -->
            <tr>
              <td align="center" style="padding:28px 24px 14px 24px;">
                <img src="${siteUrl}/omnitrak-logo.png" alt="OmniTrak" width="160" style="display:block;width:160px;max-width:100%;height:auto;border:0;" />
              </td>
            </tr>

            <!-- Heading -->
            <tr>
              <td style="padding:8px 24px 0 24px;text-align:center;">
                <h1 style="margin:0;font-size:24px;line-height:1.3;font-weight:700;color:#0f172a;">Phone number updated</h1>
              </td>
            </tr>

            <!-- Body -->
            <tr>
              <td style="padding:16px 24px 0 24px;">
                <p style="margin:0;font-size:15px;line-height:1.7;color:#334155;">
                  Hi ${firstName}, the phone number on your OmniTrak account has been successfully updated.
                </p>
              </td>
            </tr>

            <!-- New phone highlight -->
            <tr>
              <td style="padding:20px 24px 0 24px;">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                  <tr>
                    <td style="padding:14px 18px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;">
                      <p style="margin:0;font-size:13px;font-weight:600;color:#15803d;text-transform:uppercase;letter-spacing:0.05em;">New phone number</p>
                      <p style="margin:4px 0 0 0;font-size:16px;font-weight:700;color:#0f172a;">${params.newPhone}</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- Security note -->
            <tr>
              <td style="padding:20px 24px 0 24px;">
                <p style="margin:0;font-size:13px;line-height:1.7;color:#64748b;">
                  If you made this change, no further action is needed. If you did not request this update, please secure your account immediately.
                </p>
              </td>
            </tr>

            <!-- CTA -->
            <tr>
              <td align="center" style="padding:20px 24px 8px 24px;">
                <a href="${siteUrl}/account/security" style="display:inline-block;background:#16A34A;color:#ffffff;text-decoration:none;font-size:14px;font-weight:500;line-height:20px;padding:10px 16px;border-radius:6px;">Review Account Security</a>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="padding:22px 24px 24px 24px;">
                <p style="margin:0;font-size:12px;line-height:1.7;color:#94a3b8;text-align:center;">OmniTrak &bull; Your all-in-one personal tracker for everything</p>
              </td>
            </tr>

          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  try {
    const transporter = createTransporter();
    await transporter.sendMail({
      from: getFromAddress(),
      to: params.to,
      subject,
      text,
      html,
    });
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: `Phone changed email failed: ${message}` };
  }
}

export async function sendReminderEmail(params: {
  to: string;
  items: { title: string; body: string }[];
  todayYmd: string;
}): Promise<{ ok: boolean; error?: string }> {
  const siteUrl = getBaseUrl();
  const subject = `OmniTrak reminders for ${params.todayYmd}`;

  const text = [
    `OmniTrak reminder summary for ${params.todayYmd}`,
    "",
    "You have reminders scheduled in OmniTrak:",
    "",
    ...params.items.map((item) => `- ${item.title}: ${item.body}`),
    "",
    `Review and manage your reminders: ${siteUrl}/dashboard/notifications`,
    "",
    "If you no longer wish to receive reminder emails, update your notification preferences in OmniTrak.",
  ].join("\n");

  const itemRows = params.items
    .map(
      (item) => `
            <tr>
              <td style="padding:0 0 8px 0;">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                  <tr>
                    <td style="padding:12px 16px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;">
                      <p style="margin:0;font-size:14px;font-weight:700;color:#0f172a;">${item.title.replace(/</g, "&lt;")}</p>
                      <p style="margin:5px 0 0 0;font-size:13px;line-height:1.6;color:#475569;">${item.body.replace(/</g, "&lt;")}</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>`
    )
    .join("");

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

            <!-- Logo -->
            <tr>
              <td align="center" style="padding:28px 24px 14px 24px;">
                <img src="${siteUrl}/omnitrak-logo.png" alt="OmniTrak" width="160" style="display:block;width:160px;max-width:100%;height:auto;border:0;outline:none;text-decoration:none;" />
              </td>
            </tr>

            <!-- Heading -->
            <tr>
              <td style="padding:0 24px 0 24px;text-align:center;">
                <h1 style="margin:0;font-size:24px;line-height:1.3;font-weight:700;color:#0f172a;">Today&apos;s reminders</h1>
              </td>
            </tr>

            <!-- Intro -->
            <tr>
              <td style="padding:14px 24px 0 24px;">
                <p style="margin:0;font-size:15px;line-height:1.7;color:#334155;">
                  Here are your scheduled reminders for <strong>${params.todayYmd}</strong>. Review them in OmniTrak to keep your bills and tasks on track.
                </p>
              </td>
            </tr>

            <!-- Items -->
            <tr>
              <td style="padding:20px 24px 0 24px;">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                  ${itemRows}
                </table>
              </td>
            </tr>

            <!-- CTA -->
            <tr>
              <td align="center" style="padding:24px 24px 8px 24px;">
                <a href="${siteUrl}/dashboard/notifications" style="display:inline-block;background:#16A34A;color:#ffffff;text-decoration:none;font-size:14px;font-weight:500;line-height:20px;padding:12px 18px;border-radius:8px;">View reminders in OmniTrak</a>
              </td>
            </tr>

            <!-- Unsub note -->
            <tr>
              <td style="padding:12px 24px 0 24px;">
                <p style="margin:0;font-size:13px;line-height:1.7;color:#64748b;text-align:center;">
                  To stop receiving reminder emails, update your notification preferences in OmniTrak.
                </p>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="padding:20px 24px 24px 24px;">
                <p style="margin:0;font-size:12px;line-height:1.7;color:#94a3b8;text-align:center;">
                  OmniTrak &bull; Your all-in-one personal tracker for expenses, payments, and reminders
                </p>
              </td>
            </tr>

          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  try {
    const transporter = createTransporter();
    await transporter.sendMail({
      from: getFromAddress(),
      to: params.to,
      subject,
      text,
      html,
    });
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: `Reminder email failed: ${message}` };
  }
}
