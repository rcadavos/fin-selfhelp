"use client";

import { Search } from "lucide-react";
import { AppHeader } from "@/components/app/app-header";
import { AppSidebar } from "@/components/app/app-sidebar";
import { Input } from "@/components/ui/input";
import { ThemeToggle } from "@/components/theme-toggle";
import { useUser } from "@/hooks/use-user";
import { cn } from "@/lib/utils";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, loading } = useUser();
  const showAuthenticatedShell = Boolean(user) || loading;

  return (
    <div className="relative flex h-full min-h-0 min-w-0 flex-1 flex-col md:overflow-hidden">
      <AppSidebar />
      {/* pl-56 reserves space for fixed sidebar so page content is full width of the remaining viewport (not squeezed / trimmed) */}
      <div
        className={cn(
          "flex h-full min-h-0 min-w-0 w-full flex-1 flex-col md:min-h-0 md:overflow-hidden",
          showAuthenticatedShell && "md:pl-56"
        )}
      >
        {showAuthenticatedShell ? (
          <header
            className="relative z-0 hidden h-14 shrink-0 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:block"
            aria-label="App toolbar"
          >
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-14 sm:px-20 md:px-28">
              <div className="pointer-events-auto w-full max-w-md">
                <label htmlFor="app-shell-search" className="sr-only">
                  Search
                </label>
                <div className="relative">
                  <Search
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                    aria-hidden
                  />
                  <Input
                    id="app-shell-search"
                    type="search"
                    placeholder="Search…"
                    className="h-9 pl-9"
                    autoComplete="off"
                  />
                </div>
              </div>
            </div>
            <div className="pointer-events-none relative z-10 flex h-full items-center justify-end px-3 sm:px-4">
              <div className="pointer-events-auto">
                <ThemeToggle />
              </div>
            </div>
          </header>
        ) : null}
        <AppHeader />
        <div
          data-app-scroll="true"
          className="min-h-0 flex-1 md:h-full md:min-h-0 md:overflow-y-auto md:overscroll-y-contain"
        >
          {children}
        </div>
      </div>
    </div>
  );
}
