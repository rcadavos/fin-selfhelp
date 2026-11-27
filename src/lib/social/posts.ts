/**
 * The `social_posts` queue: row mapping, and publishing one post with a claim so
 * the cron and "Publish now" can never post the same row twice. Server-only; the
 * client passed in must be the service-role client (the table has no RLS policies).
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { publishFacebookPost } from "@/lib/social/facebook";
import { SOCIAL_PUBLISHING_STALE_MINUTES, type SocialPostStatus } from "@/lib/constants/social";
import type { SocialPost } from "@/types/social.types";

export const SOCIAL_POST_COLUMNS =
  "id, message, link, image_url, status, scheduled_for, published_at, external_post_id, permalink_url, error, attempts, pillar, created_at, updated_at";

type SocialPostRow = {
  id: string;
  message: string;
  link: string | null;
  image_url: string | null;
  status: SocialPostStatus;
  scheduled_for: string | null;
  published_at: string | null;
  external_post_id: string | null;
  permalink_url: string | null;
  error: string | null;
  attempts: number | null;
  pillar: string | null;
  created_at: string;
  updated_at: string;
};

export function mapSocialPostRow(row: SocialPostRow): SocialPost {
  return {
    id: row.id,
    message: row.message,
    link: row.link,
    imageUrl: row.image_url,
    status: row.status,
    scheduledFor: row.scheduled_for,
    publishedAt: row.published_at,
    externalPostId: row.external_post_id,
    permalinkUrl: row.permalink_url,
    error: row.error,
    attempts: row.attempts ?? 0,
    pillar: row.pillar,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : "Facebook didn't take the post.";
}

/**
 * Claims the post (moves it from one of `from` to "publishing"), posts it, and
 * records the outcome. Returns an error instead of throwing.
 */
export async function publishSocialPost(
  admin: SupabaseClient,
  id: string,
  from: SocialPostStatus[],
): Promise<{ ok: true; post: SocialPost } | { ok: false; error: string }> {
  const { data: claimed, error: claimError } = await admin
    .from("social_posts")
    .update({ status: "publishing", error: null, updated_at: new Date().toISOString() })
    .eq("id", id)
    .in("status", from)
    .select(SOCIAL_POST_COLUMNS)
    .maybeSingle();
  if (claimError) return { ok: false, error: claimError.message };
  if (!claimed) return { ok: false, error: "This post is already publishing or published." };

  const post = mapSocialPostRow(claimed as SocialPostRow);
  const attempts = post.attempts + 1;

  try {
    const result = await publishFacebookPost(post);
    const now = new Date().toISOString();
    const { data, error } = await admin
      .from("social_posts")
      .update({
        status: "published",
        published_at: now,
        external_post_id: result.postId,
        permalink_url: result.permalinkUrl,
        error: null,
        attempts,
        updated_at: now,
      })
      .eq("id", id)
      .select(SOCIAL_POST_COLUMNS)
      .single();
    if (error) {
      // It is on Facebook; only the record failed. The stale sweep marks it failed
      // with a note to check the Page, rather than letting it post again.
      return { ok: false, error: `Posted, but saving the result failed: ${error.message}` };
    }
    return { ok: true, post: mapSocialPostRow(data as SocialPostRow) };
  } catch (e) {
    const message = errorMessage(e);
    await admin
      .from("social_posts")
      .update({ status: "failed", error: message, attempts, updated_at: new Date().toISOString() })
      .eq("id", id);
    return { ok: false, error: message };
  }
}

/**
 * Marks posts left in "publishing" by a run that was cut off as failed. They are
 * not retried on their own: Facebook may already have them.
 */
export async function failStalePublishingPosts(admin: SupabaseClient): Promise<number> {
  const cutoff = new Date(Date.now() - SOCIAL_PUBLISHING_STALE_MINUTES * 60_000).toISOString();
  const { data } = await admin
    .from("social_posts")
    .update({
      status: "failed",
      error: "Publishing was interrupted. Check the Page before retrying, in case it went up.",
      updated_at: new Date().toISOString(),
    })
    .eq("status", "publishing")
    .lt("updated_at", cutoff)
    .select("id");
  return data?.length ?? 0;
}
