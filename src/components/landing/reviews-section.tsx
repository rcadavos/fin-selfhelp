"use client";

import { Star } from "lucide-react";
import type { ApprovedReviewRow } from "@/actions/feedback";
import { cn } from "@/lib/utils";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-PH", { year: "numeric", month: "long" });
}

function attribution(review: ApprovedReviewRow): string {
  return `${review.author_name || "Anonymous"} • ${formatDate(review.created_at)}`;
}

function Stars({ value, className }: { value: number; className?: string }) {
  return (
    <div
      className={cn("flex items-center gap-0.5", className)}
      aria-label={`${value} out of 5 stars`}
    >
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          className={cn(
            "h-3.5 w-3.5",
            i < value ? "fill-warning text-warning" : "fill-transparent text-muted-foreground/30"
          )}
        />
      ))}
    </div>
  );
}

export function ReviewsSection({
  className,
  reviews,
}: {
  className?: string;
  reviews: ApprovedReviewRow[];
}) {
  if (reviews.length === 0) return null;

  const [featured, ...rest] = reviews;

  const rated = reviews.filter(
    (r): r is ApprovedReviewRow & { rating: number } =>
      typeof r.rating === "number" && r.rating > 0
  );
  const avgRating = rated.length
    ? rated.reduce((sum, r) => sum + r.rating, 0) / rated.length
    : null;

  return (
    <section
      id="reviews"
      className={cn("border-t border-border px-4 py-16 sm:px-6 lg:px-8 lg:py-24", className)}
    >
      <div className="mx-auto max-w-6xl">
        {/* Section header + aggregate rating */}
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <span className="eyebrow">Loved by the community</span>
            <h2 className="mt-3 max-w-[18ch] text-balance text-2xl font-bold tracking-tight text-foreground sm:text-3xl lg:text-[2.15rem]">
              What our users say
            </h2>
          </div>

          {avgRating !== null && (
            <div className="flex items-center gap-4 self-start surface border border-border bg-card px-4 py-3 sm:self-auto">
              <span className="figure text-3xl text-foreground">{avgRating.toFixed(1)}</span>
              <div>
                <Stars value={Math.round(avgRating)} />
                <p className="mt-1.5 font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
                  {rated.length} review{rated.length === 1 ? "" : "s"}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Featured testimonial */}
        <blockquote className="mt-10 max-w-4xl border-l-2 border-primary pl-5 sm:mt-12 sm:pl-6">
          {featured!.rating ? <Stars value={featured!.rating} className="mb-4" /> : null}
          <p className="text-balance text-2xl font-medium leading-snug tracking-tight text-foreground sm:text-3xl lg:text-[2.05rem]">
            &ldquo;{featured!.content}&rdquo;
          </p>
          <footer className="mt-5 font-mono text-xs uppercase tracking-wide text-muted-foreground">
            {attribution(featured!)}
          </footer>
        </blockquote>

        {/* Secondary reviews as cards */}
        {rest.length > 0 && (
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {rest.map((review) => (
              <figure
                key={review.id}
                className="flex h-full flex-col surface border border-border bg-card p-5 transition-colors hover:border-primary/40 hover:bg-accent/40"
              >
                {review.rating ? <Stars value={review.rating} className="mb-3" /> : null}
                <blockquote className="flex-1 text-[15px] leading-relaxed text-foreground">
                  &ldquo;{review.content}&rdquo;
                </blockquote>
                <figcaption className="mt-4 border-t border-border pt-3 font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
                  {attribution(review)}
                </figcaption>
              </figure>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
