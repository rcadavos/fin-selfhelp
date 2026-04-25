"use client";

import { useState } from "react";
import { Star, MessageSquarePlus, CheckCircle2, Clock, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useUser } from "@/hooks/use-user";
import { getAccountDisplayName } from "@/components/app/account-dropdown-menu";
import {
  submitReview,
  submitSuggestion,
  updateMyReview,
  type MyReviewRow,
} from "@/actions/feedback";

// ─── Star Rating ──────────────────────────────────────────────────────────────

function StarRating({
  value,
  onChange,
  disabled,
}: {
  value: number;
  onChange: (v: number) => void;
  disabled?: boolean;
}) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={disabled}
          onClick={() => onChange(n)}
          onMouseEnter={() => setHovered(n)}
          onMouseLeave={() => setHovered(0)}
          className="p-0.5 transition-transform hover:scale-110 disabled:pointer-events-none"
          aria-label={`${n} star${n !== 1 ? "s" : ""}`}
        >
          <Star
            className={cn(
              "h-6 w-6 transition-colors",
              (hovered || value) >= n
                ? "fill-amber-400 text-amber-400"
                : "text-muted-foreground/30",
            )}
          />
        </button>
      ))}
    </div>
  );
}

// ─── Review Section ───────────────────────────────────────────────────────────

function ReviewSection({ initialReview, displayName }: { initialReview: MyReviewRow | null; displayName: string }) {
  const [review, setReview] = useState<MyReviewRow | null>(initialReview);
  const [editing, setEditing] = useState(false);
  const [anonymous, setAnonymous] = useState(initialReview ? initialReview.author_name === null : false);
  const [content, setContent] = useState(initialReview?.content ?? "");
  const [rating, setRating] = useState(initialReview?.rating ?? 0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const authorName = anonymous ? null : displayName;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) { setError("Please write your review."); return; }
    setSaving(true);
    setError(null);

    if (review && editing) {
      const res = await updateMyReview(review.id, {
        authorName: authorName ?? null,
        content: content.trim(),
        rating: rating || null,
      });
      setSaving(false);
      if (res.error) { setError(res.error); return; }
      setReview({ ...review, author_name: authorName ?? null, content: content.trim(), rating: rating || null });
      setEditing(false);
    } else {
      const res = await submitReview({
        authorName: authorName ?? null,
        content: content.trim(),
        rating: rating || null,
      });
      setSaving(false);
      if (res.error) { setError(res.error); return; }
      setDone(true);
    }
  }

  // Already submitted — show status card
  if (review && !editing) {
    return (
      <div className="space-y-3">
        <div className={cn(
          "flex items-start gap-3 rounded-xl border p-4",
          review.status === "approved"
            ? "border-emerald-200 bg-emerald-50/60 dark:border-emerald-800/40 dark:bg-emerald-950/20"
            : "border-amber-200 bg-amber-50/60 dark:border-amber-800/40 dark:bg-amber-950/20",
        )}>
          <div className="mt-0.5 shrink-0">
            {review.status === "approved"
              ? <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              : <Clock className="h-5 w-5 text-amber-500" />}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">
              {review.status === "approved" ? "Review published" : "Review pending approval"}
            </p>
            {review.rating != null && (
              <div className="mt-1 flex gap-0.5">
                {[1, 2, 3, 4, 5].map((n) => (
                  <Star key={n} className={cn("h-3.5 w-3.5", n <= review.rating! ? "fill-amber-400 text-amber-400" : "text-muted-foreground/20")} />
                ))}
              </div>
            )}
            <p className="mt-1 text-sm text-muted-foreground">&ldquo;{review.content}&rdquo;</p>
            {review.author_name && (
              <p className="mt-0.5 text-xs text-muted-foreground">— {review.author_name}</p>
            )}
          </div>
        </div>
        {review.status === "pending" && (
          <Button variant="outline" size="sm" onClick={() => { setEditing(true); setAnonymous(review.author_name === null); setContent(review.content); setRating(review.rating ?? 0); }}>
            Edit review
          </Button>
        )}
      </div>
    );
  }

  if (done) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 dark:border-emerald-800/40 dark:bg-emerald-950/20">
        <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />
        <p className="text-sm font-medium">Your review has been submitted and is pending approval. Thank you!</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label>Rating</Label>
        <StarRating value={rating} onChange={setRating} disabled={saving} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="review-name">Display name</Label>
        <Input
          id="review-name"
          value={anonymous ? "" : displayName}
          disabled
          placeholder="Anonymous"
          className="disabled:opacity-60"
        />
        <div className="flex items-center gap-2 pt-0.5">
          <input
            type="checkbox"
            id="review-anonymous"
            checked={anonymous}
            onChange={(e) => setAnonymous(e.target.checked)}
            disabled={saving}
            className="h-4 w-4 rounded border-input accent-primary cursor-pointer disabled:cursor-not-allowed"
          />
          <label htmlFor="review-anonymous" className="text-sm text-muted-foreground cursor-pointer select-none">
            Post as Anonymous
          </label>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="review-content">Your review</Label>
        <textarea
          id="review-content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Share your experience with mnitrak…"
          rows={4}
          disabled={saving}
          className="w-full resize-none rounded-md border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>

      {error && (
        <div className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800/40 dark:bg-red-950/20 dark:text-red-400">
          <span>{error}</span>
          <button type="button" onClick={() => setError(null)} className="ml-2 rounded p-0.5 hover:bg-red-100">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      <div className="flex gap-2">
        {editing && (
          <Button type="button" variant="outline" className="w-1/2" onClick={() => { setEditing(false); setError(null); setAnonymous(review?.author_name === null); }} disabled={saving}>
            Cancel
          </Button>
        )}
        <Button type="submit" className={editing ? "w-1/2" : "w-full"} disabled={saving || !content.trim()}>
          {saving ? "Submitting…" : editing ? "Save changes" : "Submit review"}
        </Button>
      </div>
    </form>
  );
}

