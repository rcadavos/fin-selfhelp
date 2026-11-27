/**
 * Facebook Graph API client for the OmniTrak Page. Server-only: it reads the
 * system user token from the environment.
 *
 * The token in META_SYSTEM_USER_TOKEN belongs to a Meta Business system user that
 * was given the Page as an asset. Page calls swap it for the Page's own token
 * (`GET /{page-id}?fields=access_token`). A Page token pasted there directly also
 * works: that lookup fails for it, and it is used as is.
 */

import { createHmac } from "node:crypto";
import {
  FACEBOOK_RECENT_POSTS_LIMIT,
  META_ENV,
  META_GRAPH_API_BASE,
  META_PAGE_TOKEN_CACHE_MS,
} from "@/lib/constants/social";
import type { FacebookPageInfo, FacebookRecentPost } from "@/types/social.types";

type FacebookConfig = { pageId: string; token: string; appSecret: string | null };

export function getFacebookConfig(): FacebookConfig | null {
  const pageId = process.env[META_ENV.pageId]?.trim();
  const token = process.env[META_ENV.token]?.trim();
  if (!pageId || !token) return null;
  return { pageId, token, appSecret: process.env[META_ENV.appSecret]?.trim() || null };
}

function requireFacebookConfig(): FacebookConfig {
  const config = getFacebookConfig();
  if (!config) {
    throw new Error(`Facebook isn't connected. Set ${META_ENV.pageId} and ${META_ENV.token}.`);
  }
  return config;
}

export class GraphApiError extends Error {
  constructor(
    message: string,
    readonly code: number | null,
    readonly subcode: number | null,
  ) {
    super(message);
    this.name = "GraphApiError";
  }
}

/** Code 190: the token is invalid, expired or revoked. */
const INVALID_TOKEN_CODE = 190;

type GraphParams = Record<string, string | number | boolean | null | undefined>;

async function graph<T>(
  path: string,
  token: string,
  appSecret: string | null,
  { method = "GET", params = {} }: { method?: "GET" | "POST"; params?: GraphParams } = {},
): Promise<T> {
  const body = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) body.set(key, String(value));
  }
  body.set("access_token", token);
  // Required when the app has "Require app secret" on; harmless when it doesn't.
  if (appSecret) body.set("appsecret_proof", createHmac("sha256", appSecret).update(token).digest("hex"));

  const url = `${META_GRAPH_API_BASE}/${path.replace(/^\//, "")}`;
  const res = await fetch(method === "GET" ? `${url}?${body}` : url, {
    method,
    body: method === "POST" ? body : undefined,
    cache: "no-store",
  });
  const json = (await res.json().catch(() => null)) as
    | (T & { error?: undefined })
    | { error?: { message?: string; code?: number; error_subcode?: number } }
    | null;

  if (!res.ok || !json || json.error) {
    const err = json?.error;
    throw new GraphApiError(
      err?.message ?? `Facebook answered HTTP ${res.status}.`,
      err?.code ?? null,
      err?.error_subcode ?? null,
    );
  }
  return json as T;
}

let pageTokenCache: { source: string; value: string; expiresAt: number } | null = null;

async function getPageAccessToken(config: FacebookConfig): Promise<string> {
  if (pageTokenCache && pageTokenCache.source === config.token && pageTokenCache.expiresAt > Date.now()) {
    return pageTokenCache.value;
  }
  let value = config.token;
  try {
    const res = await graph<{ access_token?: string }>(config.pageId, config.token, config.appSecret, {
      params: { fields: "access_token" },
    });
    if (res.access_token) value = res.access_token;
  } catch (e) {
    // A dead token fails every call, so say so now. Anything else most likely means
    // a Page token was pasted in, which can't read its own access_token field.
    if (e instanceof GraphApiError && e.code === INVALID_TOKEN_CODE) throw e;
  }
  pageTokenCache = { source: config.token, value, expiresAt: Date.now() + META_PAGE_TOKEN_CACHE_MS };
  return value;
}

type PageResponse = {
  id: string;
  name: string;
  username?: string;
  link?: string;
  about?: string;
  category?: string;
  followers_count?: number;
  fan_count?: number;
  picture?: { data?: { url?: string } };
  cover?: { source?: string; offset_y?: number };
};

