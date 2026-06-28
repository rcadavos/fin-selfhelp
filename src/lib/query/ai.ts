import { queryOptions } from "@tanstack/react-query";
import {
  getAiAssistantInfo,
  loadAiConversations,
  loadAiDocuments,
  loadAiMessages,
} from "@/actions/ai";
import type {
  AiConversation,
  AiDocument,
  AiMessageRecord,
} from "@/types/ai.types";
import { queryKeys } from "./keys";

export function aiAssistantInfoQueryOptions() {
  return queryOptions({
    queryKey: queryKeys.aiAssistantInfo(),
    queryFn: () => Promise.resolve().then(() => getAiAssistantInfo()),
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}

export function aiDocumentsQueryOptions() {
  return queryOptions({
    queryKey: queryKeys.aiDocuments(),
    queryFn: () =>
      Promise.resolve().then(async (): Promise<AiDocument[]> => {
        const res = await loadAiDocuments();
        if (res.error) throw new Error(res.error);
        return res.documents;
      }),
    refetchOnWindowFocus: false,
  });
}

export function aiConversationsQueryOptions() {
  return queryOptions({
    queryKey: queryKeys.aiConversations(),
    queryFn: () =>
      Promise.resolve().then(async (): Promise<AiConversation[]> => {
        const res = await loadAiConversations();
        if (res.error) throw new Error(res.error);
        return res.conversations;
      }),
    refetchOnWindowFocus: false,
  });
}

export function aiMessagesQueryOptions(conversationId: string) {
  return queryOptions({
    queryKey: queryKeys.aiMessages(conversationId),
    queryFn: () =>
      Promise.resolve().then(async (): Promise<AiMessageRecord[]> => {
        const res = await loadAiMessages(conversationId);
        if (res.error) throw new Error(res.error);
        return res.messages;
      }),
    refetchOnWindowFocus: false,
  });
}
