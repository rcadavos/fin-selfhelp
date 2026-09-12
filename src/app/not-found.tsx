import Link from "next/link";
import { buildPageMetadata } from "@/lib/seo";
import { NotFoundActions } from "@/components/pages/not-found-actions";
import { cn } from "@/lib/utils";

export const metadata = buildPageMetadata({
  title: "Page not found",
  description: "We could not find that page. Return home or go back to where you were.",
  noIndex: true,
});

export default function NotFound() {
  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden bg-background">
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -left-32 top-1/4 h-96 w-96 rounded-full"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-24 bottom-0 h-80 w-80 rounded-full"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 h-[28rem] w-[28rem] -translate-x-1/2 -translate-y-1/2 rounded-full"
        aria-hidden
      />

      <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-4 py-16 text-center">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.35em] text-muted-foreground">Error</p>
        <h1
          className={cn(
            "select-none text-7xl font-black tracking-tighter text-primary",
            "sm:text-8xl"
          )}
        >
          404
        </h1>
        <p className="mt-4 max-w-md text-lg font-medium text-foreground sm:text-xl">This page drifted off the map</p>
        <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
          The link may be wrong, or the page was removed. Pick a path below and you&apos;ll be back on track.
        </p>

        <div className="mt-10 w-full max-w-md surface border border-border/60 bg-card p-6">
          <NotFoundActions />
          <p className="mt-6 text-center text-xs text-muted-foreground">
            Wrong turn?{" "}
            <Link href="/login" className="font-medium text-primary underline-offset-4 hover:underline">
              Log in
            </Link>{" "}
            if you were trying to reach your dashboard.
          </p>
        </div>
      </main>
    </div>
  );
}
