"use server";

import { headers } from "next/headers";
import { sendSupportRequestEmail, type SupportTranscriptLine } from "@/lib/email";
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

  const result = await sendSupportRequestEmail({
    to: getSupportRecipients(),
    name: name || null,
    email,
    message,
    transcript: sanitizeTranscript(params.transcript),
  });

  if (!result.ok) {
    console.error(result.error);
    return { error: "We couldn't send your message just now. Please try again in a moment." };
  }
  return {};
}
