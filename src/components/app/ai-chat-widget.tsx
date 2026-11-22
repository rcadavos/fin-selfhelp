"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Maximize2 } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useUser } from "@/hooks/use-user";
import { useAppMode } from "@/hooks/use-app-mode";
import { AssistantChat } from "@/components/app/ai/assistant-chat";
import { subscriptionCapabilitiesQueryOptions } from "@/lib/query/subscription-user";
import { Otto } from "@/components/mascot/otto";
import { ASSISTANT_NAME } from "@/lib/constants/mascot";

/**
 * Floating "Ask Otto" launcher (Otto's face) mounted app-wide for Pro/Premium members
 * (AI usage incurs cost, so it's gated to paid plans; the 14-day Pro trial
 * counts). Sits above the Add Entry button. Hidden on the full assistant page,
 * which already provides the chat, and in bills mode, which switches the
 * assistant off. Its "expand" link opens that full page (history + knowledge
 * base) since the assistant isn't in the sidebar.
 */
export function AiChatWidget() {
  const { user } = useUser();
  const { isFeatureEnabled } = useAppMode();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  // Kept on the (always-mounted) widget so the conversation survives the Sheet
  // closing/reopening — otherwise each reopen would orphan a new server thread.
  const [conversationId, setConversationId] = useState<string>();

  const { data: caps } = useQuery({
    ...subscriptionCapabilitiesQueryOptions(),
    enabled: Boolean(user),
  });

  const onAssistantPage = pathname?.startsWith("/dashboard/assistant");
  if (!user || onAssistantPage || !caps?.hasProLevelAccess || !isFeatureEnabled("assistant"))
    return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Open ${ASSISTANT_NAME}`}
        className="fixed right-4 bottom-20 z-40 flex h-14 w-14 items-center justify-center rounded-full border border-border bg-card shadow-md transition-transform active:scale-95 md:right-6 md:bottom-24"
      >
        <Otto pose="face" size={44} />
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="right"
          className="flex w-full flex-col gap-0 p-0 sm:max-w-md"
        >
          <SheetHeader className="flex-row items-center gap-2 border-b px-4 py-3 pr-12 text-left">
            <SheetTitle className="flex flex-1 items-center gap-2 text-base">
              <Otto pose="face" size={26} />
              {ASSISTANT_NAME}
            </SheetTitle>
            <Link
              href="/dashboard/assistant"
              onClick={() => setOpen(false)}
              aria-label="Open full assistant"
              title="Open full assistant"
              className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <Maximize2 className="h-4 w-4" />
            </Link>
          </SheetHeader>
          <div className="min-h-0 flex-1 px-4 py-3">
            <AssistantChat
              compact
              conversationId={conversationId}
              onConversationCreated={setConversationId}
            />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
