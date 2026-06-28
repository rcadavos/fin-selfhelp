"use server";

import { createClient } from "@/lib/supabase/server";
import { getSubscriptionCapabilities } from "@/actions/subscription-capabilities";
import {
  getProfileId,
  ingestDocumentContent,
  errorMessage,
} from "@/lib/ai/server";
import {
  extractFromBuffer,
  extractFromUrl,
  isUrlIngestionConfigured,
} from "@/lib/ai/extract";
import { isAiConfigured } from "@/lib/ai/gateway";
import { MAX_DOCUMENTS_PER_USER, STORAGE_BUCKET } from "@/lib/constants/ai";
import type {
  AiConversation,
  AiDocument,
  AiMessageRecord,
} from "@/types/ai.types";

const PREMIUM_REQUIRED = "AI Assistant is a Premium feature.";
const NOT_LOGGED_IN = "Not logged in.";

/** Capability + config flags the assistant UI needs up front. */
export async function getAiAssistantInfo(): Promise<{
  hasPremiumAccess: boolean;
  aiConfigured: boolean;
  urlIngestionEnabled: boolean;
}> {
  const caps = await getSubscriptionCapabilities();
  return {
    hasPremiumAccess: Boolean(caps?.hasPremiumAccess),
    aiConfigured: isAiConfigured(),
    urlIngestionEnabled: isUrlIngestionConfigured(),
  };
}

// ── Documents ───────────────────────────────────────────────────────────────

export async function loadAiDocuments(): Promise<{
  documents: AiDocument[];
  error?: string;
}> {
  const supabase = await createClient();
  const profileId = await getProfileId(supabase);
  if (!profileId) return { documents: [], error: NOT_LOGGED_IN };

  const { data, error } = await supabase
    .from("ai_documents")
    .select(
      "id, title, source_type, source_url, storage_path, status, error, chunk_count, token_count, created_at, updated_at",
    )
    .eq("profile_id", profileId)
    .order("created_at", { ascending: false });

  if (error) return { documents: [], error: error.message };
  return { documents: (data ?? []) as AiDocument[] };
}

async function assertCanIngest(): Promise<
  { profileId: string } | { error: string }
> {
  const supabase = await createClient();
  const profileId = await getProfileId(supabase);
  if (!profileId) return { error: NOT_LOGGED_IN };

  const caps = await getSubscriptionCapabilities();
  if (!caps?.hasPremiumAccess) return { error: PREMIUM_REQUIRED };

  if (!isAiConfigured()) {
    return { error: "AI is not configured. Add AI_GATEWAY_API_KEY to enable it." };
  }

  const { count } = await supabase
    .from("ai_documents")
    .select("id", { count: "exact", head: true })
    .eq("profile_id", profileId);
  if ((count ?? 0) >= MAX_DOCUMENTS_PER_USER) {
    return { error: `You can store up to ${MAX_DOCUMENTS_PER_USER} documents.` };
  }

  return { profileId };
}

/** Ingest pasted/typed text as a knowledge-base document. */
export async function ingestTextDocument(
  title: string,
  text: string,
): Promise<{ documentId?: string; error?: string }> {
  const gate = await assertCanIngest();
  if ("error" in gate) return { error: gate.error };

  const body = text.trim();
  if (!body) return { error: "There's no text to add." };

  const supabase = await createClient();
  const { data: doc, error: insertError } = await supabase
    .from("ai_documents")
    .insert({
      profile_id: gate.profileId,
      title: title.trim() || "Untitled note",
      source_type: "text",
      status: "processing",
    })
    .select("id")
    .single();
  if (insertError || !doc) {
    return { error: insertError?.message ?? "Could not create the document." };
  }

  return finishIngestion(gate.profileId, doc.id, body);
}

/** Ingest a URL by crawling it to Markdown via Firecrawl. */
export async function ingestUrlDocument(
  url: string,
): Promise<{ documentId?: string; error?: string }> {
  const gate = await assertCanIngest();
  if ("error" in gate) return { error: gate.error };

  const trimmed = url.trim();
  try {
    new URL(trimmed);
  } catch {
    return { error: "Please enter a valid URL (including https://)." };
  }
  if (!isUrlIngestionConfigured()) {
    return { error: "URL ingestion is not configured (missing FIRECRAWL_API_KEY)." };
  }

  const supabase = await createClient();
  let hostname = trimmed;
  try {
    hostname = new URL(trimmed).hostname.replace(/^www\./, "");
  } catch {
    /* keep raw url */
  }

  const { data: doc, error: insertError } = await supabase
    .from("ai_documents")
    .insert({
      profile_id: gate.profileId,
      title: hostname,
      source_type: "url",
      source_url: trimmed,
      status: "processing",
    })
    .select("id")
    .single();
  if (insertError || !doc) {
    return { error: insertError?.message ?? "Could not create the document." };
  }

  try {
    const { text, title } = await extractFromUrl(trimmed);
    await supabase
      .from("ai_documents")
      .update({ title })
      .eq("id", doc.id)
      .eq("profile_id", gate.profileId);
    return finishIngestion(gate.profileId, doc.id, text);
  } catch (e) {
    await markDocumentError(doc.id, gate.profileId, errorMessage(e));
    return { error: errorMessage(e) };
  }
}

