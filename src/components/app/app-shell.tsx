"use client";

import { Search } from "lucide-react";
import { AppHeader } from "@/components/app/app-header";
import { AppSidebar } from "@/components/app/app-sidebar";
import { Input } from "@/components/ui/input";
import { ThemeToggle } from "@/components/theme-toggle";
import { useUser } from "@/hooks/use-user";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user } = useUser();

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col lg:h-dvh lg:max-h-dvh lg:flex-row lg:overflow-hidden">
      <AppSidebar />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col lg:min-h-0 lg:overflow-hidden">
        {user ? (
          <header
            className="relative z-0 hidden h-14 shrink-0 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 lg:block"
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
        <div className="min-h-0 flex-1 lg:overflow-y-auto lg:overscroll-y-contain">
          {children}
        </div>
      </div>
    </div>
  );
}
