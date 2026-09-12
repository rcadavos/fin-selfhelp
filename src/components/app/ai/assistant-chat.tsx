"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowUp, Square, Sparkles, FileText, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useSnackbar } from "@/components/ui/snackbar-provider";
import { ProviderSwitcher } from "@/components/app/ai/provider-switcher";
import { queryKeys } from "@/lib/query/keys";
import { DEFAULT_CHAT_MODEL_ID } from "@/lib/constants/ai";
import type { AiCitation } from "@/types/ai.types";

type ChatMetadata = { conversationId?: string; citations?: AiCitation[] };

const SUGGESTIONS = [
  "How am I doing on my budget this month?",
  "What are my account balances?",
  "Summarize my savings goals.",
  "Did my spending go up last month?",
];

export function AssistantChat({
  conversationId,
  initialMessages,
  onConversationCreated,
  compact = false,
}: {
  conversationId?: string;
  initialMessages?: UIMessage[];
  onConversationCreated?: (id: string) => void;
  compact?: boolean;
}) {
  const queryClient = useQueryClient();
  const { showError } = useSnackbar();
  const [modelId, setModelId] = useState(DEFAULT_CHAT_MODEL_ID);
  const [input, setInput] = useState("");

  // Refs so the transport always sends the latest values without rebuilding it.
  const modelIdRef = useRef(modelId);
  modelIdRef.current = modelId;
  const conversationIdRef = useRef<string | undefined>(conversationId);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/ai/chat",
        body: () => ({
          modelId: modelIdRef.current,
          conversationId: conversationIdRef.current,
        }),
      }),
    [],
  );

  const { messages, sendMessage, status, error, stop } = useChat({
    transport,
    messages: initialMessages,
    onFinish: ({ message }) => {
      const meta = message.metadata as ChatMetadata | undefined;
      if (meta?.conversationId && !conversationIdRef.current) {
        conversationIdRef.current = meta.conversationId;
        onConversationCreated?.(meta.conversationId);
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.aiConversations() });
    },
  });

  useEffect(() => {
    if (error) showError(error.message || "Something went wrong. Please try again.");
  }, [error, showError]);

  const busy = status === "submitted" || status === "streaming";

  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy]);

  function submit() {
    const text = input.trim();
    if (!text || busy) return;
    setInput("");
    sendMessage({ text });
  }

  const isEmpty = messages.length === 0;

  return (
    <div className="flex h-full min-h-0 flex-col">
      {!compact && (
        <div className="flex items-center justify-between gap-2 border-b px-1 pb-3">
          <ProviderSwitcher value={modelId} onChange={setModelId} />
        </div>
      )}

      <div
        ref={scrollRef}
        className="min-h-0 flex-1 space-y-4 overflow-y-auto px-1 py-4 [scrollbar-width:thin]"
      >
        {isEmpty ? (
          <EmptyState compact={compact} onPick={(q) => sendMessage({ text: q })} />
        ) : (
          messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))
        )}
        {status === "submitted" && <ThinkingIndicator />}
      </div>

      <div className="border-t pt-3">
        {compact && (
          <div className="mb-2">
            <ProviderSwitcher value={modelId} onChange={setModelId} compact />
          </div>
        )}
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            rows={1}
            placeholder="Ask about your finances or documents…"
            className="max-h-32 min-h-[40px] flex-1 resize-none rounded-xl border border-input bg-background px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          />
          {busy ? (
            <Button type="button" size="icon" variant="outline" onClick={() => stop()} aria-label="Stop">
              <Square className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              type="button"
              size="icon"
              onClick={submit}
              disabled={!input.trim()}
              aria-label="Send message"
            >
              <ArrowUp className="h-4 w-4" />
            </Button>
          )}
        </div>
        <p className="mt-1.5 px-1 text-[10px] text-muted-foreground">
          OmniTrak Assistant can make mistakes • verify important figures
        </p>
      </div>
    </div>
  );
}

function EmptyState({ compact, onPick }: { compact: boolean; onPick: (q: string) => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 px-4 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/15 text-primary">
        <Sparkles className="h-6 w-6" />
      </span>
      <div>
        <p className="text-sm font-semibold">Ask OmniTrak</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Your private assistant for your finances and uploaded documents.
        </p>
      </div>
      <div className={cn("grid w-full gap-2", compact ? "grid-cols-1" : "sm:grid-cols-2")}>
        {SUGGESTIONS.map((q) => (
          <button
            key={q}
            type="button"
            onClick={() => onPick(q)}
            className="surface border bg-muted/30 px-3 py-2 text-left text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: UIMessage }) {
  const isUser = message.role === "user";
  const text = message.parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join("");
  const toolNames = [
    ...new Set(
      message.parts
        .filter((p) => p.type.startsWith("tool-") || p.type === "dynamic-tool")
        .map((p) => p.type.replace(/^tool-/, "")),
    ),
  ];
  const citations = (message.metadata as ChatMetadata | undefined)?.citations ?? [];

  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[85%] rounded-lg px-4 py-2.5 text-sm",
          isUser
            ? "rounded-br-sm bg-primary text-primary-foreground"
            : "rounded-bl-sm bg-muted text-foreground",
        )}
      >
        {!isUser && toolNames.length > 0 && (
          <div className="mb-1.5 flex flex-wrap items-center gap-1 text-[10px] text-muted-foreground">
            <Wrench className="h-3 w-3" />
            {toolNames.map((t) => (
              <span key={t} className="rounded bg-background/60 px-1.5 py-0.5">
                {humanizeTool(t)}
              </span>
            ))}
          </div>
        )}
        <div className="whitespace-pre-wrap leading-relaxed">{text}</div>
        {!isUser && citations.length > 0 && <Citations items={citations} />}
      </div>
    </div>
  );
}

function Citations({ items }: { items: AiCitation[] }) {
  return (
    <div className="mt-2.5 border-t border-border/60 pt-2">
      <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        Sources
      </p>
      <ul className="space-y-1">
        {items.map((c) => (
          <li key={c.documentId} className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
            <FileText className="mt-0.5 h-3 w-3 shrink-0" />
            <span className="min-w-0">
              <span className="font-medium text-foreground">{c.documentTitle}</span>
              <span className="ml-1 opacity-70">— {c.snippet}…</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ThinkingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="flex items-center gap-1.5 rounded-lg rounded-bl-sm bg-muted px-4 py-3">
        <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/50 [animation-delay:-0.3s]" />
        <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/50 [animation-delay:-0.15s]" />
        <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/50" />
      </div>
    </div>
  );
}

function humanizeTool(name: string): string {
  const map: Record<string, string> = {
    getFinancialSummary: "Budget summary",
    getAccountBalances: "Account balances",
    getGoals: "Savings goals",
    getSpendingTrend: "Spending trend",
    searchKnowledgeBase: "Documents",
  };
  return map[name] ?? name;
}
