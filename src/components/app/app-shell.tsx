"use client";

import { AppHeader } from "@/components/app/app-header";
import { AppSidebar } from "@/components/app/app-sidebar";
import { DesktopSearch } from "@/components/app/app-search";
import { NotificationsMenu } from "@/components/notifications";
import { ThemeToggle } from "@/components/theme-toggle";
import { useUser } from "@/hooks/use-user";
import { cn } from "@/lib/utils";
import { BottomNavbar } from "@/components/app/bottom-navbar";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, loading } = useUser();
  const showAuthenticatedShell = Boolean(user) || loading;

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
              <div className="pointer-events-auto w-full max-w-md">
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
          {children}
        </div>
        <BottomNavbar />
      </div>
    </div>
  );
}
