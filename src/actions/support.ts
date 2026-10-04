"use server";

import { headers } from "next/headers";
import { sendSupportRequestEmail, type SupportTranscriptLine } from "@/lib/email";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { getAdminAlertRecipients } from "@/lib/constants/admin-alerts";
import { createRateLimiter, getClientIp } from "@/lib/utils/rate-limit";
import {
  PROSPECT_CHAT_MAX_MESSAGE_CHARS,
  SUPPORT_EMAIL_MAX_CHARS,
  SUPPORT_MESSAGE_MAX_CHARS,
  SUPPORT_MESSAGE_MIN_CHARS,
  SUPPORT_NAME_MAX_CHARS,
  SUPPORT_RATE_LIMIT_COUNT,
  SUPPORT_RATE_LIMIT_WINDOW_MS,
  SUPPORT_TRANSCRIPT_MAX_MESSAGES,
} from "@/lib/constants/prospect-chat";
import {
  ADMIN_SUPPORT_REQUESTS_LIMIT,
  SUPPORT_REQUEST_STATUSES,
  type SupportRequestStatus,
} from "@/lib/constants/support-requests";

export type SupportRequestForAdmin = {
  id: string;
  name: string | null;
  email: string;
  message: string;
  transcript: SupportTranscriptLine[];
  status: SupportRequestStatus;
  /** False when the notification email failed: the request is only in /admin/support. */
  emailSent: boolean;
  createdAt: string;
  resolvedAt: string | null;
};

export type AdminSupportInbox = {
  /** Newest first, capped at ADMIN_SUPPORT_REQUESTS_LIMIT. */
  requests: SupportRequestForAdmin[];
  /** Totals across the whole table, not just the loaded rows. */
  counts: Record<SupportRequestStatus, number>;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const isRateLimited = createRateLimiter({
  limit: SUPPORT_RATE_LIMIT_COUNT,
  windowMs: SUPPORT_RATE_LIMIT_WINDOW_MS,
});

/** Where support requests land: the public support inbox when set, else the admin alert inbox. */
function getSupportRecipients(): string[] {
  const supportEmail = process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim();
  return supportEmail?.includes("@") ? [supportEmail] : getAdminAlertRecipients();
}

function sanitizeTranscript(raw: unknown): SupportTranscriptLine[] {
  if (!Array.isArray(raw)) return [];
  return raw.slice(-SUPPORT_TRANSCRIPT_MAX_MESSAGES).flatMap((line): SupportTranscriptLine[] => {
    const role = line?.role;
    const text = typeof line?.text === "string" ? line.text.trim() : "";
    if ((role !== "user" && role !== "assistant") || !text) return [];
    return [{ role, text: text.slice(0, PROSPECT_CHAT_MAX_MESSAGE_CHARS) }];
  });
}

/** Stores the request so it shows in /admin/support even when the email never arrives. */
async function saveSupportRequest(row: {
  name: string | null;
  email: string;
  message: string;
  transcript: SupportTranscriptLine[];
  emailSent: boolean;
}): Promise<{ ok: boolean; error?: string }> {
  try {
    const { error } = await createServiceRoleClient().from("support_requests").insert({
      name: row.name,
      email: row.email,
      message: row.message,
      transcript: row.transcript,
      email_sent: row.emailSent,
    });
    if (error) return { ok: false, error: `Saving support request failed: ${error.message}` };
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: `Saving support request failed: ${message}` };
  }
}

/** Service-role client plus the caller's id, or an error when the caller is not an admin. */
async function getAdminContext(): Promise<
  { admin: ReturnType<typeof createServiceRoleClient>; userId: string } | { error: string }
> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not logged in." };
  const admin = createServiceRoleClient();
  const { data: profile } = await admin.from("profiles").select("is_admin").eq("user_id", user.id).maybeSingle();
  if (!profile?.is_admin) return { error: "Forbidden." };
  return { admin, userId: user.id };
}

/**
 * "Contact support" from the landing-page chat. Public — visitors have no
 * account — so it is rate limited per IP and carries a honeypot field.
 */
