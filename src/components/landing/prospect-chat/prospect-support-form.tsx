"use client";

import { useId } from "react";
import { useMutation } from "@tanstack/react-query";
import { Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { submitSupportRequest } from "@/actions/support";
import type { SupportTranscriptLine } from "@/lib/email";
import {
  SUPPORT_EMAIL_MAX_CHARS,
  SUPPORT_MESSAGE_MAX_CHARS,
  SUPPORT_MESSAGE_MIN_CHARS,
  SUPPORT_NAME_MAX_CHARS,
} from "@/lib/constants/prospect-chat";

export type SupportFields = { name: string; email: string; message: string; website: string };

export const EMPTY_SUPPORT_FIELDS: SupportFields = { name: "", email: "", message: "", website: "" };

/**
 * "Contact support" inside the prospect chat. The fields live in the panel, not
 * here, so a visitor who steps back to the chat and returns finds their draft
 * where they left it.
 */
export function ProspectSupportForm({
  fields,
  onChange,
  transcript,
  onSent,
}: {
  fields: SupportFields;
  onChange: (patch: Partial<SupportFields>) => void;
  transcript: SupportTranscriptLine[];
  onSent: (fields: SupportFields) => void;
}) {
  const id = useId();
  const mutation = useMutation({
    mutationFn: submitSupportRequest,
    onSuccess: (result) => {
      if (result.error) return;
      onSent(fields);
      mutation.reset();
    },
  });

  const error =
    mutation.data?.error ??
    (mutation.isError ? "We couldn't send your message just now. Please try again in a moment." : null);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (mutation.isPending) return;
        mutation.mutate({ ...fields, transcript });
      }}
      className="flex min-h-0 flex-1 flex-col"
    >
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 py-4">
        <p className="text-sm leading-relaxed text-muted-foreground">
          Leave a message and someone from the team will reply to you by email.
        </p>

        <div className="space-y-1.5">
          <Label htmlFor={`${id}-name`}>
            Name <span className="font-normal text-muted-foreground">(optional)</span>
          </Label>
          <Input
            id={`${id}-name`}
            autoComplete="name"
            maxLength={SUPPORT_NAME_MAX_CHARS}
            value={fields.name}
            onChange={(e) => onChange({ name: e.target.value })}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor={`${id}-email`}>Email</Label>
          <Input
            id={`${id}-email`}
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="you@example.com"
            required
            maxLength={SUPPORT_EMAIL_MAX_CHARS}
            value={fields.email}
            onChange={(e) => onChange({ email: e.target.value })}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor={`${id}-message`}>How can we help?</Label>
          <textarea
            id={`${id}-message`}
            required
            rows={5}
            minLength={SUPPORT_MESSAGE_MIN_CHARS}
            maxLength={SUPPORT_MESSAGE_MAX_CHARS}
            value={fields.message}
            onChange={(e) => onChange({ message: e.target.value })}
            placeholder="Ask about features, plans, or anything else"
            className="w-full resize-none rounded-xl border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 md:text-sm"
          />
        </div>

        {/* Honeypot: off-screen and skipped by keyboard and screen readers, so only bots fill it. */}
        <div aria-hidden className="sr-only">
          <label htmlFor={`${id}-website`}>Website</label>
          <input
            id={`${id}-website`}
            tabIndex={-1}
            autoComplete="off"
            value={fields.website}
            onChange={(e) => onChange({ website: e.target.value })}
          />
        </div>

        {transcript.length > 0 && (
          <p className="text-xs leading-relaxed text-muted-foreground">
            We&apos;ll attach this chat so you don&apos;t have to repeat yourself.
          </p>
        )}

        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
      </div>

      <div className="border-t border-border p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <Button type="submit" className="h-10 w-full" disabled={mutation.isPending}>
          {mutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <Send className="h-4 w-4" aria-hidden />
          )}
          {mutation.isPending ? "Sending" : "Send to support"}
        </Button>
      </div>
    </form>
  );
}