/**
 * Ingest a file that the client already uploaded to the `ai-documents` bucket
 * under `{userId}/...`. We download it server-side, extract, chunk, and embed.
 */
export async function ingestUploadedDocument(
  storagePath: string,
  title: string,
  mimeType: string,
): Promise<{ documentId?: string; error?: string }> {
  const gate = await assertCanIngest();
  if ("error" in gate) return { error: gate.error };

  const supabase = await createClient();
  const { data: doc, error: insertError } = await supabase
    .from("ai_documents")
    .insert({
      profile_id: gate.profileId,
      title: title.trim() || "Uploaded file",
      source_type: "upload",
      storage_path: storagePath,
      status: "processing",
    })
    .select("id")
    .single();
  if (insertError || !doc) {
    return { error: insertError?.message ?? "Could not create the document." };
  }

  try {
    const { data: file, error: downloadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .download(storagePath);
    if (downloadError || !file) {
      throw new Error(downloadError?.message ?? "Could not read the uploaded file.");
    }
    const buffer = await file.arrayBuffer();
    const text = await extractFromBuffer(buffer, mimeType, storagePath);
    return finishIngestion(gate.profileId, doc.id, text);
  } catch (e) {
    await markDocumentError(doc.id, gate.profileId, errorMessage(e));
    return { error: errorMessage(e) };
  }
}

async function finishIngestion(
  profileId: string,
  documentId: string,
  text: string,
): Promise<{ documentId?: string; error?: string }> {
  const supabase = await createClient();
  try {
    const { chunkCount, tokenCount } = await ingestDocumentContent(
      supabase,
      profileId,
      documentId,
      text,
    );
    await supabase
      .from("ai_documents")
      .update({
        status: "ready",
        chunk_count: chunkCount,
        token_count: tokenCount,
        error: null,
      })
      .eq("id", documentId)
      .eq("profile_id", profileId);
    return { documentId };
  } catch (e) {
    await markDocumentError(documentId, profileId, errorMessage(e));
    return { error: errorMessage(e) };
  }
}

async function markDocumentError(
  documentId: string,
  profileId: string,
  message: string,
): Promise<void> {
  const supabase = await createClient();
  await supabase
    .from("ai_documents")
    .update({ status: "error", error: message })
    .eq("id", documentId)
    .eq("profile_id", profileId);
}

export async function deleteAiDocument(
  documentId: string,
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const profileId = await getProfileId(supabase);
  if (!profileId) return { error: NOT_LOGGED_IN };

  const { data: doc } = await supabase
    .from("ai_documents")
    .select("storage_path")
    .eq("id", documentId)
    .eq("profile_id", profileId)
    .maybeSingle();

  if (doc?.storage_path) {
    await supabase.storage.from(STORAGE_BUCKET).remove([doc.storage_path]);
  }

  const { error } = await supabase
    .from("ai_documents")
    .delete()
    .eq("id", documentId)
    .eq("profile_id", profileId);
  if (error) return { error: error.message };
  return {};
}

// ── Conversations + messages ─────────────────────────────────────────────────

export async function loadAiConversations(): Promise<{
  conversations: AiConversation[];
  error?: string;
}> {
  const supabase = await createClient();
  const profileId = await getProfileId(supabase);
  if (!profileId) return { conversations: [], error: NOT_LOGGED_IN };

  const { data, error } = await supabase
    .from("ai_conversations")
    .select("id, title, created_at, updated_at")
    .eq("profile_id", profileId)
    .order("updated_at", { ascending: false });

  if (error) return { conversations: [], error: error.message };
  return { conversations: (data ?? []) as AiConversation[] };
}

export async function loadAiMessages(
  conversationId: string,
): Promise<{ messages: AiMessageRecord[]; error?: string }> {
  const supabase = await createClient();
  const profileId = await getProfileId(supabase);
  if (!profileId) return { messages: [], error: NOT_LOGGED_IN };

  const { data, error } = await supabase
    .from("ai_messages")
    .select("id, conversation_id, role, content, citations, created_at")
    .eq("conversation_id", conversationId)
    .eq("profile_id", profileId)
    .order("created_at", { ascending: true });

  if (error) return { messages: [], error: error.message };
  return { messages: (data ?? []) as AiMessageRecord[] };
}

export async function renameAiConversation(
  conversationId: string,
  title: string,
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const profileId = await getProfileId(supabase);
  if (!profileId) return { error: NOT_LOGGED_IN };

  const { error } = await supabase
    .from("ai_conversations")
    .update({ title: title.trim() || "New chat" })
    .eq("id", conversationId)
    .eq("profile_id", profileId);
  if (error) return { error: error.message };
  return {};
}

export async function deleteAiConversation(
  conversationId: string,
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const profileId = await getProfileId(supabase);
  if (!profileId) return { error: NOT_LOGGED_IN };

  const { error } = await supabase
    .from("ai_conversations")
    .delete()
    .eq("id", conversationId)
    .eq("profile_id", profileId);
  if (error) return { error: error.message };
  return {};
}
