"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CalendarClock, Globe, Loader2, Save, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ConfirmDialog } from "@/components/app/confirm-dialog";
import { useSnackbar } from "@/components/ui/snackbar-provider";
import { discardSocialImages, publishSocialPostNow, saveSocialPost } from "@/actions/social";
import { adminFacebookPageQueryOptions, adminSocialPostsQueryOptions } from "@/lib/query/admin-social";
import { PRODUCT_NAME } from "@/lib/constants/prospect-chat";
import { ottoSrc } from "@/lib/constants/mascot";
import {
  SOCIAL_LINK_PRESETS,
  SOCIAL_MESSAGE_MAX_CHARS,
  SOCIAL_MESSAGE_SEE_MORE_CHARS,
  SOCIAL_QUICK_TIMES,
  SOCIAL_TIME_ZONE_LABEL,
} from "@/lib/constants/social";
import {
  formatHhmm,
  formatManila,
  isoToManila,
  manilaToIso,
  manilaYmdFromToday,
  socialLinkUrl,
} from "@/lib/social/schedule";
import { cn } from "@/lib/utils";
import { SocialImageUpload } from "./social-image-upload";

/** What the composer opens with: an idea, an AI draft, or a queued post to edit. */
export type ComposerSeed = {
  id?: string;
  message: string;
  link?: string | null;
  imageUrl?: string | null;
  pillar?: string | null;
  scheduledFor?: string | null;
};

type Mode = "draft" | "schedule" | "now";

const MODES: { value: Mode; label: string; icon: typeof Save }[] = [
  { value: "schedule", label: "Schedule", icon: CalendarClock },
  { value: "draft", label: "Save as draft", icon: Save },
  { value: "now", label: "Publish now", icon: Send },
];

function hostOf(link: string): string {
  try {
    return new URL(link).hostname.replace(/^www\./, "");
  } catch {
    return link;
  }
}

/** How the post will look in the feed: Page name, text cut at "See more", then the image or link card. */
function PostPreview({
  message,
  link,
  imageUrl,
  when,
}: {
  message: string;
  link: string;
  imageUrl: string;
  when: string;
}) {
  const queryClient = useQueryClient();
  const overview = queryClient.getQueryData(adminFacebookPageQueryOptions().queryKey);
  const page = overview?.status === "ok" ? overview.page : null;
  const cut = message.length > SOCIAL_MESSAGE_SEE_MORE_CHARS;
  const shown = cut ? `${message.slice(0, SOCIAL_MESSAGE_SEE_MORE_CHARS).trimEnd()}…` : message;
  const validImage = /^https?:\/\//.test(imageUrl.trim());

  return (
    <div className="overflow-hidden rounded-xl border bg-card text-sm shadow-sm">
      <div className="flex items-center gap-2.5 p-3">
        <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-muted">
          <Image src={page?.pictureUrl ?? ottoSrc("otto-face.svg")} alt="" fill unoptimized sizes="40px" className="object-cover" />
        </div>
        <div className="min-w-0">
          <p className="truncate font-semibold leading-tight">{page?.name ?? PRODUCT_NAME}</p>
          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            {when} • <Globe className="h-3 w-3" aria-label="Public" />
          </p>
        </div>
      </div>
      <div className="whitespace-pre-wrap break-words px-3 pb-3">
        {shown || <span className="text-muted-foreground">Your post appears here.</span>}
        {cut ? <span className="font-semibold text-muted-foreground"> See more</span> : null}
      </div>
      {validImage ? (
        <div className="relative aspect-[4/3] w-full border-t bg-muted">
          <Image src={imageUrl.trim()} alt="" fill unoptimized sizes="400px" className="object-cover" />
        </div>
      ) : link.trim() ? (
        <div className="border-t bg-muted/60 px-3 py-2.5">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{hostOf(link.trim())}</p>
          <p className="truncate font-medium">Preview card from the linked page</p>
        </div>
      ) : null}
    </div>
  );
}

