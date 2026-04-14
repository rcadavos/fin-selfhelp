"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useUser } from "@/hooks/use-user";
import { cn } from "@/lib/utils";

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
          "transition-transform duration-300 hover:scale-[1.02] hover:shadow-emerald-900/30"
        )}
      >
        <div className="pointer-events-none absolute -right-6 -top-6 h-32 w-32 rounded-full bg-white/10" aria-hidden />
        <div className="pointer-events-none absolute bottom-0 left-0 h-24 w-40 rounded-full bg-black/10 blur-2xl" aria-hidden />
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-white/70">OmniTrak</p>
            <p className="mt-1 text-lg font-semibold tracking-tight">Bills &amp; budget</p>
          </div>
          <div
            className="h-10 w-12 rounded bg-gradient-to-br from-amber-200/90 to-amber-400/80 shadow-inner"
            aria-hidden
          />
        </div>
        <p className="mt-8 font-mono text-lg tracking-[0.2em] text-white/95">•••• •••• •••• 0428</p>
        <div className="mt-4 flex items-end justify-between text-xs text-white/75">
          <div>
            <p className="uppercase tracking-wide">Valid</p>
            <p className="font-mono text-sm text-white">12/28</p>
          </div>
          <div className="text-right">
            <p className="uppercase tracking-wide">PHP</p>
            <p className="text-sm font-semibold text-white">Zero fees. Full clarity.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function HeroSection({ className }: HeroSectionProps) {
  const { user, loading } = useUser();

  return (
    <section
      id="hero"
      className={cn(
        "relative overflow-hidden border-b bg-gradient-to-b from-primary/12 via-background to-background px-4 py-10 sm:px-6 sm:py-16 lg:px-8",
        className
      )}
    >
      <div className="pointer-events-none absolute -left-20 top-10 h-72 w-72 rounded-full bg-primary/20 blur-3xl" aria-hidden />
      <div className="pointer-events-none absolute -right-16 bottom-0 h-64 w-64 rounded-full bg-teal-500/15 blur-3xl" aria-hidden />

      <div className="relative mx-auto flex max-w-6xl flex-col items-center gap-10 lg:flex-row lg:items-center lg:justify-between lg:gap-12">
        <div className="max-w-xl text-center lg:text-left">
          <p className="text-sm font-semibold uppercase tracking-wide text-primary">
            You can&apos;t grow what you don&apos;t track
          </p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            Your one-stop personal tracker for everything
          </h1>
          <p className="mt-5 text-lg text-muted-foreground sm:text-xl">
            Bills, to-buy lists, and tasks—mark what you&apos;ve paid each month and see your dashboard at a glance,
            like the apps you already trust, without the noise.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row lg:justify-start">
            <Button size="lg" asChild className="min-w-[200px] shadow-md">
              <Link href={!loading && user ? "/dashboard" : "/signup"}>
                {!loading && user ? "Go to Dashboard" : "Get started free"}
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild className="min-w-[200px] bg-background/80 backdrop-blur">
              <a href="#features">See features</a>
            </Button>
          </div>
        </div>
        <HeroCreditCard />
      </div>
    </section>
  );
}
