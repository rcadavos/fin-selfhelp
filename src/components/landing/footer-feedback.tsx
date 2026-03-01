"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { getMyReview, getReviewEligibility, type MyReviewRow, submitSuggestion, submitReview, updateReview } from "@/actions/feedback";
import { useSnackbar } from "@/components/ui/snackbar-provider";
import { MessageSquare, Star, Send, Loader2, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMutation } from "@tanstack/react-query";

export function FooterFeedback({ className }: { className?: string }) {
  const { showError: showSnackbar, showSuccess } = useSnackbar();
  const [suggestionEmail, setSuggestionEmail] = useState("");
  const [suggestionContent, setSuggestionContent] = useState("");
  const [suggestionStatus, setSuggestionStatus] = useState<"idle" | "sending" | "sent">("idle");

  const [reviewName, setReviewName] = useState("");
  const [reviewContent, setReviewContent] = useState("");
  const [reviewRating, setReviewRating] = useState<number | null>(null);
  const [reviewStatus, setReviewStatus] = useState<"idle" | "sending" | "sent">("idle");
  const [reviewEligibility, setReviewEligibility] = useState<
    { state: "loading" } | { state: "eligible" } | { state: "ineligible"; reason: string }
  >({ state: "loading" });
  const [myReview, setMyReview] = useState<MyReviewRow | null>(null);
  const [editingMyReview, setEditingMyReview] = useState(false);
  const [editName, setEditName] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editRating, setEditRating] = useState<number | null>(null);

  const updateMyReviewMutation = useMutation({
    mutationFn: ({ authorName, content, rating }: { authorName: string; content: string; rating: number | null }) =>
      myReview ? updateReview(myReview.id, { authorName, content, rating }) : Promise.resolve({ error: "No review" }),
    onSuccess: async (result) => {
      if (result?.error) return;
      setEditingMyReview(false);
      const res = await getMyReview();
      if (res.review) setMyReview(res.review);
      showSuccess("Review updated.");
    },
  });

  function startEditMyReview() {
    if (!myReview) return;
    setEditName(myReview.author_name ?? "");
    setEditContent(myReview.content);
    setEditRating(myReview.rating ?? null);
    setEditingMyReview(true);
  }

  function statusVariant(
    status: string
  ): "secondary" | "default" | "destructive" | "outline" | "pending" {
    if (status === "approved") return "default";
    if (status === "rejected") return "destructive";
    if (status === "pending") return "pending";
    return "secondary";
  }

  function statusLabel(status: string): string {
    if (!status) return status;
    return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await getReviewEligibility();
      if (cancelled) return;
      if (!res.canSubmit) {
        setReviewEligibility({ state: "ineligible", reason: res.reason ?? "You already submitted a review." });
        const mine = await getMyReview();
        if (!cancelled && mine.review) setMyReview(mine.review);
        return;
      }
      setReviewEligibility({ state: "eligible" });
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSuggestion(e: React.FormEvent) {
    e.preventDefault();
    if (!suggestionContent.trim()) return;
    setSuggestionStatus("sending");
    const result = await submitSuggestion({
      email: suggestionEmail.trim() || null,
      content: suggestionContent.trim(),
    });
    if (result.error) {
      showSnackbar(result.error);
      setSuggestionStatus("idle");
    } else {
      setSuggestionContent("");
      setSuggestionEmail("");
      setSuggestionStatus("sent");
      showSuccess("Suggestion sent. Thank you!");
      setTimeout(() => setSuggestionStatus("idle"), 3000);
    }
  }

  async function handleReview(e: React.FormEvent) {
    e.preventDefault();
    if (!reviewContent.trim()) return;
    setReviewStatus("sending");
    const result = await submitReview({
      authorName: reviewName.trim() || null,
      content: reviewContent.trim(),
      rating: reviewRating,
    });
    if (result.error) {
      showSnackbar(result.error);
      setReviewStatus("idle");
    } else {
      setReviewContent("");
      setReviewName("");
      setReviewRating(null);
      setReviewStatus("sent");
      setReviewEligibility({ state: "ineligible", reason: "You already submitted a review." });
      const mine = await getMyReview();
      if (mine.review) setMyReview(mine.review);
      showSuccess("Review submitted. It will appear after approval.");
      setTimeout(() => setReviewStatus("idle"), 3000);
    }
  }

  return (
    <div className={cn("bg-muted/40 rounded-lg mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8", className)}>
      <h3 className="text-lg font-semibold text-foreground mb-6">Suggestions & reviews</h3>
      <div className="grid gap-8 sm:grid-cols-2">
        {/* Suggestion form */}
        <div className="rounded-lg border bg-background p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-3">
            <MessageSquare className="h-4 w-4" />
            <span className="text-sm font-medium">Leave a suggestion</span>
          </div>
          <form onSubmit={handleSuggestion} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="suggestion-email" className="text-xs">Email (optional)</Label>
              <Input
                id="suggestion-email"
                type="email"
                placeholder="you@example.com"
                value={suggestionEmail}
                onChange={(e) => setSuggestionEmail(e.target.value)}
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="suggestion-content" className="text-xs">Your suggestion</Label>
              <textarea
                id="suggestion-content"
                placeholder="Feature idea, feedback..."
                value={suggestionContent}
                onChange={(e) => setSuggestionContent(e.target.value)}
                rows={3}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                required
                minLength={2}
              />
            </div>
            <Button type="submit" size="sm" disabled={suggestionStatus === "sending"}>
              {suggestionStatus === "sending" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : suggestionStatus === "sent" ? (
                "Sent"
              ) : (
                <>
                  <Send className="h-3.5 w-3.5 mr-1" />
                  Send suggestion
                </>
              )}
            </Button>
          </form>
        </div>

        {/* Review form */}
        <div className="rounded-lg border bg-background p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-3">
            <Star className="h-4 w-4" />
            <span className="text-sm font-medium">Write a review</span>
          </div>
          {reviewEligibility.state === "loading" ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Checking…
            </div>
          ) : reviewEligibility.state === "ineligible" ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">{reviewEligibility.reason}</p>
              {myReview && (
                <div className="space-y-2">
                  <div className="rounded-md border bg-muted/20 p-3 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-sm font-medium">
                        {myReview.author_name || "Anonymous"}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={statusVariant(myReview.status)}>{statusLabel(myReview.status)}</Badge>
                        {myReview.status === "pending" && (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={startEditMyReview}
                            disabled={updateMyReviewMutation.isPending}
                          >
                            <Pencil className="h-3.5 w-3.5 mr-1" />
                            Edit
                          </Button>
                        )}
                      </div>
                    </div>
                    {myReview.rating != null && (
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Star className="h-4 w-4 fill-amber-500 text-amber-500" />
                        <span>{myReview.rating}</span>
                      </div>
                    )}
                    <p className="text-sm whitespace-pre-wrap">{myReview.content}</p>
                    <p className="text-xs text-muted-foreground">
                      {myReview.status === "pending"
                        ? "You can edit your review until it's approved. It will be visible publicly after approval."
                        : "Your review is visible publicly only after approval."}
                    </p>
                  </div>
                  <Dialog open={editingMyReview} onOpenChange={setEditingMyReview}>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Edit your review</DialogTitle>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                          <Label htmlFor="edit-my-name">Name</Label>
                          <Input
                            id="edit-my-name"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            placeholder="Anonymous"
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label>Rating</Label>
                          <div className="flex gap-1">
                            {[1, 2, 3, 4, 5].map((n) => (
                              <button
                                key={n}
                                type="button"
                                onClick={() => setEditRating(editRating === n ? null : n)}
                                className={cn(
                                  "rounded p-1.5 transition-colors",
                                  editRating !== null && n <= editRating
                                    ? "text-amber-500 hover:text-amber-600"
                                    : "text-muted-foreground hover:text-foreground"
                                )}
                                aria-label={`${n} star${n > 1 ? "s" : ""}`}
                              >
                                <Star className="h-5 w-5 fill-current" />
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="edit-my-content">Your review</Label>
                          <textarea
                            id="edit-my-content"
                            className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            placeholder="Share your experience..."
                            rows={3}
                            required
                            minLength={2}
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setEditingMyReview(false)}>
                          Cancel
                        </Button>
                        <Button
                          type="button"
                          disabled={updateMyReviewMutation.isPending || !editContent.trim() || editContent.trim().length < 2}
                          onClick={() =>
                            updateMyReviewMutation.mutate({
                              authorName: editName.trim() || "",
                              content: editContent.trim(),
                              rating: editRating,
                            })
                          }
                        >
                          {updateMyReviewMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            "Save"
                          )}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              )}
            </div>
          ) : (
            <form onSubmit={handleReview} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="review-name" className="text-xs">Your name (optional)</Label>
                <Input
                  id="review-name"
                  type="text"
                  placeholder="Anonymous"
                  value={reviewName}
                  onChange={(e) => setReviewName(e.target.value)}
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Rating (optional)</Label>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setReviewRating((r) => (r === n ? null : n))}
                      className={cn(
                        "rounded p-1.5 transition-colors",
                        reviewRating !== null && n <= reviewRating
                          ? "text-amber-500 hover:text-amber-600"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                      aria-label={`${n} star${n > 1 ? "s" : ""}`}
                    >
                      <Star className="h-5 w-5 fill-current" />
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="review-content" className="text-xs">Your review</Label>
                <textarea
                  id="review-content"
                  placeholder="Share your experience..."
                  value={reviewContent}
                  onChange={(e) => setReviewContent(e.target.value)}
                  rows={3}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  required
                  minLength={2}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Reviews are published after approval.
              </p>
              <Button type="submit" size="sm" disabled={reviewStatus === "sending"}>
                {reviewStatus === "sending" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : reviewStatus === "sent" ? (
                  "Submitted"
                ) : (
                  <>
                    <Send className="h-3.5 w-3.5 mr-1" />
                    Submit review
                  </>
                )}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
