// AI Assistant configuration — model registry, embedding + chunking params, and
// ingestion limits. Everything here is reusable across the chat route, ingestion
// pipeline, and UI. Models are referenced as Vercel AI Gateway "provider/model"
// strings so there is no provider lock-in (OpenAI / Claude / Gemini, switchable).

export type AiProvider = "openai" | "anthropic" | "google";

export type AiChatModel = {
  /** Vercel AI Gateway model id, e.g. "openai/gpt-4o-mini". */
  id: string;
  /** Short label shown in the provider switcher. */
  label: string;
  provider: AiProvider;
  /** One-line capability hint shown under the label. */
  hint: string;
};

/**
 * Chat models offered in the provider switcher. Exact gateway slugs depend on
 * what your AI Gateway has enabled — edit this list to match availability.
 */
export const AI_CHAT_MODELS: AiChatModel[] = [
  { id: "openai/gpt-4o-mini", label: "GPT-4o mini", provider: "openai", hint: "Fast & economical • default" },
  { id: "openai/gpt-4o", label: "GPT-4o", provider: "openai", hint: "Most capable OpenAI" },
  { id: "anthropic/claude-3.5-sonnet", label: "Claude 3.5 Sonnet", provider: "anthropic", hint: "Strong reasoning" },
  { id: "google/gemini-2.0-flash", label: "Gemini 2.0 Flash", provider: "google", hint: "Fast Google model" },
];

export const DEFAULT_CHAT_MODEL_ID = AI_CHAT_MODELS[0].id;

/** Embedding model + dimensions — must match the vector(N) column in migration 090. */
export const EMBEDDING_MODEL_ID = "openai/text-embedding-3-small";
export const EMBEDDING_DIMENSIONS = 1536;

// ── Chunking ──────────────────────────────────────────────────────────────
// Char-based approximation (~4 chars/token) so we avoid a tokenizer dependency.
export const CHUNK_SIZE_CHARS = 2000; // ~500 tokens
export const CHUNK_OVERLAP_CHARS = 240; // ~60 tokens
export const APPROX_CHARS_PER_TOKEN = 4;

// ── Retrieval ───────────────────────────────────────────────────────────────
export const RETRIEVAL_TOP_K = 5;
/** Chunks below this cosine similarity are dropped from the context. */
export const RETRIEVAL_MIN_SIMILARITY = 0.2;

// ── Ingestion limits ──────────────────────────────────────────────────────
export const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024; // 10 MB (matches storage bucket cap)
export const MAX_DOCUMENTS_PER_USER = 50;
export const STORAGE_BUCKET = "ai-documents";

export const ALLOWED_DOC_MIME_TYPES = [
  "application/pdf",
  "text/plain",
  "text/markdown",
] as const;

export const ALLOWED_DOC_EXTENSIONS = [".pdf", ".txt", ".md", ".markdown"] as const;

// ── Chat limits ───────────────────────────────────────────────────────────
/** Max tool-call round-trips before the model must produce a final answer. */
export const MAX_CHAT_STEPS = 5;
/** Simple per-user rate limit for the chat endpoint. */
export const CHAT_RATE_LIMIT_PER_MINUTE = 20;
