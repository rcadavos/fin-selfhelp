"use client";

import { useCallback, useState } from "react";
import dynamic from "next/dynamic";
import { MessageCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ProspectPlans } from "@/lib/prospect-chat";
import {
  PRODUCT_NAME,
  PROSPECT_CHAT_LAUNCHER_ID,
  PROSPECT_CHAT_PANEL_ID,
} from "@/lib/constants/prospect-chat";

const loadPanel = () => import("./prospect-chat-panel").then((m) => m.ProspectChatPanel);

// The panel carries the chat runtime, so it stays out of the landing bundle until
// a visitor shows interest — hovering or focusing the launcher starts the fetch.
const ProspectChatPanel = dynamic(loadPanel, { ssr: false });

/**
 * Floating launcher for the prospect chat in the landing page's lower-right corner. The
 * panel mounts on first open and then stays mounted (hidden while closed), so a
 * visitor who closes the chat comes back to the same conversation.
 */
export function ProspectChatWidget({ plans }: { plans: ProspectPlans }) {
  const [open, setOpen] = useState(false);
  const [hasOpened, setHasOpened] = useState(false);

  const toggle = useCallback(() => {
    setHasOpened(true);
    setOpen((o) => !o);
  }, []);
  const close = useCallback(() => setOpen(false), []);

  return (
    <>
      {hasOpened && <ProspectChatPanel open={open} onClose={close} plans={plans} />}

      <button
        // The id is what the scroll-to-top button's `:has()` classes look for.
        id={PROSPECT_CHAT_LAUNCHER_ID}
        type="button"
        onClick={toggle}
        onPointerEnter={loadPanel}
        onFocus={loadPanel}
        aria-label={open ? "Close chat" : `Ask a question about ${PRODUCT_NAME}`}
        aria-expanded={open}
        aria-controls={hasOpened ? PROSPECT_CHAT_PANEL_ID : undefined}
        className={cn(
          "fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-[transform,bottom] duration-200 hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 motion-reduce:transition-none",
          // Sit above the cookie notice while it is showing, rather than under it.
          "[body:has(#cookie-consent-banner)_&]:bottom-20",
          // On phones the open panel is a full-width sheet with its own close button.
          open && "max-sm:hidden",
        )}
      >
        {open ? (
          <X className="h-6 w-6" aria-hidden />
        ) : (
          <MessageCircle className="h-6 w-6" aria-hidden />
        )}
      </button>
    </>
  );
}
