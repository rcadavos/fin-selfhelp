"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Sparkles } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { useUser } from "@/hooks/use-user";
import { AssistantChat } from "@/components/app/ai/assistant-chat";
import { aiAssistantInfoQueryOptions } from "@/lib/query/ai";

/**
 * Floating "Ask OmniTrak" launcher mounted app-wide. Premium-only, and hidden on
 * the full assistant page where the workspace already provides the chat.
 */
export function AiChatWidget() {
  const { user } = useUser();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  // Kept on the (always-mounted) widget so the conversation survives the Sheet
  // closing/reopening — otherwise each reopen would orphan a new server thread.
  const [conversationId, setConversationId] = useState<string>();

  const { data: info } = useQuery({
    ...aiAssistantInfoQueryOptions(),
    enabled: Boolean(user),
  });

  const onAssistantPage = pathname?.startsWith("/dashboard/assistant");
  if (!user || onAssistantPage || !info?.hasPremiumAccess) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open OmniTrak Assistant"
        className={cn(
          "fixed right-4 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform active:scale-95 md:right-6",
          // Sit above the mobile bottom navbar; lower on desktop.
          "bottom-20 md:bottom-6",
        )}
      >
        <Sparkles className="h-5 w-5" />
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="right"
          className="flex w-full flex-col gap-0 p-0 sm:max-w-md"
        >
          <SheetHeader className="border-b px-4 py-3 text-left">
            <SheetTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-5 w-5 text-primary" />
              Ask OmniTrak
            </SheetTitle>
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
