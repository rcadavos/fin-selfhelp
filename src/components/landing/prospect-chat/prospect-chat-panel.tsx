"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, generateId, type UIMessage } from "ai";
import { ArrowLeft, ArrowUp, LifeBuoy, Square, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { buildSuggestionAnswer, type ProspectPlans } from "@/lib/prospect-chat";
import type { SupportTranscriptLine } from "@/lib/email";
import {
  CANNED_REPLY_DELAY_MS,
  PRODUCT_NAME,
  PROSPECT_CHAT_API,
  PROSPECT_CHAT_MAX_INPUT_CHARS,
  PROSPECT_CHAT_SUGGESTIONS,
  SUPPORT_TRANSCRIPT_MAX_MESSAGES,
  type ProspectSuggestionId,
} from "@/lib/constants/prospect-chat";
import { ProspectChatShell } from "./prospect-chat-shell";
import {
  EMPTY_SUPPORT_FIELDS,
  ProspectSupportForm,
  type SupportFields,
} from "./prospect-support-form";

type ProspectMessageMeta =
  | { kind: "suggestion"; suggestionId: ProspectSuggestionId }
  | { kind: "fallback" }
  | { kind: "support-sent" };

type ProspectMessage = UIMessage<ProspectMessageMeta>;

const WELCOME = `Hi there! I can answer questions about ${PRODUCT_NAME} — what it does, what it costs, and how your data is handled. Tap a question below or type your own.`;

/** Matches the `sm` breakpoint the shell switches layouts at. */
const PHONE_QUERY = "(max-width: 639px)";

function textMessage(
  role: "user" | "assistant",
  text: string,
  metadata?: ProspectMessageMeta,
): ProspectMessage {
  return { id: generateId(), role, parts: [{ type: "text", text }], metadata };
}

function messageText(message: ProspectMessage): string {
  return message.parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join("");
}

/** The endpoint answers errors as JSON with a `code`; the transport hands us the raw body. */
function fallbackText(error: Error): string {
  let code: unknown;
  try {
    code = JSON.parse(error.message)?.code;
  } catch {
    // Network failure or a non-JSON body — treat it as unavailable.
  }
  return code === "rate_limited"
    ? "You're asking faster than I can keep up — give it a minute and try again. Or reach the team directly below."
    : "I can't answer that one right now, but the team can. Send them a message and they'll reply by email.";
}

export function ProspectChatPanel({
  open,
  onClose,
  plans,
}: {
  open: boolean;
  onClose: () => void;
  plans: ProspectPlans;
}) {
  const titleId = useId();
  const inputId = useId();
  const [view, setView] = useState<"chat" | "support">("chat");
  const [input, setInput] = useState("");
  const [supportFields, setSupportFields] = useState<SupportFields>(EMPTY_SUPPORT_FIELDS);
  const [cannedPending, setCannedPending] = useState(false);
  const cannedTimer = useRef<number | undefined>(undefined);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const transport = useMemo(() => new DefaultChatTransport({ api: PROSPECT_CHAT_API }), []);
  const { messages, setMessages, sendMessage, status, error, stop, clearError } =
    useChat<ProspectMessage>({ transport });

  const streaming = status === "submitted" || status === "streaming";
  const busy = streaming || cannedPending;

  useEffect(() => () => window.clearTimeout(cannedTimer.current), []);

  // A failed answer becomes an ordinary assistant turn pointing at support, so
  // the conversation (and the transcript support receives) still reads in order.
  useEffect(() => {
    if (!error) return;
    setMessages((prev) => [...prev, textMessage("assistant", fallbackText(error), { kind: "fallback" })]);
    clearError();
  }, [error, setMessages, clearError]);

  // Escape closes. The composer takes focus for mouse and keyboard users only —
  // on a phone it would throw the keyboard up over the answers.
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    if (view === "chat" && window.matchMedia("(pointer: fine)").matches) inputRef.current?.focus();
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, view, onClose]);

  useEffect(() => {
    const el = scrollRef.current;
    el?.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages, busy, open, view]);

  const askSuggestion = useCallback(
    (id: ProspectSuggestionId, question: string) => {
      if (busy) return;
      setMessages((prev) => [...prev, textMessage("user", question)]);
      setCannedPending(true);
      cannedTimer.current = window.setTimeout(() => {
        const answer = buildSuggestionAnswer(id, plans);
        setMessages((prev) => [
          ...prev,
          textMessage("assistant", answer.text, { kind: "suggestion", suggestionId: id }),
        ]);
        setCannedPending(false);
      }, CANNED_REPLY_DELAY_MS);
    },
    [busy, plans, setMessages],
  );

  function submit() {
    const text = input.trim().slice(0, PROSPECT_CHAT_MAX_INPUT_CHARS);
    if (!text || busy) return;
    setInput("");
    sendMessage({ text });
  }

  const openSupport = useCallback(() => {
    // Whatever was half-typed in the chat is probably the question — carry it over.
    const draft = input.trim();
    if (draft) {
      setSupportFields((f) => ({ ...f, message: f.message || draft }));
      setInput("");
    }
    setView("support");
  }, [input]);

  function handleSupportSent(fields: SupportFields) {
    const firstName = fields.name.trim().split(/\s+/)[0];
    setMessages((prev) => [
      ...prev,
      textMessage(
        "assistant",
        `Thanks${firstName ? `, ${firstName}` : ""}! Your message is with the team, and they'll reply to ${fields.email.trim()} as soon as they can.`,
        { kind: "support-sent" },
      ),
    ]);
    setSupportFields((f) => ({ ...f, message: "" }));
    setView("chat");
  }

  function handleLinkClick(href: string) {
    // An in-page anchor scrolls the page behind the chat; on a phone the sheet
    // would cover it, so get out of the way.
    if (href.startsWith("#") && window.matchMedia(PHONE_QUERY).matches) onClose();
  }

  const askedIds = new Set(
    messages.flatMap((m) => (m.metadata?.kind === "suggestion" ? [m.metadata.suggestionId] : [])),
  );
  const remainingSuggestions = PROSPECT_CHAT_SUGGESTIONS.filter((s) => !askedIds.has(s.id));

  const transcript: SupportTranscriptLine[] = messages
    .filter((m) => m.metadata?.kind !== "support-sent")
    .map((m) => ({ role: m.role === "user" ? ("user" as const) : ("assistant" as const), text: messageText(m).trim() }))
    .filter((line) => line.text)
    .slice(-SUPPORT_TRANSCRIPT_MAX_MESSAGES);

  const inSupport = view === "support";

  return (
    <ProspectChatShell open={open} onClose={onClose} labelledBy={titleId}>
      <header className="flex items-center gap-3 border-b border-border px-4 py-3">
        {inSupport ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => setView("chat")}
            aria-label="Back to chat"
            className="-ml-1.5"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
        ) : (
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
            <Image
              src="/favicon.png"
              alt=""
              width={80}
              height={80}
              className="h-7 w-auto object-contain"
              unoptimized
            />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <h2 id={titleId} className="truncate text-sm font-semibold text-foreground">
            {inSupport ? "Contact support" : `Ask ${PRODUCT_NAME}`}
          </h2>
          <p className="truncate text-xs text-muted-foreground">
            {inSupport ? "We reply by email" : "Questions about the app • answered here"}
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={onClose}
          aria-label="Close chat"
          className="-mr-1.5"
        >
          <X className="h-4 w-4" />
        </Button>
      </header>

      {/* Both views stay mounted so switching between them keeps drafts and scroll. */}
      <div className={cn("flex min-h-0 flex-1 flex-col", inSupport && "hidden")}>
        <div
          ref={scrollRef}
          role="log"
          aria-live="polite"
          aria-label="Chat messages"
          className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-4 py-4 [scrollbar-width:thin]"
        >
          <Bubble role="assistant">{WELCOME}</Bubble>

          {messages.map((message) => {
            const meta = message.metadata;
            const links =
              meta?.kind === "suggestion" ? buildSuggestionAnswer(meta.suggestionId, plans).links : [];
            return (
              <Bubble key={message.id} role={message.role === "user" ? "user" : "assistant"}>
                {messageText(message)}
                {links.length > 0 && (
                  <span className="mt-3 flex flex-wrap gap-2">
                    {links.map((link) => (
                      <Button
                        key={link.href}
                        asChild
                        size="sm"
                        variant="outline"
                        className="h-8 rounded-full bg-background"
                      >
                        <Link href={link.href} onClick={() => handleLinkClick(link.href)}>
                          {link.label}
                        </Link>
                      </Button>
                    ))}
                  </span>
                )}
                {meta?.kind === "fallback" && (
                  <span className="mt-3 flex">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={openSupport}
                      className="h-8 rounded-full bg-background"
                    >
                      <LifeBuoy className="h-3.5 w-3.5" aria-hidden />
                      Contact support
                    </Button>
                  </span>
                )}
              </Bubble>
            );
          })}

          {(status === "submitted" || cannedPending) && <TypingIndicator />}

          {!busy && remainingSuggestions.length > 0 && (
            <div className="flex flex-col items-end gap-2 pt-1">
              {messages.length > 0 && (
                <p className="text-[11px] font-medium text-muted-foreground">You might also ask</p>
              )}
              {remainingSuggestions.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => askSuggestion(s.id, s.question)}
                  className="max-w-[85%] rounded-2xl border border-primary/25 bg-primary/5 px-3.5 py-2 text-left text-sm font-medium text-primary transition-colors hover:border-primary/40 hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {s.question}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="border-t border-border p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
            className="rounded-2xl border border-input bg-background transition-shadow focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/30"
          >
            <label htmlFor={inputId} className="sr-only">
              Your question
            </label>
            <textarea
              ref={inputRef}
              id={inputId}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  submit();
                }
              }}
              rows={1}
              maxLength={PROSPECT_CHAT_MAX_INPUT_CHARS}
              placeholder={`Ask anything about ${PRODUCT_NAME}…`}
              className="block max-h-28 min-h-11 w-full resize-none bg-transparent px-3.5 pb-1 pt-3 text-base text-foreground outline-none placeholder:text-muted-foreground [field-sizing:content] md:text-sm"
            />
            <div className="flex items-center justify-end gap-1.5 px-2 pb-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={openSupport}
                className="text-muted-foreground"
              >
                <LifeBuoy className="h-4 w-4" aria-hidden />
                Contact support
              </Button>
              {streaming ? (
                <Button
                  type="button"
                  size="icon-sm"
                  variant="outline"
                  onClick={() => stop()}
                  aria-label="Stop answer"
                >
                  <Square className="h-3.5 w-3.5" />
                </Button>
              ) : (
                <Button
                  type="submit"
                  size="icon-sm"
                  disabled={!input.trim() || busy}
                  aria-label="Send message"
                >
                  <ArrowUp className="h-4 w-4" />
                </Button>
              )}
            </div>
          </form>
          <p className="mt-2 text-center text-[11px] text-muted-foreground">
            Typed questions get AI answers • double-check with our team
          </p>
        </div>
      </div>

      <div className={cn("flex min-h-0 flex-1 flex-col", !inSupport && "hidden")}>
        <ProspectSupportForm
          fields={supportFields}
          onChange={(patch) => setSupportFields((f) => ({ ...f, ...patch }))}
          transcript={transcript}
          onSent={handleSupportSent}
        />
      </div>
    </ProspectChatShell>
  );
}

function Bubble({ role, children }: { role: "user" | "assistant"; children: React.ReactNode }) {
  const isUser = role === "user";
  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[85%] whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
          isUser
            ? "rounded-br-md bg-primary text-primary-foreground"
            : "rounded-bl-md bg-muted text-foreground",
        )}
      >
        {children}
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex justify-start" role="status">
      <span className="sr-only">Typing…</span>
      <div aria-hidden className="flex items-center gap-1.5 rounded-2xl rounded-bl-md bg-muted px-4 py-3">
        <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/50 [animation-delay:-0.3s]" />
        <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/50 [animation-delay:-0.15s]" />
        <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/50" />
      </div>
    </div>
  );
}
