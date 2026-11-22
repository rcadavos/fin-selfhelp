"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { AppHeader } from "@/components/app/app-header";
import { AppSidebar } from "@/components/app/app-sidebar";
import { DesktopSearch } from "@/components/app/app-search";
import { NotificationsMenu } from "@/components/notifications";
import { ThemeToggle } from "@/components/theme-toggle";
import { TextSizeMenu } from "@/components/text-size-menu";
import { useUser } from "@/hooks/use-user";
import { useAppMode } from "@/hooks/use-app-mode";
import { cn } from "@/lib/utils";
import { BottomNavbar } from "@/components/app/bottom-navbar";
import { AppModeGuard } from "@/components/app/app-mode-guard";
import { AddEntryPanel } from "@/components/dashboard/add-entry-panel";
import { AiChatWidget } from "@/components/app/ai-chat-widget";
import { BillsModeToggle } from "@/components/app/bills-mode-toggle";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, loading } = useUser();
  const { isFeatureEnabled } = useAppMode();
  const showAuthenticatedShell = Boolean(user) || loading;
  const [addEntryOpen, setAddEntryOpen] = useState(false);
  const showQuickAddEntry = isFeatureEnabled("quickAddEntry");

  return (
    <div className="relative flex h-full min-h-0 min-w-0 flex-1 flex-col md:overflow-hidden">
      <AppSidebar />
      <div
        className={cn(
          "flex h-full min-h-0 min-w-0 w-full flex-1 flex-col md:min-h-0 md:overflow-hidden",
          showAuthenticatedShell && "md:pl-64"
        )}
      >
        {showAuthenticatedShell ? (
          <header
            className="relative z-10 hidden h-14 shrink-0 grid-cols-[1fr_minmax(0,28rem)_1fr] items-center gap-3 border-b bg-background/95 px-3 backdrop-blur supports-[backdrop-filter]:bg-background/60 sm:px-4 md:grid lg:grid-cols-[1fr_minmax(0,36rem)_1fr]"
            aria-label="App toolbar"
          >
            {/* Equal side columns keep the search centered; it shrinks before it overlaps them. */}
            <div className="flex items-center justify-start">
              <BillsModeToggle />
            </div>
            <DesktopSearch />
            <div className="flex items-center justify-end gap-2">
              <TextSizeMenu size="lg" />
              <ThemeToggle size="lg" />
              <NotificationsMenu size="lg" />
            </div>
          </header>
        ) : null}
        <AppHeader />
        <div
          data-app-scroll="true"
          className="min-h-0 flex-1 pb-16 md:h-full md:min-h-0 md:pb-0 md:overflow-y-auto md:overscroll-y-contain"
        >
          <AppModeGuard>{children}</AppModeGuard>
        </div>
        <BottomNavbar />
      </div>
      {showQuickAddEntry ? (
        <AddEntryPanel open={addEntryOpen} onClose={() => setAddEntryOpen(false)} />
      ) : null}
      {user ? (
        <>
          {/* Floating Add Entry (desktop) — sits below the Ask AI button.
              On mobile the bottom navbar already provides the center "+" FAB. */}
          {showQuickAddEntry ? (
            <button
              type="button"
              onClick={() => setAddEntryOpen(true)}
              aria-label="Add entry"
              className="fixed right-6 bottom-6 z-40 hidden h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform active:scale-95 md:flex"
            >
              <Plus className="h-7 w-7" strokeWidth={2.5} />
            </button>
          ) : null}
          <AiChatWidget />
        </>
      ) : null}
    </div>
  );
}