export function SocialPostComposer({
  seed,
  onOpenChange,
}: {
  /** Null keeps the dialog closed. */
  seed: ComposerSeed | null;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const { showSuccess } = useSnackbar();
  const [message, setMessage] = useState("");
  const [link, setLink] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [mode, setMode] = useState<Mode>("schedule");
  const [ymd, setYmd] = useState("");
  const [hhmm, setHhmm] = useState<string>(SOCIAL_QUICK_TIMES[2]);
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  /** Set once the post is saved, so a retry after a failed Publish now updates it instead of adding a second one. */
  const [savedId, setSavedId] = useState<string | undefined>(undefined);
  /** Photos uploaded while this dialog was open; the ones no post keeps are deleted when it closes. */
  const uploadsRef = useRef<string[]>([]);

  useEffect(() => {
    if (!seed) return;
    setMessage(seed.message);
    setLink(seed.link ?? "");
    setImageUrl(seed.imageUrl ?? "");
    if (seed.scheduledFor) {
      const when = isoToManila(seed.scheduledFor);
      setYmd(when.ymd);
      setHhmm(when.hhmm);
    } else {
      setYmd(manilaYmdFromToday(1));
      setHhmm(SOCIAL_QUICK_TIMES[2]);
    }
    setMode("schedule");
    setError(null);
    setSavedId(seed.id);
    uploadsRef.current = [];
  }, [seed]);

  /** Closes the dialog and deletes this session's uploads that no post uses (the server double-checks). */
  function close() {
    const uploads = uploadsRef.current;
    uploadsRef.current = [];
    if (uploads.length > 0) void discardSocialImages(uploads);
    onOpenChange(false);
  }

  const scheduledIso = manilaToIso(ymd, hhmm);

  const mutation = useMutation({
    mutationFn: async (target: Mode) => {
      const saved = await saveSocialPost({
        id: savedId,
        message,
        link,
        imageUrl,
        pillar: seed?.pillar ?? null,
        status: target === "schedule" ? "scheduled" : "draft",
        scheduledFor: target === "now" ? null : scheduledIso,
      });
      if (saved.error || !saved.post) throw new Error(saved.error ?? "Couldn't save the post.");
      setSavedId(saved.post.id);
      if (target !== "now") return target;
      const published = await publishSocialPostNow(saved.post.id);
      if (published.error) throw new Error(`Saved, but Facebook didn't take it: ${published.error}`);
      return target;
    },
    onSuccess: (target) => {
      showSuccess(
        target === "now"
          ? "Posted to Facebook."
          : target === "schedule" && scheduledIso
            ? `Scheduled for ${formatManila(scheduledIso)}.`
            : "Saved as a draft.",
      );
      close();
    },
    onError: (e: Error) => setError(e.message),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: adminSocialPostsQueryOptions().queryKey });
      queryClient.invalidateQueries({ queryKey: adminFacebookPageQueryOptions().queryKey });
    },
  });

  function submit() {
    setError(null);
    if (mode === "now") setConfirmOpen(true);
    else mutation.mutate(mode);
  }

  const when =
    mode === "now" ? "Just now" : mode === "schedule" && scheduledIso ? formatManila(scheduledIso) : "Draft";
  const canSubmit = message.trim().length > 0 && !mutation.isPending && (mode !== "schedule" || Boolean(scheduledIso));

  return (
    <>
      <Dialog open={seed !== null} onOpenChange={(open) => !open && !mutation.isPending && close()}>
        <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-[880px]">
          <DialogHeader>
            <DialogTitle>{savedId ? "Edit post" : "New Facebook post"}</DialogTitle>
            <DialogDescription>
              Write it, then schedule it, keep it as a draft, or post it now. Times are in {SOCIAL_TIME_ZONE_LABEL}.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-6 md:grid-cols-[1fr_320px]">
            <div className="space-y-4">
              <div className="grid gap-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="social-message">Post</Label>
                  <span
                    className={cn(
                      "text-xs tabular-nums",
                      message.length > SOCIAL_MESSAGE_SEE_MORE_CHARS ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground",
                    )}
                  >
                    {message.length.toLocaleString()}
                    {message.length > SOCIAL_MESSAGE_SEE_MORE_CHARS ? " • cut at See more" : ""}
                  </span>
                </div>
                <textarea
                  id="social-message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  maxLength={SOCIAL_MESSAGE_MAX_CHARS}
                  rows={9}
                  placeholder="What do you want to tell your followers?"
                  className="w-full resize-y rounded-xl border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="social-link">
                  Link <span className="font-normal text-muted-foreground">(optional)</span>
                </Label>
                <Input id="social-link" value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://" inputMode="url" />
                <div className="flex flex-wrap gap-1.5">
                  {SOCIAL_LINK_PRESETS.map((preset) => {
                    const url = socialLinkUrl(preset.path);
                    return (
                      <button
                        key={preset.path}
                        type="button"
                        onClick={() => setLink(url)}
                        className={cn(
                          "rounded-full border px-2.5 py-1 text-xs transition-colors",
                          link === url ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground",
                        )}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="social-image">
                  Photo <span className="font-normal text-muted-foreground">(optional)</span>
                </Label>
                <SocialImageUpload
                  id="social-image"
                  value={imageUrl}
                  onChange={setImageUrl}
                  onUploaded={(url) => uploadsRef.current.push(url)}
                  disabled={mutation.isPending}
                />
                <p className="text-xs text-muted-foreground">
                  A photo makes it a photo post, and the link moves into the text. Without one, Facebook shows the link&apos;s preview card.
                </p>
              </div>

              <div className="grid gap-2">
                <Label>When</Label>
                <div className="grid grid-cols-3 gap-1 rounded-xl border p-1" role="radiogroup" aria-label="When">
                  {MODES.map(({ value, label, icon: Icon }) => (
                    <button
                      key={value}
                      type="button"
                      role="radio"
                      aria-checked={mode === value}
                      onClick={() => setMode(value)}
                      className={cn(
                        "flex items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-medium transition-colors sm:text-sm",
                        mode === value ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      <Icon className="hidden h-4 w-4 sm:block" aria-hidden />
                      {label}
                    </button>
                  ))}
                </div>
                {mode === "schedule" ? (
                  <div className="space-y-2">
                    <div className="grid gap-2 sm:grid-cols-2">
                      <DatePicker id="social-date" value={ymd} onChange={setYmd} />
                      <Input
                        id="social-time"
                        type="time"
                        step={300}
                        value={hhmm}
                        onChange={(e) => setHhmm(e.target.value)}
                        aria-label={`Time (${SOCIAL_TIME_ZONE_LABEL})`}
                      />
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {SOCIAL_QUICK_TIMES.map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setHhmm(t)}
                          className={cn(
                            "rounded-full border px-2.5 py-1 text-xs transition-colors",
                            hhmm === t ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground",
                          )}
                        >
                          {formatHhmm(t)}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : mode === "now" ? (
                  <p className="text-xs text-muted-foreground">Goes live on the Page as soon as you confirm.</p>
                ) : (
                  <p className="text-xs text-muted-foreground">Stays in the queue until you schedule or publish it.</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Preview</p>
              <PostPreview message={message} link={link} imageUrl={imageUrl} when={when} />
            </div>
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <DialogFooter>
            <Button variant="outline" onClick={close} disabled={mutation.isPending}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={!canSubmit} className="gap-2">
              {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
              {mode === "now" ? "Publish now" : mode === "schedule" ? "Schedule post" : "Save draft"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Post to Facebook now?"
        description="It goes live on the Page straight away, for everyone who follows it."
        confirmLabel="Publish now"
        onConfirm={() => mutation.mutate("now")}
      />
    </>
  );
}
