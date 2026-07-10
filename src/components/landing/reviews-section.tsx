"use client";

import type { ApprovedReviewRow } from "@/actions/feedback";
import { cn } from "@/lib/utils";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-PH", { year: "numeric", month: "long" });
}

function attribution(review: ApprovedReviewRow): string {
  return `${review.author_name || "Anonymous"} • ${formatDate(review.created_at)}`;
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

  return (
    <section
      id="reviews"
      className={cn("border-t border-border px-4 py-16 sm:px-6 lg:px-8 lg:py-24", className)}
    >
      <div className="mx-auto max-w-6xl">
        <h2 className="sr-only">What users say</h2>

        <blockquote>
          <p className="max-w-3xl text-balance text-2xl font-medium leading-snug tracking-tight text-foreground sm:text-3xl lg:text-[2.05rem]">
            &ldquo;{featured!.content}&rdquo;
          </p>
          <footer className="mt-5 font-mono text-xs uppercase tracking-wide text-muted-foreground">
            {attribution(featured!)}
          </footer>
        </blockquote>

        {rest.length > 0 && (
          <div className="mt-12 grid border-t border-border sm:grid-cols-2 sm:gap-x-12">
            {rest.map((review) => (
              <figure key={review.id} className="border-b border-border py-6">
                <blockquote className="text-[15px] leading-relaxed text-foreground">
                  &ldquo;{review.content}&rdquo;
                </blockquote>
                <figcaption className="mt-2.5 font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
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
