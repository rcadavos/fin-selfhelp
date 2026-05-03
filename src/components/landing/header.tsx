"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { useUser } from "@/hooks/use-user";
import { cn } from "@/lib/utils";
import { SiteLogo } from "@/components/app/site-logo";
import { Loader2 } from "lucide-react";

type HeaderProps = {
  className?: string;
};

export function Header({ className }: HeaderProps) {
  const { user, loading } = useUser();
  const [navigating, setNavigating] = useState(false);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60",
        className
      )}
    >
      <div className="mx-auto max-w-6xl">
        <div className="flex h-14 items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center" title="OmniTrak" aria-label="OmniTrak home">
            <SiteLogo fetchPriority="high" />
            <span className="sr-only">OmniTrak</span>
          </Link>
          <nav className="ml-auto flex min-h-9 min-w-0 flex-nowrap items-center justify-end gap-2 sm:gap-3">
          <ThemeToggle />
          {loading ? (
            <div
              className="flex shrink-0 items-center gap-2 sm:gap-3"
              aria-busy="true"
              aria-label="Loading account"
            >
              <span className="inline-block h-9 w-[4.25rem] shrink-0 rounded-md bg-muted/80 sm:w-[4.5rem]" />
              <span className="inline-block h-9 w-[4.75rem] shrink-0 rounded-md bg-muted/80 sm:w-[5.25rem]" />
            </div>
          ) : user ? (
            <Button
              size="sm"
              asChild={!navigating}
              disabled={navigating}
              className="shrink-0"
            >
              {navigating ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
              ) : (
                <Link href="/dashboard" onClick={() => setNavigating(true)}>
                  Go to Dashboard
                </Link>
              )}
            </Button>
          ) : (
            <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
              <Button size="sm" variant="ghost" asChild className="shrink-0 px-3">
                <Link href="/login">Log in</Link>
              </Button>
              <Button size="sm" asChild className="shrink-0 px-3.5">
                <Link href="/signup">Sign up</Link>
              </Button>
            </div>
          )}
        </nav>
        </div>
      </div>
    </header>
  );
}
