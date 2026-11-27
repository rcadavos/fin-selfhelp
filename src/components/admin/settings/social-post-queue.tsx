"use client";

import { useMemo, useState } from "react";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { AlertTriangle, ExternalLink, Pencil, Plus, Send, Trash2 } from "lucide-react";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { ToggleSwitch } from "@/components/ui/toggle-switch";
import { ConfirmDialog } from "@/components/app/confirm-dialog";
import { useSnackbar } from "@/components/ui/snackbar-provider";
import { deleteSocialPost, publishSocialPostNow, setSocialAutopublish } from "@/actions/social";
import {
  adminFacebookPageQueryOptions,
  adminSocialPostsQueryOptions,
  adminSocialSettingsQueryOptions,
} from "@/lib/query/admin-social";
import {
  SOCIAL_POST_PILLARS,
  SOCIAL_POST_STATUS_LABELS,
  SOCIAL_TIME_ZONE_LABEL,
  type SocialPostStatus,
} from "@/lib/constants/social";
import { formatManila } from "@/lib/social/schedule";
import type { SocialPost } from "@/types/social.types";
import type { ComposerSeed } from "./social-post-composer";

const STATUS_BADGE: Record<SocialPostStatus, BadgeProps["variant"]> = {
  draft: "secondary",
  scheduled: "default",
  publishing: "warning",
  published: "success",
  failed: "destructive",
};

const PUBLISHED_PAGE_SIZE = 10;

function pillarLabel(id: string | null): string | null {
  return SOCIAL_POST_PILLARS.find((p) => p.id === id)?.label ?? null;
}

function linkHost(link: string | null): string | null {
  if (!link) return null;
  try {
    return new URL(link).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

type PendingAction = { kind: "publish" | "delete"; post: SocialPost } | null;

function QueueRow({
  post,
  onEdit,
  onAction,
}: {
  post: SocialPost;
  onEdit: (post: SocialPost) => void;
  onAction: (action: NonNullable<PendingAction>) => void;
}) {
  const editable = post.status === "draft" || post.status === "scheduled" || post.status === "failed";
  const when =
    post.status === "published" && post.publishedAt
      ? `Posted ${formatManila(post.publishedAt)}`
      : post.scheduledFor
        ? formatManila(post.scheduledFor)
        : "Not scheduled";
  const meta = [when, pillarLabel(post.pillar), linkHost(post.link), post.imageUrl ? "Photo" : null]
    .filter(Boolean)
    .join(" • ");

  return (
    <li className="flex flex-col gap-3 py-4 sm:flex-row sm:items-start">
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={STATUS_BADGE[post.status]}>{SOCIAL_POST_STATUS_LABELS[post.status]}</Badge>
          <span className="text-xs text-muted-foreground">{meta}</span>
        </div>
        <p className="line-clamp-3 whitespace-pre-line text-sm">{post.message}</p>
        {post.error ? (
          <p className="flex items-start gap-1.5 text-xs text-destructive">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
            {post.error}
          </p>
        ) : null}
      </div>
      <div className="flex shrink-0 flex-wrap gap-1.5">
        {post.permalinkUrl ? (
          <Button variant="outline" size="sm" asChild className="gap-1.5">
            <a href={post.permalinkUrl} target="_blank" rel="noreferrer">
              Open <ExternalLink className="h-3.5 w-3.5" aria-hidden />
            </a>
          </Button>
        ) : null}
        {editable ? (
          <>
            <Button variant="outline" size="sm" onClick={() => onEdit(post)} className="gap-1.5">
              <Pencil className="h-3.5 w-3.5" aria-hidden />
              Edit
            </Button>
            <Button variant="outline" size="sm" onClick={() => onAction({ kind: "publish", post })} className="gap-1.5">
              <Send className="h-3.5 w-3.5" aria-hidden />
              {post.status === "failed" ? "Retry now" : "Publish now"}
            </Button>
          </>
        ) : null}
        {post.status !== "publishing" ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onAction({ kind: "delete", post })}
            aria-label="Delete"
            className="text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" aria-hidden />
          </Button>
        ) : null}
      </div>
    </li>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section>
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b pb-2">
        <h3 className="text-sm font-semibold">{title}</h3>
        {hint ? <span className="text-xs text-muted-foreground">{hint}</span> : null}
      </div>
      <ul className="divide-y">{children}</ul>
    </section>
  );
}

