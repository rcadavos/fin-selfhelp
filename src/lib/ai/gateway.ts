// Central model resolution for the Vercel AI Gateway.
//
// AI SDK v7 routes plain "provider/model" strings through the global gateway
// provider when AI_GATEWAY_API_KEY is set (or via Vercel OIDC in production), so
// callers pass the validated string id straight into streamText/embed/embedMany.
// Keeping resolution here means provider/model choices live in one place.

import {
  AI_CHAT_MODELS,
  DEFAULT_CHAT_MODEL_ID,
  EMBEDDING_MODEL_ID,
} from "@/lib/constants/ai";

/** True when chat/embeddings can actually run (gateway key configured). */
export function isAiConfigured(): boolean {
  return Boolean(process.env.AI_GATEWAY_API_KEY);
}

/** Whether a model id is one we expose in the switcher (guards client input). */
export function isAllowedChatModel(id: string | undefined | null): id is string {
  return Boolean(id) && AI_CHAT_MODELS.some((m) => m.id === id);
}

/**
 * Resolve a requested chat model id to a safe gateway model string, falling back
 * to the default when the request is missing or not in the allow-list.
 */
export function resolveChatModelId(requested?: string | null): string {
  return isAllowedChatModel(requested) ? requested : DEFAULT_CHAT_MODEL_ID;
}

/** Embedding model id used for both ingestion and query embedding. */
export function embeddingModelId(): string {
  return EMBEDDING_MODEL_ID;
}
