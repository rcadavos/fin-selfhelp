"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useUser } from "@/hooks/use-user";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

export function CtaBandSection({ className }: { className?: string }) {
  const { user, loading } = useUser();
  const [navigating, setNavigating] = useState(false);

  return (
    <section
      id="cta"
      className={cn(
        "border-t-2 border-primary bg-panel px-4 py-16 text-panel-foreground sm:px-6 lg:px-8 lg:py-20",
        className
      )}
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-8 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl lg:text-[2.4rem]">
            Ready to track it all?
          </h2>
          <p className="mt-3 max-w-[46ch] text-panel-muted">
            Bills, lists, and goals in one place. Open your dashboard in seconds, no bank
            linking required.
          </p>
        </div>
        <div className="shrink-0">
          {loading ? (
            <Button size="lg" className="h-11 min-w-[13rem]" disabled aria-busy>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            </Button>
          ) : (
            <Button
              size="lg"
              asChild={!navigating}
              disabled={navigating}
              className="h-11 min-w-[13rem]"
            >
              {navigating ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <Link href={user ? "/dashboard" : "/signup"} onClick={() => setNavigating(true)}>
                  {user ? "Go to Dashboard" : "Start free 14-day trial"}
                </Link>
              )}
            </Button>
          )}
        </div>
      </div>
    </section>
  );
}
