"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { useUser } from "@/hooks/use-user";
import { cn } from "@/lib/utils";
import { SiteLogo } from "@/components/app/site-logo";
import { Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

type HeaderProps = {
  className?: string;
};

const navLinks = [
  { href: "/#features", label: "Features" },
  { href: "/#how-it-works", label: "How it works" },
  { href: "/#subscribe", label: "Pricing" },
  { href: "/#faq", label: "FAQ" },
] as const;

export function Header({ className }: HeaderProps) {
  const { user, loading } = useUser();
  const [navigating, setNavigating] = useState(false);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full border-b border-border bg-background",
        className
      )}
    >
      <div className="mx-auto max-w-6xl">
        <div className="flex h-16 items-center gap-2 px-4 sm:gap-6 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="mr-auto flex min-w-0 items-center overflow-hidden"
            title="OmniTrak"
            aria-label="OmniTrak home"
          >
            <SiteLogo fetchPriority="high" />
            <span className="sr-only">OmniTrak</span>
          </Link>

          <nav className="hidden items-center gap-6 md:flex" aria-label="Primary">
            {navLinks.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                {label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            <ThemeToggle />
            {loading ? (
              /* The placeholders mirror the real buttons below — same sizes, same
                 responsive labels, text made transparent — so the skeleton is never
                 wider than what replaces it. Fixed-width pills overflowed the row on
                 a 375px screen and ran over the OmniTrak lockup. */
              <div
                className="flex shrink-0 items-center gap-1.5 sm:gap-2"
                aria-busy="true"
                aria-label="Loading account"
              >
                <Skeleton className="inline-flex h-9 shrink-0 items-center rounded-xl px-2.5 text-sm font-medium whitespace-nowrap text-transparent sm:px-3">
                  Log in
                </Skeleton>
                <Skeleton className="inline-flex h-9 shrink-0 items-center rounded-xl px-3.5 text-sm font-medium whitespace-nowrap text-transparent">
                  <span className="sm:hidden">Sign up</span>
                  <span className="hidden sm:inline">Start free 14-day trial</span>
                </Skeleton>
              </div>
            ) : user ? (
              <Button size="sm" asChild={!navigating} disabled={navigating} className="h-9 shrink-0">
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
                <Button size="sm" variant="ghost" asChild className="inline-flex h-9 px-2.5 sm:px-3">
                  <Link href="/login">Log in</Link>
                </Button>
                <Button size="sm" asChild className="h-9 shrink-0 px-3.5">
                  <Link href="/signup">
                    <span className="sm:hidden">Sign up</span>
                    <span className="hidden sm:inline">Start free 14-day trial</span>
                  </Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
