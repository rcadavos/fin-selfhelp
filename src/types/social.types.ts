import type { SocialPostStatus } from "@/lib/constants/social";

/** A row of `social_posts`, as the admin UI sees it. */
export type SocialPost = {
  id: string;
  message: string;
  link: string | null;
  imageUrl: string | null;
  status: SocialPostStatus;
  /** ISO timestamp; set for scheduled posts, kept on drafts that had one. */
  scheduledFor: string | null;
  publishedAt: string | null;
  externalPostId: string | null;
  permalinkUrl: string | null;
  error: string | null;
  attempts: number;
  pillar: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SocialPostInput = {
  /** Omit to create. */
  id?: string;
  message: string;
  link?: string | null;
  imageUrl?: string | null;
  pillar?: string | null;
  /** `draft` keeps it in the queue unscheduled; `scheduled` needs `scheduledFor`. */
  status: "draft" | "scheduled";
  scheduledFor?: string | null;
};

export type FacebookPageInfo = {
  id: string;
  name: string;
  username: string | null;
  link: string | null;
  about: string | null;
  category: string | null;
  followersCount: number | null;
  pictureUrl: string | null;
  coverUrl: string | null;
  /** Vertical crop of the cover, 0–100 (Facebook's `offset_y`). */
  coverOffsetY: number;
};

export type FacebookRecentPost = {
  id: string;
  message: string | null;
  createdTime: string;
  permalinkUrl: string | null;
  pictureUrl: string | null;
  reactions: number | null;
  comments: number | null;
  shares: number | null;
};

export type FacebookPageOverview =
  | { status: "not-configured" }
  | { status: "error"; error: string }
  | { status: "ok"; page: FacebookPageInfo; posts: FacebookRecentPost[]; postsError: string | null };

export type SocialSettings = {
  pageIdSet: boolean;
  tokenSet: boolean;
  appSecretSet: boolean;
  cronSecretSet: boolean;
  aiConfigured: boolean;
  autopublish: boolean;
  graphApiVersion: string;
};
