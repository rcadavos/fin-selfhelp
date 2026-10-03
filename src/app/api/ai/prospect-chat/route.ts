import { NextResponse } from "next/server";
import { streamText, type ModelMessage } from "ai";
import { getSubscriptionPlans } from "@/actions/subscription-plan";
import {
  SUBSCRIPTION_PLAN_FALLBACK,
  SUBSCRIPTION_PREMIUM_FALLBACK,
} from "@/lib/query/subscription-plan";
import { buildProspectSystemPrompt } from "@/lib/ai/prospect-system-prompt";
import { resolveChatModelId, isAiConfigured } from "@/lib/ai/gateway";
import { createRateLimiter, getClientIp } from "@/lib/utils/rate-limit";
import {
  PROSPECT_CHAT_MAX_HISTORY,
  PROSPECT_CHAT_MAX_MESSAGE_CHARS,
  PROSPECT_CHAT_MAX_OUTPUT_TOKENS,
  PROSPECT_CHAT_RATE_LIMIT_PER_HOUR,
  PROSPECT_CHAT_RATE_LIMIT_PER_MINUTE,
} from "@/lib/constants/prospect-chat";

/**
 * Public chat for landing-page visitors asking about the app. No session, no
 * tools, no user data: the model only sees the product fact sheet, so the
 * guardrails are the per-IP rate limits, the history/length caps and the output
 * token ceiling — this endpoint is open to anyone.
 */
export const dynamic = "force-dynamic";
export const maxDuration = 30;

const perMinute = createRateLimiter({ limit: PROSPECT_CHAT_RATE_LIMIT_PER_MINUTE, windowMs: 60_000 });
const perHour = createRateLimiter({ limit: PROSPECT_CHAT_RATE_LIMIT_PER_HOUR, windowMs: 60 * 60_000 });

/**
 * Rebuilds the history as plain text turns. The client's UIMessages are never
 * passed through as-is — only user/assistant text survives, so a crafted
 * request can't smuggle in system messages, tool calls or oversized payloads.
 */
function toModelMessages(raw: unknown): ModelMessage[] {
  if (!Array.isArray(raw)) return [];
  return raw.slice(-PROSPECT_CHAT_MAX_HISTORY).flatMap((message): ModelMessage[] => {
    const role = message?.role;
    if ((role !== "user" && role !== "assistant") || !Array.isArray(message.parts)) return [];
    const text = message.parts
      .filter((p: unknown): p is { type: "text"; text: string } =>
        typeof p === "object" && p !== null && (p as { type?: unknown }).type === "text" &&
        typeof (p as { text?: unknown }).text === "string",
      )
      .map((p: { text: string }) => p.text)
      .join("")
      .trim()
      .slice(0, PROSPECT_CHAT_MAX_MESSAGE_CHARS);
    return text ? [{ role, content: text }] : [];
  });
}

export async function POST(req: Request) {
  if (!isAiConfigured()) {
    return NextResponse.json(
      { error: "Chat answers aren't available right now.", code: "unavailable" },
      { status: 503 },
    );
  }

  const ip = getClientIp(req.headers);
  if (perMinute(ip) || perHour(ip)) {
    return NextResponse.json(
      { error: "Too many messages — please wait a moment.", code: "rate_limited" },
      { status: 429 },
    );
  }

  const body = await req.json().catch(() => null);
  const messages = toModelMessages(body?.messages);
  if (messages.at(-1)?.role !== "user") {
    return NextResponse.json({ error: "No question provided.", code: "bad_request" }, { status: 400 });
  }

  const plansRow = await getSubscriptionPlans();

  const result = streamText({
    model: resolveChatModelId(),
    instructions: buildProspectSystemPrompt({
      pro: plansRow.pro ?? SUBSCRIPTION_PLAN_FALLBACK,
      premium: plansRow.premium ?? SUBSCRIPTION_PREMIUM_FALLBACK,
    }),
    messages,
    maxOutputTokens: PROSPECT_CHAT_MAX_OUTPUT_TOKENS,
    temperature: 0.3,
    // Stop generating (and billing) when the visitor closes the tab mid-answer.
    abortSignal: req.signal,
  });

  return result.toUIMessageStreamResponse();
}
