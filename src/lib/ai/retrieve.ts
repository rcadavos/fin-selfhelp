// RAG retrieval: embed a query and pull the most similar document chunks for the
// current profile via the match_document_chunks RPC (RLS-guarded + profile-scoped).

import type { SupabaseClient } from "@supabase/supabase-js";
import { embedQuery } from "./embed";
import { RETRIEVAL_TOP_K, RETRIEVAL_MIN_SIMILARITY } from "@/lib/constants/ai";
import type { AiCitation, MatchedChunk } from "@/types/ai.types";

export type RetrievalResult = {
  chunks: MatchedChunk[];
  citations: AiCitation[];
  /** Pre-formatted block to inject into the model context. */
  contextText: string;
};

const EMPTY: RetrievalResult = { chunks: [], citations: [], contextText: "" };

function toCitations(chunks: MatchedChunk[]): AiCitation[] {
  const byDoc = new Map<string, AiCitation>();
  for (const c of chunks) {
    const existing = byDoc.get(c.document_id);
    if (!existing || c.similarity > existing.similarity) {
      byDoc.set(c.document_id, {
        documentId: c.document_id,
        documentTitle: c.document_title,
        snippet: c.content.slice(0, 160).trim(),
        similarity: Number(c.similarity.toFixed(3)),
      });
    }
  }
  return [...byDoc.values()].sort((a, b) => b.similarity - a.similarity);
}

export async function retrieveContext(
  supabase: SupabaseClient,
  profileId: string,
  query: string,
  topK: number = RETRIEVAL_TOP_K,
): Promise<RetrievalResult> {
  const trimmed = query.trim();
  if (!trimmed) return EMPTY;

  const queryEmbedding = await embedQuery(trimmed);
  const { data, error } = await supabase.rpc("match_document_chunks", {
    query_embedding: JSON.stringify(queryEmbedding),
    match_count: topK,
    p_profile_id: profileId,
  });
  if (error || !data) return EMPTY;

  const chunks = (data as MatchedChunk[]).filter(
    (c) => c.similarity >= RETRIEVAL_MIN_SIMILARITY,
  );
  if (chunks.length === 0) return EMPTY;

  const contextText = chunks
    .map((c, i) => `[Source ${i + 1} — ${c.document_title}]\n${c.content}`)
    .join("\n\n---\n\n");

  return { chunks, citations: toCitations(chunks), contextText };
}
