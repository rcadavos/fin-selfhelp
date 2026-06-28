// Embedding helpers. Routed through the Vercel AI Gateway via plain model-id
// strings (AI SDK v7 resolves these against the global gateway provider when
// AI_GATEWAY_API_KEY is set). Server-only — imported from actions / route handlers.

import { embed, embedMany } from "ai";
import { embeddingModelId } from "./gateway";

/** Embed many chunk texts in one batched call. Returns vectors in input order. */
export async function embedTexts(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  const { embeddings } = await embedMany({
    model: embeddingModelId(),
    values: texts,
  });
  return embeddings;
}

/** Embed a single query string for similarity search. */
export async function embedQuery(text: string): Promise<number[]> {
  const { embedding } = await embed({
    model: embeddingModelId(),
    value: text,
  });
  return embedding;
}
