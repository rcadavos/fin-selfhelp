// App-level types for the AI Assistant feature. DB row shapes mirror the columns
// declared in supabase/migrations/090_ai_assistant.sql.

export type AiDocumentSourceType = "upload" | "url" | "text";
export type AiDocumentStatus = "processing" | "ready" | "error";

export type AiDocument = {
  id: string;
  title: string;
  source_type: AiDocumentSourceType;
  source_url: string | null;
  storage_path: string | null;
  status: AiDocumentStatus;
  error: string | null;
  chunk_count: number;
  token_count: number;
  created_at: string;
  updated_at: string;
};

export type AiConversation = {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
};

/** A source chunk surfaced to the user under an assistant answer. */
export type AiCitation = {
  documentId: string;
  documentTitle: string;
  snippet: string;
  similarity: number;
};

export type AiMessageRole = "user" | "assistant" | "system";

export type AiMessageRecord = {
  id: string;
  conversation_id: string;
  role: AiMessageRole;
  content: string;
  citations: AiCitation[];
  created_at: string;
};

/** Result row from the match_document_chunks RPC. */
export type MatchedChunk = {
  id: string;
  document_id: string;
  document_title: string;
  content: string;
  similarity: number;
};
