"use client";

import { Card, CardContent } from "@/components/ui/card";
import type { ApprovedReviewRow } from "@/actions/feedback";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-PH", { year: "numeric", month: "long" });
}

function ReviewCard({ review }: { review: ApprovedReviewRow }) {
  return (
    <Card className="mb-4 break-inside-avoid border-border/50 bg-card shadow-sm">
      <CardContent className="p-5">
        {review.rating != null && (
          <div className="mb-3 flex gap-0.5 text-amber-500" aria-hidden>
            {[1, 2, 3, 4, 5].map((n) => (
              <Star key={n} className={cn("h-3.5 w-3.5", n <= review.rating! && "fill-current")} />
            ))}
          </div>
        )}
        <p className="text-sm leading-relaxed text-foreground">{review.content}</p>
        <div className="mt-4 flex items-center gap-3 border-t border-border/50 pt-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
            {(review.author_name || "A")[0]!.toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">{review.author_name || "Anonymous"}</p>
            <p className="text-xs text-muted-foreground">{formatDate(review.created_at)}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function MarqueeColumn({
  reviews,
  direction = "up",
  speed = 40,
}: {
  reviews: ApprovedReviewRow[];
  direction?: "up" | "down";
  speed?: number;
}) {
  const doubled = [...reviews, ...reviews];
  const duration = `${speed}s`;

  return (
    <div className="overflow-hidden">
      <style>{`
        @keyframes marquee-up {
          0%   { transform: translateY(0); }
          100% { transform: translateY(-50%); }
        }
        @keyframes marquee-down {
          0%   { transform: translateY(-50%); }
          100% { transform: translateY(0); }
        }
        .marquee-up   { animation: marquee-up   linear infinite; }
        .marquee-down { animation: marquee-down linear infinite; }
        .marquee-col:hover .marquee-up,
        .marquee-col:hover .marquee-down { animation-play-state: paused; }
      `}</style>
      <div className={cn("marquee-col", direction === "up" ? "marquee-up" : "marquee-down")} style={{ animationDuration: duration }}>
        {doubled.map((r, i) => (
          <ReviewCard key={`${r.id}-${i}`} review={r} />
        ))}
      </div>
    </div>
  );
}

function splitIntoColumns(reviews: ApprovedReviewRow[], n: number): ApprovedReviewRow[][] {
  const cols: ApprovedReviewRow[][] = Array.from({ length: n }, () => []);
  reviews.forEach((r, i) => cols[i % n]!.push(r));
  return cols;
}

export function ReviewsSection({
  className,
  reviews,
}: {
  className?: string;
  reviews: ApprovedReviewRow[];
}) {
  if (reviews.length === 0) return null;

  const useWall = reviews.length >= 3;

  if (!useWall) {
    return (
      <section id="reviews" className={cn("border-t px-4 py-16 sm:px-6 lg:px-8", className)}>
        <div className="mx-auto max-w-5xl">
          <div className="mb-10 text-center">
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">What users say</h2>
            <p className="mt-2 text-muted-foreground">From paid OmniTrak users.</p>
          </div>
          <div className="flex flex-wrap justify-center gap-6">
            {reviews.map((r) => <ReviewCard key={r.id} review={r} />)}
          </div>
        </div>
      </section>
    );
  }

  const cols = splitIntoColumns(reviews, 3);
  const speeds = [45, 35, 50];
  const directions: ("up" | "down")[] = ["up", "down", "up"];

  return (
    <section id="reviews" className={cn("border-t px-4 py-16 sm:px-6 lg:px-8", className)}>
      <div className="mx-auto max-w-6xl">
        <div className="mb-10 text-center">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">What users say</h2>
          <p className="mt-2 text-muted-foreground">From paid OmniTrak users.</p>
        </div>
        <div
          className="relative h-[520px] overflow-hidden"
          style={{
            maskImage: "linear-gradient(to bottom, transparent, black 12%, black 88%, transparent)",
            WebkitMaskImage: "linear-gradient(to bottom, transparent, black 12%, black 88%, transparent)",
          }}
        >
          <div className="grid h-full grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {cols.map((col, i) => (
              <div key={i} className={cn(i === 2 && "hidden lg:block", i === 1 && "hidden sm:block")}>
                <MarqueeColumn
                  reviews={col.length >= 2 ? col : [...col, ...col, ...col]}
                  direction={directions[i]}
                  speed={speeds[i]}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
