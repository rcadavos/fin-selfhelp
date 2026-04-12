import { Card, CardContent } from "@/components/ui/card";
import type { ApprovedReviewRow } from "@/actions/feedback";
import { Star, Quote } from "lucide-react";
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
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {reviews.map((r) => (
            <Card key={r.id} className="border-border/50 flex flex-col">
              <CardContent className="pt-6 flex flex-col flex-1">
                {r.rating != null && (
                  <div className="flex gap-0.5 text-amber-500 mb-2" aria-hidden>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <Star
                        key={n}
                        className={cn("h-4 w-4", n <= r.rating! && "fill-current")}
                      />
                    ))}
                  </div>
                )}
                <Quote className="h-8 w-8 text-muted-foreground/50 mb-2" aria-hidden />
                <p className="text-sm text-foreground flex-1 whitespace-pre-wrap">
                  {r.content}
                </p>
                <div className="mt-4 pt-3 border-t border-border/50 flex justify-between items-center">
                  <span className="text-sm font-medium text-foreground">
                    {r.author_name || "Anonymous"}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatDate(r.created_at)}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
