import { NextResponse } from "next/server";
import {
  streamText,
  convertToModelMessages,
  stepCountIs,
  type UIMessage,
} from "ai";
import { createClient } from "@/lib/supabase/server";
import { getSubscriptionCapabilities } from "@/actions/subscription-capabilities";
import { getProfileId } from "@/lib/ai/server";
import { retrieveContext } from "@/lib/ai/retrieve";
import { buildAssistantTools } from "@/lib/ai/tools";
import { buildSystemPrompt } from "@/lib/ai/system-prompt";
import { resolveChatModelId, isAiConfigured } from "@/lib/ai/gateway";
import { MAX_CHAT_STEPS, CHAT_RATE_LIMIT_PER_MINUTE } from "@/lib/constants/ai";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Best-effort per-profile rate limit. In-memory, so it resets per serverless
// instance — enough to blunt accidental floods, not a hard quota.
const rateBuckets = new Map<string, number[]>();
function isRateLimited(profileId: string): boolean {
  const now = Date.now();
  const windowStart = now - 60_000;
  const hits = (rateBuckets.get(profileId) ?? []).filter((t) => t > windowStart);
  if (hits.length >= CHAT_RATE_LIMIT_PER_MINUTE) {
    rateBuckets.set(profileId, hits);
    return true;
  }
  hits.push(now);
  rateBuckets.set(profileId, hits);
  return false;
}

function latestUserText(messages: UIMessage[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i];
    if (message.role !== "user") continue;
    return message.parts
      .filter((p): p is { type: "text"; text: string } => p.type === "text")
      .map((p) => p.text)
      .join(" ")
      .trim();
  }
  return "";
}

export async function POST(req: Request) {
  if (!isAiConfigured()) {
    return NextResponse.json(
      { error: "AI is not configured. Add AI_GATEWAY_API_KEY to enable it." },
      { status: 503 },
    );
  }

  const supabase = await createClient();
  const profileId = await getProfileId(supabase);
  if (!profileId) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const caps = await getSubscriptionCapabilities();
  if (!caps?.hasPremiumAccess) {
    return NextResponse.json(
      { error: "AI Assistant is a Premium feature." },
      { status: 403 },
    );
  }

  if (isRateLimited(profileId)) {
    return NextResponse.json(
      { error: "Too many messages — please wait a moment." },
      { status: 429 },
    );
  }

  const body = await req.json().catch(() => null);
  const messages: UIMessage[] = Array.isArray(body?.messages) ? body.messages : [];
  const requestedModel: string | undefined = body?.modelId;
  let conversationId: string | undefined = body?.conversationId;

  if (messages.length === 0) {
    return NextResponse.json({ error: "No messages provided." }, { status: 400 });
  }

  const userText = latestUserText(messages);

  // Resolve (or create) the conversation, validating ownership.
  if (conversationId) {
    const { data } = await supabase
      .from("ai_conversations")
      .select("id")
      .eq("id", conversationId)
      .eq("profile_id", profileId)
      .maybeSingle();
    if (!data) conversationId = undefined;
  }
  if (!conversationId) {
    const { data } = await supabase
      .from("ai_conversations")
      .insert({ profile_id: profileId, title: userText.slice(0, 60) || "New chat" })
      .select("id")
      .single();
    conversationId = data?.id;
  }
  if (!conversationId) {
    return NextResponse.json(
      { error: "Could not start a conversation." },
      { status: 500 },
    );
  }
  const convId = conversationId;

  // Persist the user's message.
  if (userText) {
    await supabase.from("ai_messages").insert({
      conversation_id: convId,
      profile_id: profileId,
      role: "user",
      content: userText,
    });
  }

  // RAG: retrieve relevant document context for the latest question.
  const { contextText, citations } = await retrieveContext(
    supabase,
    profileId,
    userText,
  );
  const { count: readyDocs } = await supabase
    .from("ai_documents")
    .select("id", { count: "exact", head: true })
    .eq("profile_id", profileId)
    .eq("status", "ready");

  const result = streamText({
    model: resolveChatModelId(requestedModel),
    system: buildSystemPrompt({
      contextText,
      hasDocuments: (readyDocs ?? 0) > 0,
    }),
    messages: await convertToModelMessages(messages),
    tools: buildAssistantTools(supabase, profileId),
    stopWhen: stepCountIs(MAX_CHAT_STEPS),
    temperature: 0.3,
    onFinish: async ({ text, usage }) => {
      await supabase.from("ai_messages").insert({
        conversation_id: convId,
        profile_id: profileId,
        role: "assistant",
        content: text ?? "",
        citations,
        usage: usage ?? null,
      });
      await supabase
        .from("ai_conversations")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", convId)
        .eq("profile_id", profileId);
    },
  });

  return result.toUIMessageStreamResponse({
    messageMetadata: ({ part }) => {
      if (part.type === "finish") return { conversationId: convId, citations };
    },
  });
}
