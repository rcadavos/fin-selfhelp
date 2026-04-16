"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  getReviewsForAdmin,
  setReviewStatus,
  updateReview,
  deleteReview,
  type ReviewForAdminRow,
} from "@/actions/feedback";
import { Loader2, Check, X, Star, Pencil, ChevronLeft } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { cn } from "@/lib/utils";

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, { dateStyle: "medium" });
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

export default function AdminReviewsPage() {
  const queryClient = useQueryClient();
  const [editingReviewId, setEditingReviewId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editRating, setEditRating] = useState<number | null>(null);

  const { data: reviews = [], isLoading, error } = useQuery({
    queryKey: ["omni-trak", "admin", "reviews"],
    queryFn: async () => {
      const res = await getReviewsForAdmin();
      if (res.error) throw new Error(res.error);
      return res.reviews;
    },
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => setReviewStatus(id, "approved"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["omni-trak", "admin", "reviews"] });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (id: string) => setReviewStatus(id, "rejected"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["omni-trak", "admin", "reviews"] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, authorName, content, rating }: { id: string; authorName: string; content: string; rating: number | null }) =>
      updateReview(id, { authorName, content, rating }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["omni-trak", "admin", "reviews"] });
      setEditingReviewId(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteReview(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["omni-trak", "admin", "reviews"] });
    },
  });

  function startEdit(r: ReviewForAdminRow) {
    setEditingReviewId(r.id);
    setEditName(r.author_name ?? "");
    setEditContent(r.content);
    setEditRating(r.rating ?? null);
  }

  if (isLoading) {
    return (
      <main className="container mx-auto max-w-4xl flex justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </main>
    );
  }

  return (
    <main className="container mx-auto max-w-4xl py-8">
      <div className="mb-6">
        <Link
          href="/admin"
          className="inline-flex items-center gap-0.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />Back to Admin
        </Link>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Reviews</CardTitle>
          <CardDescription>
            Approve or reject reviews. Approved reviews appear on the landing page.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <p className="text-sm text-destructive mb-4">
              {(error as Error).message}
            </p>
          )}
          {reviews.length === 0 && !error ? (
            <p className="text-muted-foreground">No reviews yet.</p>
          ) : (
            <ul className="space-y-4">
              {reviews.map((r: ReviewForAdminRow) => (
                <li
                  key={r.id}
                  className="rounded-lg border bg-muted/20 p-4 space-y-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {r.author_name || "Anonymous"}
                      </span>
                      <Badge variant={statusVariant(r.status)}>{statusLabel(r.status)}</Badge>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      {r.rating != null && (
                        <span className="flex items-center gap-0.5">
                          <Star className="h-4 w-4 fill-amber-500 text-amber-500" />
                          {r.rating}
                        </span>
                      )}
                      <span>{formatDate(r.created_at)}</span>
                    </div>
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{r.content}</p>
                  <div className="flex gap-2 pt-1 flex-wrap">
                    {r.status === "pending" && (
                      <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => startEdit(r)}
                        disabled={
                          approveMutation.isPending || rejectMutation.isPending || deleteMutation.isPending
                        }
                      >
                        <Pencil className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => approveMutation.mutate(r.id)}
                        disabled={
                          approveMutation.isPending || rejectMutation.isPending || deleteMutation.isPending
                        }
                      >
                        {approveMutation.isPending &&
                        approveMutation.variables === r.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <Check className="h-4 w-4 mr-1" />
                            Approve
                          </>
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => rejectMutation.mutate(r.id)}
                        disabled={
                          approveMutation.isPending || rejectMutation.isPending || deleteMutation.isPending
                        }
                      >
                        {rejectMutation.isPending &&
                        rejectMutation.variables === r.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <X className="h-4 w-4 mr-1" />
                            Reject
                          </>
                        )}
                      </Button>
                      </>
                    )}
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => {
                        if (!confirm("Remove this review permanently?")) return;
                        deleteMutation.mutate(r.id);
                      }}
                      disabled={
                        approveMutation.isPending || rejectMutation.isPending || deleteMutation.isPending
                      }
                    >
                      {deleteMutation.isPending && deleteMutation.variables === r.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        "Remove"
                      )}
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <Dialog open={editingReviewId !== null} onOpenChange={(open) => !open && setEditingReviewId(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit review</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-name">Name</Label>
                  <Input
                    id="edit-name"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="Anonymous"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-content">Content</Label>
                  <textarea
                    id="edit-content"
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    placeholder="Your review"
                    rows={3}
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
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingReviewId(null)}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  disabled={updateMutation.isPending}
                  onClick={() =>
                    updateMutation.mutate({
                      id: editingReviewId!,
                      authorName: editName,
                      content: editContent,
                      rating: editRating,
                    })
                  }
                >
                  {updateMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Save"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    </main>
  );
}
