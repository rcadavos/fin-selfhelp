// Server-side helpers shared by the ingestion actions and the chat route.
// Plain module (NOT "use server") so it can export non-action helpers.

import type { SupabaseClient } from "@supabase/supabase-js";
import { chunkText } from "./chunk";

export type IngestResult = { chunkCount: number; tokenCount: number };

/** Resolve the current user's profile id, creating the profile row if missing. */
export async function getProfileId(
  supabase: SupabaseClient,
): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (profile) return profile.id;

  const { data: created } = await supabase
    .from("profiles")
    .insert({ user_id: user.id, net_take_home: 0, currency: "PHP" })
    .select("id")
    .single();
  return created?.id ?? null;
}

/**
 * Chunk → embed → store chunks for a single document. The pgvector column needs
 * the embedding as a JSON-array string (a JS array would serialize to a Postgres
 * array literal, which the `vector` type rejects).
 */
export async function ingestDocumentContent(
  supabase: SupabaseClient,
  profileId: string,
  documentId: string,
  rawText: string,
): Promise<IngestResult> {
  const chunks = chunkText(rawText);
  if (chunks.length === 0) {
    throw new Error("No readable text was found to index.");
  }

  // Lazy-load the embedding stack (pulls in the "ai" SDK) only when we actually
  // ingest — keeps the common, lightweight actions free of it.
  const { embedTexts } = await import("./embed");
  const embeddings = await embedTexts(chunks.map((c) => c.content));

  const rows = chunks.map((chunk, index) => ({
    document_id: documentId,
    profile_id: profileId,
    chunk_index: index,
    content: chunk.content,
    embedding: JSON.stringify(embeddings[index]),
    token_count: chunk.tokenCount,
  }));

  const { error } = await supabase.from("ai_document_chunks").insert(rows);
  if (error) throw new Error(error.message);

  const tokenCount = chunks.reduce((sum, c) => sum + c.tokenCount, 0);
  return { chunkCount: chunks.length, tokenCount };
}

export function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : "Something went wrong.";
}
