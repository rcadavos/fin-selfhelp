"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { TextSizeMenu } from "@/components/text-size-menu";
import { useUser } from "@/hooks/use-user";
import { cn } from "@/lib/utils";
import { SiteLogo } from "@/components/app/site-logo";
import { Skeleton } from "@/components/ui/skeleton";
import { CtaButton, opensInThisTab } from "@/components/landing/cta-button";
import { TRIAL_CTA_LABEL } from "@/lib/constants/landing";

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
        {/* From md the row is three columns, the outer two sharing what is left over,
            so the menu sits in the middle of the header rather than wherever the logo
            and buttons happen to push it. */}
        <div className="flex h-16 items-center gap-2 px-4 sm:gap-4 sm:px-6 md:grid md:grid-cols-[1fr_auto_1fr] lg:gap-6 lg:px-8">
          <Link
            href="/"
            className="mr-auto flex min-w-0 items-center overflow-hidden md:mr-0 md:justify-self-start"
            title="OmniTrak"
            aria-label="OmniTrak home"
          >
            {/* Short of room (a narrow phone, or a larger text size from the Aa menu),
                the wordmark wraps to a clipped second line instead of being cut mid-word.
                Phones get a smaller lockup, so the name still fits beside the Aa, theme,
                Log in and Sign up buttons on a 375px screen. */}
            <SiteLogo
              fetchPriority="high"
              className="h-10 min-w-0 flex-wrap content-start overflow-hidden max-sm:gap-1.5 max-sm:text-lg"
              iconClassName="max-sm:h-9"
            />
            <span className="sr-only">OmniTrak</span>
          </Link>

          <nav className="hidden items-center gap-5 md:flex lg:gap-7" aria-label="Primary">
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

          <div className="flex shrink-0 items-center gap-1 sm:gap-3 md:justify-self-end">
            <div className="flex items-center">
              <TextSizeMenu />
              <ThemeToggle />
            </div>
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
                <Skeleton className="inline-flex h-9 shrink-0 items-center rounded-xl px-2 text-sm font-medium whitespace-nowrap text-transparent sm:px-3">
                  Log in
                </Skeleton>
                <Skeleton className="inline-flex h-9 shrink-0 items-center rounded-xl px-3.5 text-sm font-semibold whitespace-nowrap text-transparent">
                  <SignUpLabel />
                </Skeleton>
              </div>
            ) : user ? (
              <CtaButton
                href="/dashboard"
                size="sm"
                arrow={false}
                pending={navigating}
                onClick={(e) => {
                  if (opensInThisTab(e)) setNavigating(true);
                }}
              >
                Go to Dashboard
              </CtaButton>
            ) : (
              <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
                <Button size="sm" variant="ghost" asChild className="inline-flex h-9 px-2 sm:px-3">
                  <Link href="/login">Log in</Link>
                </Button>
                <CtaButton href="/signup" size="sm" arrow={false}>
                  <SignUpLabel />
                </CtaButton>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

/**
 * The full trial label only on wide screens. Below xl it would make the buttons
 * wider than the logo and push the centred menu off the middle, so it is "Sign up".
 */
function SignUpLabel() {
  return (
    <>
      <span className="xl:hidden">Sign up</span>
      <span className="hidden xl:inline">{TRIAL_CTA_LABEL}</span>
    </>
  );
}
