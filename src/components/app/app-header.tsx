"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useUser } from "@/hooks/use-user";
import { cn } from "@/lib/utils";
import { Search, User } from "lucide-react";
import { NotificationsMenu } from "@/components/notifications";
import { ThemeToggle } from "@/components/theme-toggle";
import { TextSizeMenu } from "@/components/text-size-menu";
import { AccountDropdownMenu } from "@/components/app/account-dropdown-menu";
import { SiteLogo } from "@/components/app/site-logo";
import { MobileSearch } from "@/components/app/app-search";

export function AppHeader({ className }: { className?: string }) {
  const { user, loading } = useUser();
  const showAuthenticatedHeader = Boolean(user) || loading;
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  return (
    <header
      className={cn(
        "relative sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60",
        showAuthenticatedHeader && "md:hidden",
        className
      )}
    >
      {/* ── Search mode ── */}
      {isSearchOpen && showAuthenticatedHeader ? (
        <MobileSearch onClose={() => setIsSearchOpen(false)} />
      ) : (
        <div className="flex h-14 w-full items-center gap-2 px-4 sm:px-5">

          {/* Left: Logo. When the buttons leave too little room (a narrow phone, or
              a larger text size), the wordmark wraps onto a second line that the
              fixed height clips, leaving the mark alone instead of the row overflowing. */}
          <div className="flex min-w-0 items-center gap-2">
            <Link
              href={showAuthenticatedHeader ? "/dashboard" : "/"}
              aria-label="Home"
              className="flex min-w-0 items-center"
            >
              <SiteLogo className="h-10 min-w-0 flex-wrap content-start overflow-hidden" />
              <span className="sr-only">Omnitrak</span>
            </Link>
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Right: Search → Text size → Theme → Notifications (→ Account on desktop) */}
          <div className="flex shrink-0 items-center gap-1">
            {showAuthenticatedHeader ? (
              <>
                <button
                  type="button"
                  onClick={() => setIsSearchOpen(true)}
                  className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  aria-label="Search"
                >
                  <Search className="h-5 w-5" />
                </button>
                <TextSizeMenu />
                <ThemeToggle />
                <NotificationsMenu />
                {loading ? (
                  <span className="inline-block h-10 w-14 shrink-0 rounded-md bg-muted/80" aria-hidden />
                ) : (
                  <AccountDropdownMenu
                    user={user!}
                    align="end"
                    trigger={
                      <Button
                        variant="ghost"
                        className="h-10 shrink-0 gap-1 rounded-md px-2 hover:bg-muted focus-visible:bg-muted focus-visible:ring-1 focus-visible:ring-border focus-visible:ring-offset-0"
                      >
                        <User className="h-4 w-4" />
                      </Button>
                    }
                  />
                )}
              </>
            ) : (
              <>
                <ThemeToggle />
                <Link href="/login" className="text-sm font-medium text-foreground">
                  Log in
                </Link>
                <Button asChild size="sm" className="cursor-pointer">
                  <Link href="/signup">Sign up</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
