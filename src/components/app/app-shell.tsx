"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { AppHeader } from "@/components/app/app-header";
import { AppSidebar } from "@/components/app/app-sidebar";
import { DesktopSearch } from "@/components/app/app-search";
import { NotificationsMenu } from "@/components/notifications";
import { ThemeToggle } from "@/components/theme-toggle";
import { useUser } from "@/hooks/use-user";
import { useAppMode } from "@/hooks/use-app-mode";
import { cn } from "@/lib/utils";
import { BottomNavbar } from "@/components/app/bottom-navbar";
import { AppModeGuard } from "@/components/app/app-mode-guard";
import { AddEntryPanel } from "@/components/dashboard/add-entry-panel";
import { AiChatWidget } from "@/components/app/ai-chat-widget";

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
            className="relative z-10 hidden h-14 shrink-0 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:block"
            aria-label="App toolbar"
          >
            {/* Centered search — pointer-events layer so it doesn't block the right-side buttons */}
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-14 sm:px-20 md:px-28">
              <div className="pointer-events-auto w-72 md:w-[28rem] lg:w-[36rem]">
                <DesktopSearch />
              </div>
            </div>
            {/* Right actions */}
            <div className="pointer-events-none relative z-10 flex h-full items-center justify-end px-3 sm:px-4">
              <div className="pointer-events-auto flex items-center gap-1">
                <ThemeToggle />
                <NotificationsMenu />
              </div>
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
