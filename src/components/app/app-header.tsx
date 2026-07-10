"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useUser } from "@/hooks/use-user";
import { cn } from "@/lib/utils";
import { Menu, Search, User } from "lucide-react";
import { NotificationsMenu } from "@/components/notifications";
import { ThemeToggle } from "@/components/theme-toggle";
import { AccountDropdownMenu } from "@/components/app/account-dropdown-menu";
import { SiteLogo } from "@/components/app/site-logo";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { AppSidebar } from "@/components/app/app-sidebar";
import { MobileSearch } from "@/components/app/app-search";

export function AppHeader({ className }: { className?: string }) {
  const { user, loading } = useUser();
  const showAuthenticatedHeader = Boolean(user) || loading;
  const [isSheetOpen, setIsSheetOpen] = useState(false);
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

          {/* Left: Burger + Logo side-by-side */}
          <div className="flex items-center gap-2">
            {showAuthenticatedHeader && (
              <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="size-8 shrink-0 md:hidden" aria-label="Open menu">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-64 border-none p-0">
                  <SheetHeader className="sr-only">
                    <SheetTitle>Navigation Menu</SheetTitle>
                  </SheetHeader>
                  <AppSidebar
                    className="flex h-full !static w-full border-r-0"
                    onNavigate={() => setIsSheetOpen(false)}
                  />
                </SheetContent>
              </Sheet>
            )}
            <Link
              href={showAuthenticatedHeader ? "/dashboard" : "/"}
              aria-label="Home"
              className="flex items-center"
            >
              <SiteLogo />
              <span className="sr-only">Omnitrak</span>
            </Link>
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Right: Search → ThemeToggle → Notifications (→ Account on desktop) */}
          <div className="flex items-center gap-1">
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
                <ThemeToggle />
                <NotificationsMenu />
                {loading ? (
                  <span className="hidden md:inline-block h-10 w-14 shrink-0 rounded-md bg-muted/80" aria-hidden />
                ) : (
                  <div className="hidden md:block">
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
                  </div>
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
