"use client";

import { useRef, useState } from "react";
import { useQuery, useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import type { UIMessage } from "ai";
import {
  Plus,
  Trash2,
  MessageSquare,
  BookOpen,
  MessagesSquare,
  Sparkles,
  Loader2,
  TriangleAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ConfirmDialog } from "@/components/app/confirm-dialog";
import { useSnackbar } from "@/components/ui/snackbar-provider";
import { AssistantChat } from "@/components/app/ai/assistant-chat";
import { DocumentManager } from "@/components/app/ai/document-manager";
import {
  aiAssistantInfoQueryOptions,
  aiConversationsQueryOptions,
  aiMessagesQueryOptions,
} from "@/lib/query/ai";
import { queryKeys } from "@/lib/query/keys";
import { deleteAiConversation } from "@/actions/ai";
import type { AiConversation, AiMessageRecord } from "@/types/ai.types";

type View = "chat" | "chats" | "knowledge";

function toUiMessages(records: AiMessageRecord[]): UIMessage[] {
  return records
    .filter((r) => r.role !== "system")
    .map(
      (r) =>
        ({
          id: r.id,
          role: r.role,
          parts: [{ type: "text", text: r.content }],
          metadata:
            r.role === "assistant" && r.citations?.length
              ? { citations: r.citations }
              : undefined,
        }) as UIMessage,
    );
}

export function AssistantWorkspace() {
  const { data: info } = useSuspenseQuery(aiAssistantInfoQueryOptions());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [chatKey, setChatKey] = useState<string>("new:0");
  const [view, setView] = useState<View>("chat");
  const newCounter = useRef(0);

  const messagesQuery = useQuery({
    ...aiMessagesQueryOptions(selectedId ?? "none"),
    enabled: Boolean(selectedId),
  });

  const isLoadingExisting = Boolean(selectedId) && chatKey === selectedId;
  const initialMessages = isLoadingExisting
    ? toUiMessages(messagesQuery.data ?? [])
    : [];
  const conversationProp = isLoadingExisting ? selectedId ?? undefined : undefined;

  function newChat() {
    newCounter.current += 1;
    setSelectedId(null);
    setChatKey(`new:${newCounter.current}`);
    setView("chat");
  }
  function selectConversation(id: string) {
    setSelectedId(id);
    setChatKey(id);
    setView("chat");
  }
  function handleCreated(id: string) {
    // A new conversation was just created mid-stream — track it for highlighting
    // without remounting the active chat (keep chatKey as the "new:" key).
    setSelectedId(id);
  }

  const showKnowledge = view === "knowledge";
  const showChatsList = view === "chats";
  const showChat = !showKnowledge && !showChatsList;
  const showLoading = isLoadingExisting && messagesQuery.isPending;
  const showLoadError = isLoadingExisting && messagesQuery.isError;

  return (
    <div className="container mx-auto flex h-full min-h-0 max-w-6xl flex-col px-4 py-4 sm:py-6">
      <header className="mb-4 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="flex items-center gap-2 text-xl font-semibold tracking-tight sm:text-2xl">
            <Sparkles className="h-6 w-6 shrink-0 text-primary" aria-hidden />
            Ask OmniTrak
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Your private AI assistant for your finances and documents.
          </p>
        </div>
        <Button onClick={newChat} className="shrink-0 gap-1.5">
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">New chat</span>
        </Button>
      </header>

      {!info.aiConfigured && (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-warning">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            AI isn&apos;t configured yet. Add <code>AI_GATEWAY_API_KEY</code> to your
            environment to start chatting.
          </span>
        </div>
      )}

      {/* Mobile tab switcher */}
      <div className="mb-3 flex gap-1 rounded-lg bg-muted p-1 lg:hidden">
        <MobileTab icon={MessageSquare} label="Chat" active={showChat} onClick={() => setView("chat")} />
        <MobileTab icon={MessagesSquare} label="Chats" active={showChatsList} onClick={() => setView("chats")} />
        <MobileTab icon={BookOpen} label="Knowledge" active={showKnowledge} onClick={() => setView("knowledge")} />
      </div>

      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[280px_1fr]">
        {/* Desktop conversations rail */}
        <aside className="hidden min-h-0 flex-col rounded-lg border bg-card p-3 lg:flex">
          <ConversationsPanel
            selectedId={selectedId}
            onSelect={selectConversation}
            onNew={newChat}
          />
        </aside>

        {/* Main pane */}
        <section className="flex min-h-0 flex-col rounded-lg border bg-card p-3">
          {/* Desktop knowledge toggle */}
          <div className="mb-2 hidden items-center justify-end lg:flex">
            <Button
              variant={showKnowledge ? "secondary" : "ghost"}
              size="sm"
              className="gap-1.5"
              onClick={() => setView(showKnowledge ? "chat" : "knowledge")}
            >
              <BookOpen className="h-4 w-4" />
              Knowledge base
            </Button>
          </div>

          {/* Knowledge */}
          <div className={cn("min-h-0 flex-1", showKnowledge ? "flex flex-col" : "hidden")}>
            <DocumentManager urlIngestionEnabled={info.urlIngestionEnabled} />
          </div>

          {/* Mobile conversations list */}
          <div className={cn("min-h-0 flex-1 lg:hidden", showChatsList ? "flex flex-col" : "hidden")}>
            <ConversationsPanel
              selectedId={selectedId}
              onSelect={selectConversation}
              onNew={newChat}
            />
          </div>

          {/* Chat */}
          <div className={cn("min-h-0 flex-1 flex-col", showChat ? "flex" : "hidden")}>
            {showLoading ? (
              <div className="flex flex-1 items-center justify-center text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : showLoadError ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 px-4 text-center text-sm text-muted-foreground">
                <TriangleAlert className="h-6 w-6 text-warning" />
                <p>Couldn&apos;t load this conversation.</p>
                <Button variant="outline" size="sm" onClick={() => messagesQuery.refetch()}>
                  Retry
                </Button>
              </div>
            ) : (
              <AssistantChat
                key={chatKey}
                conversationId={conversationProp}
                initialMessages={initialMessages}
                onConversationCreated={handleCreated}
              />
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function MobileTab({
  icon: Icon,
  label,
  active,
  onClick,
}: {
  icon: typeof MessageSquare;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium transition-colors",
        active ? "bg-background text-foreground" : "text-muted-foreground",
      )}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}

function ConversationsPanel({
  selectedId,
  onSelect,
  onNew,
}: {
  selectedId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
}) {
  const { data: conversations } = useSuspenseQuery(aiConversationsQueryOptions());
  const queryClient = useQueryClient();
  const { showError } = useSnackbar();
  const [toDelete, setToDelete] = useState<AiConversation | null>(null);

  async function confirmDelete() {
    if (!toDelete) return;
    const wasSelected = toDelete.id === selectedId;
    const res = await deleteAiConversation(toDelete.id);
    if (res.error) showError(res.error);
    else {
      await queryClient.invalidateQueries({ queryKey: queryKeys.aiConversations() });
      if (wasSelected) onNew();
    }
    setToDelete(null);
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center justify-between pb-2">
        <h2 className="text-sm font-semibold">Chats</h2>
        <Button size="icon-sm" variant="ghost" onClick={onNew} aria-label="New chat">
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      <div className="min-h-0 flex-1 space-y-1 overflow-y-auto [scrollbar-width:thin]">
        {conversations.length === 0 ? (
          <p className="px-1 py-4 text-xs text-muted-foreground">
            No chats yet. Start by asking a question.
          </p>
        ) : (
          conversations.map((conv) => (
            <div
              key={conv.id}
              className={cn(
                "group flex items-center gap-1 rounded-lg pr-1 transition-colors",
                conv.id === selectedId ? "bg-primary/15" : "hover:bg-muted",
              )}
            >
              <button
                type="button"
                onClick={() => onSelect(conv.id)}
                className={cn(
                  "min-w-0 flex-1 truncate px-2.5 py-2 text-left text-sm",
                  conv.id === selectedId ? "text-primary" : "text-foreground",
                )}
              >
                {conv.title}
              </button>
              <Button
                size="icon-xs"
                variant="ghost"
                onClick={() => setToDelete(conv)}
                aria-label={`Delete ${conv.title}`}
                className="shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-destructive"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))
        )}
      </div>

      <ConfirmDialog
        open={Boolean(toDelete)}
        onOpenChange={(o) => !o && setToDelete(null)}
        title="Delete this chat?"
        description={`"${toDelete?.title}" and its messages will be permanently removed.`}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={confirmDelete}
      />
    </div>
  );
}
