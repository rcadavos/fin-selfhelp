"use client";

import { useMemo, useState } from "react";
import { useMutation, useSuspenseQuery } from "@tanstack/react-query";
import { Loader2, Sparkles, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CopyButton } from "@/components/ui/copy-button";
import { draftSocialPostsWithAi } from "@/actions/social";
import { adminSocialSettingsQueryOptions } from "@/lib/query/admin-social";
import { CHANGELOG } from "@/lib/changelog";
import {
  SOCIAL_AI_NOTES_MAX_CHARS,
  SOCIAL_POST_IDEAS,
  SOCIAL_POST_PILLARS,
  changelogPostMessage,
  type SocialPostPillar,
} from "@/lib/constants/social";
import { socialLinkUrl } from "@/lib/social/schedule";
import { cn } from "@/lib/utils";
import type { ComposerSeed } from "./social-post-composer";

const CHANGELOG_IDEAS_LIMIT = 4;

function pillarLabel(id: SocialPostPillar): string {
  return SOCIAL_POST_PILLARS.find((p) => p.id === id)?.label ?? id;
}

function IdeaCard({
  pillar,
  title,
  timing,
  message,
  onUse,
}: {
  pillar: SocialPostPillar;
  title: string;
  timing?: string;
  message: string;
  onUse: () => void;
}) {
  return (
    <div className="flex flex-col rounded-xl border bg-card p-4">
      <p className="text-xs font-medium text-primary">
        {pillarLabel(pillar)}
        {timing ? <span className="font-normal text-muted-foreground"> • {timing}</span> : null}
      </p>
      <p className="mt-1 text-sm font-semibold">{title}</p>
      <p className="mt-2 line-clamp-6 flex-1 whitespace-pre-line text-sm text-muted-foreground">{message}</p>
      <div className="mt-3 flex items-center gap-2">
        <Button size="sm" onClick={onUse}>
          Use this
        </Button>
        <CopyButton value={message} />
      </div>
    </div>
  );
}

/** Ready-to-edit post ideas, "What's new" posts from the changelog, and AI drafts. */
export function SocialPostIdeas({ onCompose }: { onCompose: (seed: ComposerSeed) => void }) {
  const { data: settings } = useSuspenseQuery(adminSocialSettingsQueryOptions());
  const [filter, setFilter] = useState<SocialPostPillar | "all">("all");
  const [aiPillar, setAiPillar] = useState<SocialPostPillar>("tips");
  const [notes, setNotes] = useState("");

  const ideas = useMemo(
    () => (filter === "all" ? SOCIAL_POST_IDEAS : SOCIAL_POST_IDEAS.filter((i) => i.pillar === filter)),
    [filter],
  );

  const release = CHANGELOG[0];
  const changelogIdeas = (release?.changes ?? [])
    .filter((c) => c.type === "feature")
    .slice(0, CHANGELOG_IDEAS_LIMIT);

  const ai = useMutation({
    mutationFn: async () => {
      const res = await draftSocialPostsWithAi({ pillar: aiPillar, notes });
      if (res.error) throw new Error(res.error);
      return res.drafts;
    },
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">A good week on the Page</CardTitle>
          <CardDescription>
            Three to five posts a week is plenty. Mostly useful tips and timely moments, with the product in a supporting role.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {SOCIAL_POST_PILLARS.map((p) => (
              <li key={p.id} className="rounded-lg bg-muted/40 p-3">
                <p className="text-sm font-medium">
                  {p.label} <span className="font-normal text-muted-foreground">• {p.cadence}</span>
                </p>
                <p className="mt-1 text-xs text-muted-foreground">{p.description}</p>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" aria-hidden />
            <CardTitle className="text-base">Write fresh drafts with AI</CardTitle>
          </div>
          <CardDescription>
            Three new posts for a theme, written only from the product facts the landing page chat uses, so they can&apos;t promise what the app doesn&apos;t do.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!settings.aiConfigured ? (
            <p className="text-sm text-muted-foreground">Add AI_GATEWAY_API_KEY to turn this on.</p>
          ) : (
            <>
              <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Theme">
                {SOCIAL_POST_PILLARS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    role="radio"
                    aria-checked={aiPillar === p.id}
                    onClick={() => setAiPillar(p.id)}
                    className={cn(
                      "rounded-full border px-3 py-1 text-xs transition-colors",
                      aiPillar === p.id ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                <div className="grid flex-1 gap-1.5">
                  <Label htmlFor="ai-notes">
                    Notes <span className="font-normal text-muted-foreground">(optional)</span>
                  </Label>
                  <Input
                    id="ai-notes"
                    value={notes}
                    maxLength={SOCIAL_AI_NOTES_MAX_CHARS}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g. about Christmas bonuses, in Taglish"
                  />
                </div>
                <Button onClick={() => ai.mutate()} disabled={ai.isPending} className="gap-2">
                  {ai.isPending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Wand2 className="h-4 w-4" aria-hidden />}
                  Write drafts
                </Button>
              </div>
              {ai.error ? <p className="text-sm text-destructive">{(ai.error as Error).message}</p> : null}
              {ai.data ? (
                <div className="grid gap-3 md:grid-cols-3">
                  {ai.data.map((draft, i) => (
                    <IdeaCard
                      key={`${i}-${draft.slice(0, 12)}`}
                      pillar={aiPillar}
                      title={`AI draft ${i + 1}`}
                      message={draft}
                      onUse={() => onCompose({ message: draft, pillar: aiPillar, link: socialLinkUrl("/") })}
                    />
                  ))}
                </div>
              ) : null}
            </>
          )}
        </CardContent>
      </Card>

      {changelogIdeas.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">From the changelog</CardTitle>
            <CardDescription>New features in {release.version}, ready to announce. Trim them to one or two sentences.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2">
              {changelogIdeas.map((change) => {
                const message = changelogPostMessage(change.description);
                return (
                  <IdeaCard
                    key={change.description}
                    pillar="updates"
                    title={change.description.split(/[.:]/)[0]}
                    message={message}
                    onUse={() => onCompose({ message, pillar: "updates", link: socialLinkUrl("/changelog") })}
                  />
                );
              })}
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Idea bank</CardTitle>
          <CardDescription>Written for the Page and its audience. Open one in the composer, adjust it, and schedule it.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-1.5">
            {[{ id: "all" as const, label: "All" }, ...SOCIAL_POST_PILLARS.filter((p) => p.id !== "updates")].map((p) => (
              <button
                key={p.id}
                type="button"
                aria-pressed={filter === p.id}
                onClick={() => setFilter(p.id)}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs transition-colors",
                  filter === p.id ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {ideas.map((idea) => (
              <IdeaCard
                key={idea.id}
                pillar={idea.pillar}
                title={idea.title}
                timing={idea.timing}
                message={idea.message}
                onUse={() => onCompose({ message: idea.message, pillar: idea.pillar, link: socialLinkUrl(idea.linkPath) })}
              />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