export async function fetchFacebookPage(): Promise<FacebookPageInfo> {
  const config = requireFacebookConfig();
  const token = await getPageAccessToken(config);
  const page = await graph<PageResponse>(config.pageId, token, config.appSecret, {
    params: {
      fields:
        "id,name,username,link,about,category,followers_count,fan_count,picture.width(720).height(720),cover",
    },
  });
  return {
    id: page.id,
    name: page.name,
    username: page.username ?? null,
    link: page.link ?? null,
    about: page.about ?? null,
    category: page.category ?? null,
    followersCount: page.followers_count ?? page.fan_count ?? null,
    pictureUrl: page.picture?.data?.url ?? null,
    coverUrl: page.cover?.source ?? null,
    coverOffsetY: page.cover?.offset_y ?? 50,
  };
}

type PostsResponse = {
  data: {
    id: string;
    message?: string;
    created_time: string;
    permalink_url?: string;
    full_picture?: string;
    shares?: { count?: number };
    reactions?: { summary?: { total_count?: number } };
    comments?: { summary?: { total_count?: number } };
  }[];
};

const POST_FIELDS = "id,message,created_time,permalink_url,full_picture";
const ENGAGEMENT_FIELDS = "shares,reactions.summary(total_count).limit(0),comments.summary(total_count).limit(0)";

/** The Page's latest posts, with reaction, comment and share counts when the token may read them. */
export async function fetchRecentFacebookPosts(limit = FACEBOOK_RECENT_POSTS_LIMIT): Promise<FacebookRecentPost[]> {
  const config = requireFacebookConfig();
  const token = await getPageAccessToken(config);
  const path = `${config.pageId}/posts`;
  let res: PostsResponse;
  try {
    res = await graph<PostsResponse>(path, token, config.appSecret, {
      params: { fields: `${POST_FIELDS},${ENGAGEMENT_FIELDS}`, limit },
    });
  } catch (e) {
    if (e instanceof GraphApiError && e.code === INVALID_TOKEN_CODE) throw e;
    // Engagement counts need more access than the posts themselves; show the posts without them.
    res = await graph<PostsResponse>(path, token, config.appSecret, { params: { fields: POST_FIELDS, limit } });
  }
  return res.data.map((post) => ({
    id: post.id,
    message: post.message ?? null,
    createdTime: post.created_time,
    permalinkUrl: post.permalink_url ?? null,
    pictureUrl: post.full_picture ?? null,
    reactions: post.reactions?.summary?.total_count ?? null,
    comments: post.comments?.summary?.total_count ?? null,
    shares: post.shares ? (post.shares.count ?? 0) : post.reactions ? 0 : null,
  }));
}

/**
 * Posts to the Page now. With an image it is a photo post (Facebook fetches the
 * image from `imageUrl`, so it must be public) and any link goes at the end of the
 * caption, since photo posts get no link card. Without one it is a feed post, and
 * Facebook draws the link's preview card from its Open Graph tags.
 */
export async function publishFacebookPost(input: {
  message: string;
  link?: string | null;
  imageUrl?: string | null;
}): Promise<{ postId: string; permalinkUrl: string | null }> {
  const config = requireFacebookConfig();
  const token = await getPageAccessToken(config);
  const link = input.link?.trim() || null;

  let postId: string;
  if (input.imageUrl) {
    const caption = link && !input.message.includes(link) ? `${input.message}\n\n${link}` : input.message;
    const res = await graph<{ id: string; post_id?: string }>(`${config.pageId}/photos`, token, config.appSecret, {
      method: "POST",
      params: { url: input.imageUrl, message: caption },
    });
    postId = res.post_id ?? res.id;
  } else {
    const res = await graph<{ id: string }>(`${config.pageId}/feed`, token, config.appSecret, {
      method: "POST",
      params: { message: input.message, link },
    });
    postId = res.id;
  }

  let permalinkUrl: string | null = null;
  try {
    const post = await graph<{ permalink_url?: string }>(postId, token, config.appSecret, {
      params: { fields: "permalink_url" },
    });
    permalinkUrl = post.permalink_url ?? null;
  } catch {
    // The post is up; only its link is missing, and the queue shows it without one.
  }
  return { postId, permalinkUrl };
}