/** The auto-publish switch and every post in the queue, grouped by what needs doing. */
export function SocialPostQueue({ onCompose }: { onCompose: (seed: ComposerSeed) => void }) {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useSnackbar();
  const { data: posts } = useSuspenseQuery(adminSocialPostsQueryOptions());
  const { data: settings } = useSuspenseQuery(adminSocialSettingsQueryOptions());
  const [pending, setPending] = useState<PendingAction>(null);
  const [publishedShown, setPublishedShown] = useState(PUBLISHED_PAGE_SIZE);

  const groups = useMemo(() => {
    const by = (status: SocialPostStatus[]) => posts.filter((p) => status.includes(p.status));
    const time = (p: SocialPost) => new Date(p.scheduledFor ?? p.createdAt).getTime();
    return {
      upcoming: by(["scheduled"]).sort((a, b) => time(a) - time(b)),
      attention: by(["failed", "publishing"]),
      drafts: by(["draft"]),
      published: by(["published"]).sort(
        (a, b) => new Date(b.publishedAt ?? b.updatedAt).getTime() - new Date(a.publishedAt ?? a.updatedAt).getTime(),
      ),
    };
  }, [posts]);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: adminSocialPostsQueryOptions().queryKey });
    queryClient.invalidateQueries({ queryKey: adminFacebookPageQueryOptions().queryKey });
  };

  const autopublish = useMutation({
    mutationFn: async (next: boolean) => {
      const res = await setSocialAutopublish(next);
      if (res.error) throw new Error(res.error);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: adminSocialSettingsQueryOptions().queryKey }),
    onError: (e: Error) => showError(e.message),
  });

  const action = useMutation({
    mutationFn: async ({ kind, post }: NonNullable<PendingAction>) => {
      const res = kind === "publish" ? await publishSocialPostNow(post.id) : await deleteSocialPost(post.id);
      if (res.error) throw new Error(res.error);
      return kind;
    },
    onSuccess: (kind) => showSuccess(kind === "publish" ? "Posted to Facebook." : "Removed from the queue."),
    onError: (e: Error) => showError(e.message),
    onSettled: invalidate,
  });

  const connected = settings.pageIdSet && settings.tokenSet;
  const edit = (post: SocialPost) =>
    onCompose({
      id: post.id,
      message: post.message,
      link: post.link,
      imageUrl: post.imageUrl,
      pillar: post.pillar,
      scheduledFor: post.scheduledFor,
    });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <CardTitle className="text-base">Auto-publish</CardTitle>
              <CardDescription>
                Scheduled posts go out on their own, within about 10 minutes of their time ({SOCIAL_TIME_ZONE_LABEL}). Turn this off to pause the queue without losing anything.
              </CardDescription>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Label htmlFor="social-autopublish" className="text-xs text-muted-foreground">
                {settings.autopublish ? "On" : "Paused"}
              </Label>
              <ToggleSwitch
                id="social-autopublish"
                checked={settings.autopublish}
                onCheckedChange={(next) => autopublish.mutate(next)}
                disabled={autopublish.isPending}
              />
            </div>
          </div>
        </CardHeader>
        {!connected || !settings.cronSecretSet ? (
          <CardContent>
            <p className="flex items-start gap-2 rounded-lg bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-300">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              {!connected
                ? "Facebook isn't connected, so nothing will post yet. Drafts and schedules are kept until it is. See Setup."
                : "CRON_SECRET isn't set, so the scheduler can't run. See Setup."}
            </p>
          </CardContent>
        ) : null}
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <CardTitle className="text-base">Post queue</CardTitle>
              <CardDescription>
                {groups.upcoming.length} scheduled • {groups.drafts.length} drafts • {groups.published.length} published
              </CardDescription>
            </div>
            <Button onClick={() => onCompose({ message: "" })} className="gap-2">
              <Plus className="h-4 w-4" aria-hidden />
              New post
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-8">
          {posts.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nothing queued yet. Start from an idea in the Ideas tab, or write one with New post.
            </p>
          ) : null}
          {groups.attention.length > 0 ? (
            <Section title="Needs attention">
              {groups.attention.map((post) => (
                <QueueRow key={post.id} post={post} onEdit={edit} onAction={setPending} />
              ))}
            </Section>
          ) : null}
          {groups.upcoming.length > 0 ? (
            <Section title="Up next" hint={SOCIAL_TIME_ZONE_LABEL}>
              {groups.upcoming.map((post) => (
                <QueueRow key={post.id} post={post} onEdit={edit} onAction={setPending} />
              ))}
            </Section>
          ) : null}
          {groups.drafts.length > 0 ? (
            <Section title="Drafts">
              {groups.drafts.map((post) => (
                <QueueRow key={post.id} post={post} onEdit={edit} onAction={setPending} />
              ))}
            </Section>
          ) : null}
          {groups.published.length > 0 ? (
            <Section title="Published">
              {groups.published.slice(0, publishedShown).map((post) => (
                <QueueRow key={post.id} post={post} onEdit={edit} onAction={setPending} />
              ))}
              {groups.published.length > publishedShown ? (
                <li className="pt-3">
                  <Button variant="ghost" size="sm" onClick={() => setPublishedShown((n) => n + PUBLISHED_PAGE_SIZE)}>
                    Show more
                  </Button>
                </li>
              ) : null}
            </Section>
          ) : null}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={pending !== null}
        onOpenChange={(open) => {
          if (!open) setPending(null);
        }}
        title={pending?.kind === "publish" ? "Post to Facebook now?" : "Delete this post?"}
        description={
          pending?.kind === "publish"
            ? "It goes live on the Page straight away, for everyone who follows it."
            : pending?.post.status === "published"
              ? "This only removes it from the queue. It stays on Facebook; delete it there if you want it gone."
              : "It's removed from the queue and won't be posted."
        }
        confirmLabel={pending?.kind === "publish" ? "Publish now" : "Delete"}
        variant={pending?.kind === "delete" ? "destructive" : "default"}
        onConfirm={() => {
          if (pending) action.mutate(pending);
        }}
      />
    </div>
  );
}