// ─── Suggestion Section ───────────────────────────────────────────────────────

function SuggestionSection() {
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) { setError("Please write your feedback."); return; }
    setSaving(true);
    setError(null);
    const res = await submitSuggestion({ content: content.trim() });
    setSaving(false);
    if (res.error) { setError(res.error); return; }
    setContent("");
    setDone(true);
  }

  if (done) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 dark:border-emerald-800/40 dark:bg-emerald-950/20">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />
          <p className="text-sm font-medium">Your feedback has been sent. Thank you!</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setDone(false)}>
          Submit another
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="suggestion-content">Your feedback</Label>
        <textarea
          id="suggestion-content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Want to report a bug? Or suggest a feature or improvement? Your feedback helps us make Omnitrak better! We will reward you with subscription if your bug is valid or your suggestion gets implemented."
          rows={5}
          disabled={saving}
          className="w-full resize-none rounded-md border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>

      {error && (
        <div className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800/40 dark:bg-red-950/20 dark:text-red-400">
          <span>{error}</span>
          <button type="button" onClick={() => setError(null)} className="ml-2 rounded p-0.5 hover:bg-red-100">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      <Button type="submit" className="w-full" disabled={saving || !content.trim()}>
        {saving ? "Submitting…" : "Send feedback"}
      </Button>
    </form>
  );
}

// ─── Main Board ───────────────────────────────────────────────────────────────

type Tab = "review" | "suggestion";

export function FeedbackBoard({ initialReview }: { initialReview: MyReviewRow | null }) {
  const [tab, setTab] = useState<Tab>("review");
  const { user } = useUser();
  const displayName = user ? getAccountDisplayName(user) : "";

  return (
    <div className="mx-auto max-w-xl px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <MessageSquarePlus className="h-6 w-6 shrink-0" aria-hidden />
          Review &amp; Feedback
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Share your experience or suggest new features — we read every submission.
        </p>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex items-center gap-1 rounded-lg border bg-muted/40 p-0.5 w-fit">
        {([
          { key: "review", label: "Leave a Review" },
          { key: "suggestion", label: "Feedback" },
        ] as { key: Tab; label: string }[]).map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={cn(
              "rounded-md px-4 py-1.5 text-sm font-medium transition-colors",
              tab === key
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="rounded-xl border bg-card p-5 shadow-sm">
        {tab === "review" ? (
          <ReviewSection initialReview={initialReview} displayName={displayName} />
        ) : (
          <SuggestionSection />
        )}
      </div>
    </div>
  );
}
