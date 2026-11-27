"use client";

import { useState } from "react";
import Image from "next/image";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { ExternalLink, MessageCircle, RefreshCw, Share2, ThumbsUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { adminFacebookPageQueryOptions } from "@/lib/query/admin-social";
import { formatManila } from "@/lib/social/schedule";
import { cn } from "@/lib/utils";
import type { FacebookRecentPost } from "@/types/social.types";
import { DeviceToggle, FacebookPageHeaderMock } from "./facebook-page-header-mock";

function RecentPost({ post }: { post: FacebookRecentPost }) {
  const stats = [
    { icon: ThumbsUp, value: post.reactions, label: "reactions" },
    { icon: MessageCircle, value: post.comments, label: "comments" },
    { icon: Share2, value: post.shares, label: "shares" },
  ].filter((s) => s.value !== null);

  return (
    <li className="flex gap-3 py-3">
      {post.pictureUrl ? (
        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-muted">
          <Image src={post.pictureUrl} alt="" fill unoptimized sizes="64px" className="object-cover" />
        </div>
      ) : null}
      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 text-sm">{post.message ?? <span className="text-muted-foreground">(no text)</span>}</p>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span>{formatManila(post.createdTime)}</span>
          {stats.map(({ icon: Icon, value, label }) => (
            <span key={label} className="flex items-center gap-1" title={label}>
              <Icon className="h-3 w-3" aria-hidden />
              {value}
            </span>
          ))}
          {post.permalinkUrl ? (
            <a href={post.permalinkUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-primary hover:underline">
              Open <ExternalLink className="h-3 w-3" aria-hidden />
            </a>
          ) : null}
        </div>
      </div>
    </li>
  );
}

/** The Page as it is on Facebook right now: cover, profile picture, followers and latest posts. */
export function FacebookLivePage({ onOpenSetup }: { onOpenSetup: () => void }) {
  const queryClient = useQueryClient();
  const { data, isFetching } = useSuspenseQuery(adminFacebookPageQueryOptions());
  const [phone, setPhone] = useState(false);

  const refresh = () => queryClient.invalidateQueries({ queryKey: adminFacebookPageQueryOptions().queryKey });

  if (data.status === "not-configured") {
    return (
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="text-base">Facebook isn&apos;t connected yet</CardTitle>
          <CardDescription>
            Connect the Page with a system user token to see its cover, profile picture and latest posts here, and to post from the queue.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={onOpenSetup}>Set it up</Button>
        </CardContent>
      </Card>
    );
  }

  if (data.status === "error") {
    return (
      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle className="text-base">Facebook didn&apos;t answer</CardTitle>
          <CardDescription className="text-destructive">{data.error}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={refresh} disabled={isFetching} className="gap-2">
            <RefreshCw className={cn("h-4 w-4", isFetching && "animate-spin")} aria-hidden />
            Try again
          </Button>
          <Button variant="ghost" onClick={onOpenSetup}>
            Check the setup
          </Button>
        </CardContent>
      </Card>
    );
  }

  const { page, posts, postsError } = data;
  const meta = [
    page.followersCount !== null ? `${page.followersCount.toLocaleString()} followers` : null,
    page.category,
  ]
    .filter(Boolean)
    .join(" • ");

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="text-base">Your Page right now</CardTitle>
            <CardDescription>The cover and profile picture visitors see, straight from Facebook.</CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <DeviceToggle phone={phone} onChange={setPhone} />
            <Button variant="outline" size="sm" onClick={refresh} disabled={isFetching} className="gap-1.5">
              <RefreshCw className={cn("h-3.5 w-3.5", isFetching && "animate-spin")} aria-hidden />
              Refresh
            </Button>
            {page.link ? (
              <Button variant="outline" size="sm" asChild className="gap-1.5">
                <a href={page.link} target="_blank" rel="noreferrer">
                  Open Page <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                </a>
              </Button>
            ) : null}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <FacebookPageHeaderMock
          coverSrc={page.coverUrl}
          profileSrc={page.pictureUrl}
          name={page.name}
          meta={meta}
          coverOffsetY={page.coverOffsetY}
          phone={phone}
        />
        {page.about ? <p className="text-sm text-muted-foreground">{page.about}</p> : null}
        <div className="flex flex-wrap gap-2 text-xs">
          {page.coverUrl ? (
            <a href={page.coverUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline">
              Full-size cover
            </a>
          ) : null}
          {page.pictureUrl ? (
            <a href={page.pictureUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline">
              Full-size profile picture
            </a>
          ) : null}
        </div>

        <div>
          <h3 className="text-sm font-semibold">Latest posts</h3>
          {postsError ? (
            <p className="mt-2 text-sm text-destructive">{postsError}</p>
          ) : posts.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">Nothing posted yet.</p>
          ) : (
            <ul className="divide-y">
              {posts.map((post) => (
                <RecentPost key={post.id} post={post} />
              ))}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
