"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import type { ApprovedReviewRow } from "@/actions/feedback";
import { Star, Quote, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-PH", { year: "numeric", month: "long" });
}

export function ReviewsSection({
  className,
  reviews,
}: {
  className?: string;
  reviews: ApprovedReviewRow[];
}) {
  if (reviews.length === 0) return null;
  const isCarousel = reviews.length >= 4;
  const [activeIndex, setActiveIndex] = useState(0);

  function goPrev() {
    setActiveIndex((prev) => (prev - 1 + reviews.length) % reviews.length);
  }

  function goNext() {
    setActiveIndex((prev) => (prev + 1) % reviews.length);
  }

  function ReviewCard({ review }: { review: ApprovedReviewRow }) {
    return (
      <Card className="border-border/50 flex w-full max-w-md flex-col">
        <CardContent className="flex flex-1 flex-col pt-6 text-center">
          {review.rating != null && (
            <div className="mb-2 flex justify-center gap-0.5 text-amber-500" aria-hidden>
              {[1, 2, 3, 4, 5].map((n) => (
                <Star key={n} className={cn("h-4 w-4", n <= review.rating! && "fill-current")} />
              ))}
            </div>
          )}
          <Quote className="mb-2 h-8 w-8 self-center text-muted-foreground/50" aria-hidden />
          <p className="text-sm text-foreground flex-1 whitespace-pre-wrap">{review.content}</p>
          <div className="mt-4 flex items-center justify-center gap-3 border-t border-border/50 pt-3">
            <span className="text-sm font-medium text-foreground">{review.author_name || "Anonymous"}</span>
            <span className="text-xs text-muted-foreground">{formatDate(review.created_at)}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <section id="reviews" className={cn("px-4 py-16 sm:px-6 lg:px-8 border-t", className)}>
      <div className="mx-auto max-w-5xl">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Reviews
          </h2>
          <p className="mt-2 text-md text-muted-foreground">
            Reviews from paid users using OmniTrak.
          </p>
        </div>
        {isCarousel ? (
          <div className="mx-auto max-w-md space-y-4">
            <ReviewCard review={reviews[activeIndex]!} />
            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-background text-foreground transition-colors hover:bg-muted"
                onClick={goPrev}
                aria-label="Previous review"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-sm text-muted-foreground">
                {activeIndex + 1} / {reviews.length}
              </span>
              <button
                type="button"
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-background text-foreground transition-colors hover:bg-muted"
                onClick={goNext}
                aria-label="Next review"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap justify-center gap-6">
            {reviews.map((r) => (
              <ReviewCard key={r.id} review={r} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
