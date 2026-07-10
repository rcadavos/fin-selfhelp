"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useUser } from "@/hooks/use-user";
import { cn } from "@/lib/utils";
import { TRIAL_LABEL } from "@/lib/constants/trial";
import { Amount } from "@/components/passbook/amount";
import { Stamp } from "@/components/passbook/stamp";
import { LedgerRow } from "@/components/passbook/dot-leader";
import { Loader2 } from "lucide-react";

type HeroSectionProps = {
  className?: string;
};

const trustItems = [TRIAL_LABEL, "Free to start", "No bank linking", "Works on any device"];

function HeroLedger() {
  return (
    <div
      className="rounded-md border border-border bg-card p-5 sm:p-6"
      aria-label="Sample upcoming bills ledger"
    >
      <div className="flex items-baseline justify-between border-b border-border pb-3">
        <span className="font-mono text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          Upcoming bills
        </span>
        <span className="font-mono text-[11px] text-muted-foreground">JUL 2026</span>
      </div>

      <LedgerRow
        label={<span className="text-sm font-medium">Meralco</span>}
        className="border-b border-border py-2.5"
      >
        <Amount formatted="₱3,214.57" className="text-sm" />
        <Stamp variant="due" className="ml-2.5 shrink-0">
          Due Jul 15
        </Stamp>
      </LedgerRow>

      <LedgerRow
        label={<span className="text-sm font-medium text-muted-foreground line-through">Maynilad</span>}
        className="border-b border-border py-2.5"
      >
        <Amount formatted="₱486.20" className="text-sm text-muted-foreground line-through" />
        <Stamp variant="paid" className="ml-2.5 shrink-0">
          Paid
        </Stamp>
      </LedgerRow>

      <LedgerRow
        label={<span className="text-sm font-medium">Globe Fiber</span>}
        className="border-b border-border py-2.5"
      >
        <Amount formatted="₱1,699.00" className="text-sm" />
        <Stamp variant="due" className="ml-2.5 shrink-0">
          Due Jul 18
        </Stamp>
      </LedgerRow>

      <LedgerRow
        label={<span className="text-sm font-medium">Netflix</span>}
        className="border-b border-border py-2.5"
      >
        <Amount formatted="₱549.00" className="text-sm" />
        <Stamp variant="paid" className="ml-2.5 shrink-0">
          Paid
        </Stamp>
      </LedgerRow>

      <LedgerRow
        label={<span className="text-sm font-medium">Pag-IBIG MP2</span>}
        className="py-2.5"
      >
        <Amount formatted="₱1,000.00" className="text-sm" />
        <Stamp variant="scheduled" className="ml-2.5 shrink-0">
          Scheduled
        </Stamp>
      </LedgerRow>

      <LedgerRow
        label={<span className="text-sm font-bold">Still to pay</span>}
        className="mt-1 border-t border-hairline-strong pt-3"
      >
        <Amount formatted="₱4,913.57" className="text-base font-bold" />
      </LedgerRow>

      <div className="mt-3.5 flex items-center justify-between border-t border-border pt-3">
        <span className="text-xs text-muted-foreground">6-month spend</span>
        <svg
          width="72"
          height="20"
          viewBox="0 0 72 20"
          fill="none"
          aria-hidden
          className="text-primary"
        >
          <polyline
            points="1,15 13,12 25,14 37,8 49,10 61,5 70,7"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="70" cy="7" r="2.4" fill="currentColor" />
        </svg>
      </div>
    </div>
  );
}

export function HeroSection({ className }: HeroSectionProps) {
  const { user, loading } = useUser();
  const [navigating, setNavigating] = useState(false);

  return (
    <section id="hero" className={cn(className)}>
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8 lg:py-20">
        <div className="grid items-center gap-10 lg:grid-cols-12 lg:gap-14">
          <div className="lg:col-span-7">
            <span className="eyebrow block">Personal finance • Philippines</span>
            <h1 className="mt-4 max-w-[15ch] text-balance text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-[3.4rem] lg:leading-[1.08]">
              Your all-in-one finance tracker, now with AI
            </h1>
            <p className="mt-5 max-w-[44ch] text-lg text-muted-foreground">
              Track expenses, planned expenses, accounts, and goals in one simple app. Then ask the
              built-in assistant anything.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
              <Button
                size="lg"
                asChild={!navigating}
                disabled={navigating}
                className="h-11 min-w-[13rem]"
              >
                {navigating ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                ) : (
                  <Link
                    href={!loading && user ? "/dashboard" : "/signup"}
                    onClick={() => setNavigating(true)}
                  >
                    {loading ? (
                      <span className="inline-block min-w-[11ch] text-center opacity-70">
                        Loading…
                      </span>
                    ) : user ? (
                      "Go to Dashboard"
                    ) : (
                      "Start free 14-day trial"
                    )}
                  </Link>
                )}
              </Button>
              <a
                href="#how-it-works"
                className="text-sm font-medium text-primary underline underline-offset-4 transition-colors hover:text-primary/80"
              >
                See how it works
              </a>
            </div>
          </div>

          <div className="lg:col-span-5">
            <HeroLedger />
          </div>
        </div>
      </div>

      <div className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-3 gap-y-1.5 px-4 py-3.5 sm:px-6 lg:px-8">
          {trustItems.map((item, i) => (
            <span key={item} className="flex items-center gap-x-3">
              {i > 0 && (
                <span aria-hidden className="text-muted-foreground/50">
                  •
                </span>
              )}
              <span className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
                {item}
              </span>
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
