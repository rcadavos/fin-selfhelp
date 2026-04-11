"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useUser } from "@/hooks/use-user";
import { cn } from "@/lib/utils";
import { ArrowRight } from "lucide-react";

export function CtaBandSection({ className }: { className?: string }) {
  const { user, loading } = useUser();

  return (
    <section
      className={cn(
        "relative overflow-hidden border-t px-4 py-16 sm:px-6 lg:px-8",
        "bg-gradient-to-br from-primary via-emerald-600 to-teal-800 text-primary-foreground",
        className
      )}
    >
      <div className="pointer-events-none absolute -right-24 top-0 h-64 w-64 rounded-full bg-white/10 blur-3xl" aria-hidden />
      <div className="pointer-events-none absolute -left-16 bottom-0 h-48 w-48 rounded-full bg-black/10 blur-2xl" aria-hidden />
      <div className="relative mx-auto flex max-w-4xl flex-col items-center gap-6 text-center">
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Ready to tidy up your money?</h2>
        <p className="max-w-xl text-lg text-primary-foreground/90">
          Open your dashboard in seconds, or browse features first — no bank linking required.
        </p>
        <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:justify-center">
          {loading ? (
            <Button size="lg" variant="secondary" className="min-w-[200px]" disabled>
              …
            </Button>
          ) : user ? (
            <Button size="lg" variant="secondary" className="min-w-[200px] gap-2 font-semibold shadow-lg" asChild>
              <Link href="/dashboard">
                Go to Dashboard
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </Button>
          ) : (
            <>
              <Button size="lg" variant="secondary" className="min-w-[200px] font-semibold shadow-lg" asChild>
                <Link href="/signup">Create free account</Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="min-w-[200px] border-white/40 bg-white/10 text-primary-foreground hover:bg-white/20"
                asChild
              >
                <Link href="/login">Log in</Link>
              </Button>
            </>
          )}
          <Button
            size="lg"
            variant="ghost"
            className="min-w-[200px] text-primary-foreground hover:bg-white/10 hover:text-primary-foreground"
            asChild
          >
            <a href="#features">See features</a>
          </Button>
        </div>
      </div>
    </section>
  );
}