export async function submitSupportRequest(params: {
  name?: string | null;
  email: string;
  message: string;
  transcript?: SupportTranscriptLine[];
  /** Honeypot: hidden from people, filled in by bots. */
  website?: string;
}): Promise<{ error?: string }> {
  // Report success to bots so they don't retry with the field left empty.
  if (params.website?.trim()) return {};

  // Strip line breaks from the name: it lands in the email body next to headers.
  const name = (params.name ?? "").replace(/[\r\n]+/g, " ").trim().slice(0, SUPPORT_NAME_MAX_CHARS);
  const email = (params.email ?? "").trim();
  const message = (params.message ?? "").trim();

  if (!EMAIL_PATTERN.test(email) || email.length > SUPPORT_EMAIL_MAX_CHARS) {
    return { error: "Enter a valid email so we can reply." };
  }
  if (message.length < SUPPORT_MESSAGE_MIN_CHARS) {
    return { error: `Tell us a little more — at least ${SUPPORT_MESSAGE_MIN_CHARS} characters.` };
  }
  if (message.length > SUPPORT_MESSAGE_MAX_CHARS) {
    return { error: `Keep it under ${SUPPORT_MESSAGE_MAX_CHARS.toLocaleString("en-US")} characters.` };
  }

  if (isRateLimited(getClientIp(await headers()))) {
    return { error: "You've sent a few messages already. Please wait a few minutes and try again." };
  }

  const transcript = sanitizeTranscript(params.transcript);

  const result = await sendSupportRequestEmail({
    to: getSupportRecipients(),
    name: name || null,
    email,
    message,
    transcript,
  });
  if (!result.ok) console.error(result.error);

  const saved = await saveSupportRequest({ name: name || null, email, message, transcript, emailSent: result.ok });
  if (!saved.ok) console.error(saved.error);

  // Either copy reaching the team is enough: the inbox, or /admin/support.
  if (!result.ok && !saved.ok) {
    return { error: "We couldn't send your message just now. Please try again in a moment." };
  }
  return {};
}

/** Admin only: the support inbox at /admin/support. */
export async function getSupportRequestsForAdmin(): Promise<{ inbox: AdminSupportInbox; error?: string }> {
  const empty: AdminSupportInbox = { requests: [], counts: { open: 0, resolved: 0 } };

  try {
    const ctx = await getAdminContext();
    if ("error" in ctx) return { inbox: empty, error: ctx.error };
    const { admin } = ctx;

    const countByStatus = (status: SupportRequestStatus) =>
      admin.from("support_requests").select("id", { count: "exact", head: true }).eq("status", status);

    const [list, open, resolved] = await Promise.all([
      admin
        .from("support_requests")
        .select("id, name, email, message, transcript, status, email_sent, created_at, resolved_at")
        .order("created_at", { ascending: false })
        .limit(ADMIN_SUPPORT_REQUESTS_LIMIT),
      countByStatus("open"),
      countByStatus("resolved"),
    ]);
    const error = list.error ?? open.error ?? resolved.error;
    if (error) return { inbox: empty, error: error.message };

    return {
      inbox: {
        requests: (list.data ?? []).map((r) => ({
          id: r.id,
          name: r.name ?? null,
          email: r.email,
          message: r.message,
          transcript: sanitizeTranscript(r.transcript),
          status: r.status === "resolved" ? "resolved" : "open",
          emailSent: Boolean(r.email_sent),
          createdAt: r.created_at,
          resolvedAt: r.resolved_at ?? null,
        })),
        counts: { open: open.count ?? 0, resolved: resolved.count ?? 0 },
      },
    };
  } catch (e) {
    return { inbox: empty, error: e instanceof Error ? e.message : "Failed to load support requests." };
  }
}

/** Admin only: mark a request resolved, or reopen it. */
export async function setSupportRequestStatus(
  requestId: string,
  status: SupportRequestStatus
): Promise<{ error?: string }> {
  if (!SUPPORT_REQUEST_STATUSES.includes(status)) return { error: "Unknown status." };

  try {
    const ctx = await getAdminContext();
    if ("error" in ctx) return { error: ctx.error };

    const resolved = status === "resolved";
    const { error } = await ctx.admin
      .from("support_requests")
      .update({
        status,
        resolved_at: resolved ? new Date().toISOString() : null,
        resolved_by: resolved ? ctx.userId : null,
      })
      .eq("id", requestId);
    if (error) return { error: error.message };
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to update the request." };
  }
}

/** Admin only: permanently delete a request (spam, duplicates). */
export async function deleteSupportRequest(requestId: string): Promise<{ error?: string }> {
  try {
    const ctx = await getAdminContext();
    if ("error" in ctx) return { error: ctx.error };

    const { error } = await ctx.admin.from("support_requests").delete().eq("id", requestId);
    if (error) return { error: error.message };
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to delete the request." };
  }
}
