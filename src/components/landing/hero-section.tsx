"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useUser } from "@/hooks/use-user";
import { cn } from "@/lib/utils";
import { TRIAL_LABEL } from "@/lib/constants/trial";
import { Loader2 } from "lucide-react";

type HeroSectionProps = {
  className?: string;
};

function HeroCreditCard() {
  return (
    <div className="relative mx-auto w-full max-w-[340px] select-none sm:mx-0 [perspective:1200px]">
      <div
        className={cn(
          "relative overflow-hidden rounded-2xl border border-white/20 p-6 text-left text-white shadow-2xl",
          "bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-900",
          "transition-transform duration-300 hover:scale-[1.02] hover:shadow-emerald-900/30",
        )}
      >
        <div
          className="pointer-events-none absolute -right-6 -top-6 h-32 w-32 rounded-full bg-white/10"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute bottom-0 left-0 h-24 w-40 rounded-full bg-black/10 blur-2xl"
          aria-hidden
        />
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-white/70">
              OmniTrak
            </p>
            <p className="mt-1 text-lg font-semibold tracking-tight">
              Planned Expenses &amp; budget
            </p>
          </div>
          <div
            className="h-10 w-12 rounded bg-gradient-to-br from-amber-200/90 to-amber-400/80 shadow-inner"
            aria-hidden
          />
        </div>
        <p className="mt-8 font-mono text-lg tracking-[0.2em] text-white/95">
          •••• •••• •••• 0428
        </p>
        <div className="mt-4 flex items-end justify-between text-xs text-white/75">
          <div>
            <p className="uppercase tracking-wide">Valid</p>
            <p className="font-mono text-sm text-white">12/28</p>
          </div>
          <div className="text-right">
            <p className="uppercase tracking-wide">PHP</p>
            <p className="text-sm font-semibold text-white">
              Zero fees. Full clarity.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function HeroSection({ className }: HeroSectionProps) {
  const { user, loading } = useUser();
  const [navigating, setNavigating] = useState(false);

  return (
    <section
      id="hero"
      className={cn(
        "relative overflow-hidden border-b bg-gradient-to-b from-primary/12 via-background to-background px-4 py-10 sm:px-6 sm:py-16 lg:px-8",
        className,
      )}
    >
      <div
        className="pointer-events-none absolute -left-24 top-0 h-96 w-96 rounded-full bg-primary/20 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-20 bottom-0 h-80 w-80 rounded-full bg-teal-500/20 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-400/10 blur-3xl"
        aria-hidden
      />

      <div className="relative mx-auto flex max-w-6xl flex-col items-center">
        <div className="max-w-2xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-primary">
            Get your life organized — without the stress
          </span>
          <h1 className="mt-4 text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            Your all-in-one personal tracker for everything
          </h1>
          <p className="mt-5 text-lg text-muted-foreground sm:text-xl">
            Track your expenses, planned expenses, goals, and more in one simple
            app. <br /> No clutter. No confusion. Just clarity.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button
              size="lg"
              asChild={!navigating}
              disabled={navigating}
              className="min-w-[15.5rem] whitespace-nowrap shadow-md sm:min-w-[16rem]"
            >
              {navigating ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <Link
                  href={!loading && user ? "/dashboard" : "/signup"}
                  onClick={() => setNavigating(true)}
                >
                  {loading ? (
                    <span className="inline-block min-w-[11ch] text-center opacity-60">
                      Loading…
                    </span>
                  ) : user ? (
                    "Go to Dashboard"
                  ) : (
                    "Try It Now"
                  )}
                </Link>
              )}
            </Button>
            <Button
              size="lg"
              variant="outline"
              asChild
              className="min-w-[15.5rem] whitespace-nowrap bg-background/80 backdrop-blur sm:min-w-[16rem]"
            >
              <a href="#features">See features</a>
            </Button>
          </div>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5 font-semibold text-primary">
              <span
                className="h-1.5 w-1.5 rounded-full bg-primary"
                aria-hidden
              />
              {TRIAL_LABEL}
            </span>
            <span className="flex items-center gap-1.5">
              <span
                className="h-1.5 w-1.5 rounded-full bg-emerald-500"
                aria-hidden
              />
              Free to start
            </span>
            <span className="flex items-center gap-1.5">
              <span
                className="h-1.5 w-1.5 rounded-full bg-emerald-500"
                aria-hidden
              />
              No bank linking
            </span>
            <span className="flex items-center gap-1.5">
              <span
                className="h-1.5 w-1.5 rounded-full bg-emerald-500"
                aria-hidden
              />
              Works on any device
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
