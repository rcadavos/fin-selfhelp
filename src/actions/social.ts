"use server";

import { generateText } from "ai";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { requireAdminUser } from "@/lib/auth/require-admin";
import { getFacebookConfig, fetchFacebookPage, fetchRecentFacebookPosts } from "@/lib/social/facebook";
import { SOCIAL_POST_COLUMNS, mapSocialPostRow, publishSocialPost } from "@/lib/social/posts";
import {
  isSocialImageMime,
  socialImageObjectPath,
  socialImagePathFromUrl,
  validateSocialImageFile,
} from "@/lib/social/images";
import { isAiConfigured, resolveChatModelId } from "@/lib/ai/gateway";
import { buildProductFacts } from "@/lib/ai/prospect-system-prompt";
import { getSubscriptionPlans } from "@/actions/subscription-plan";
import { SUBSCRIPTION_PLAN_FALLBACK, SUBSCRIPTION_PREMIUM_FALLBACK } from "@/lib/query/subscription-plan";
import { getLocalDateTimeInTimeZone } from "@/lib/reminder-release-time";
import { PRODUCT_NAME } from "@/lib/constants/prospect-chat";
import {
  META_ENV,
  META_GRAPH_API_VERSION,
  SOCIAL_AI_DRAFT_COUNT,
  SOCIAL_AI_DRAFT_SEPARATOR,
  SOCIAL_AI_MAX_OUTPUT_TOKENS,
  SOCIAL_AI_NOTES_MAX_CHARS,
  SOCIAL_AUTOPUBLISH_SETTING_KEY,
  SOCIAL_IMAGE_BUCKET,
  SOCIAL_MESSAGE_MAX_CHARS,
  SOCIAL_POST_PILLARS,
  SOCIAL_TIME_ZONE,
} from "@/lib/constants/social";
import type {
  FacebookPageOverview,
  SocialPost,
  SocialPostInput,
  SocialSettings,
} from "@/types/social.types";

function errorMessage(e: unknown, fallback: string): string {
  return e instanceof Error ? e.message : fallback;
}

/** Whether auto-publish is on. Missing row means on: scheduling a post is already the decision to post it. */
async function readAutopublish(): Promise<boolean> {
  const admin = createServiceRoleClient();
  const { data } = await admin
    .from("app_settings")
    .select("value")
    .eq("key", SOCIAL_AUTOPUBLISH_SETTING_KEY)
    .maybeSingle();
  return data?.value !== false && data?.value !== "false";
}

export async function getSocialSettings(): Promise<{ settings: SocialSettings | null; error?: string }> {
  const auth = await requireAdminUser();
  if (!auth.ok) return { settings: null, error: auth.error };
  try {
    return {
      settings: {
        pageIdSet: Boolean(process.env[META_ENV.pageId]?.trim()),
        tokenSet: Boolean(process.env[META_ENV.token]?.trim()),
        appSecretSet: Boolean(process.env[META_ENV.appSecret]?.trim()),
        cronSecretSet: Boolean(process.env.CRON_SECRET?.trim()),
        aiConfigured: isAiConfigured(),
        autopublish: await readAutopublish(),
        graphApiVersion: META_GRAPH_API_VERSION,
      },
    };
  } catch (e) {
    return { settings: null, error: errorMessage(e, "Couldn't load the settings.") };
  }
}

export async function setSocialAutopublish(enabled: boolean): Promise<{ error?: string }> {
  const auth = await requireAdminUser();
  if (!auth.ok) return { error: auth.error };
  try {
    const admin = createServiceRoleClient();
    const { error } = await admin.from("app_settings").upsert({
      key: SOCIAL_AUTOPUBLISH_SETTING_KEY,
      value: enabled,
      updated_at: new Date().toISOString(),
      updated_by: auth.userId,
    });
    return error ? { error: error.message } : {};
  } catch (e) {
    return { error: errorMessage(e, "Couldn't change auto-publish.") };
  }
}

/** The live Page: cover, profile picture, followers and latest posts. Errors come back as a status, not a throw. */
export async function getFacebookPageOverview(): Promise<FacebookPageOverview> {
  const auth = await requireAdminUser();
  if (!auth.ok) return { status: "error", error: auth.error };
  if (!getFacebookConfig()) return { status: "not-configured" };
  try {
    const page = await fetchFacebookPage();
    try {
      const posts = await fetchRecentFacebookPosts();
      return { status: "ok", page, posts, postsError: null };
    } catch (e) {
      return { status: "ok", page, posts: [], postsError: errorMessage(e, "Couldn't load recent posts.") };
    }
  } catch (e) {
    return { status: "error", error: errorMessage(e, "Couldn't reach Facebook.") };
  }
}

export async function listSocialPosts(): Promise<{ posts: SocialPost[]; error?: string }> {
  const auth = await requireAdminUser();
  if (!auth.ok) return { posts: [], error: auth.error };
  try {
    const admin = createServiceRoleClient();
    const { data, error } = await admin
      .from("social_posts")
      .select(SOCIAL_POST_COLUMNS)
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) return { posts: [], error: error.message };
    return { posts: (data ?? []).map(mapSocialPostRow) };
  } catch (e) {
    return { posts: [], error: errorMessage(e, "Couldn't load posts.") };
  }
}

function normalizeUrl(raw: string | null | undefined, label: string): { value: string | null } | { error: string } {
  const value = raw?.trim();
  if (!value) return { value: null };
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.protocol !== "http:") return { error: `${label} must start with https://` };
    return { value: url.toString() };
  } catch {
    return { error: `${label} isn't a valid web address.` };
  }
}

/** Creates or edits a draft or scheduled post. Published and publishing posts can't change. */
export async function saveSocialPost(input: SocialPostInput): Promise<{ post?: SocialPost; error?: string }> {
  const auth = await requireAdminUser();
  if (!auth.ok) return { error: auth.error };

  const message = input.message.trim();
  if (!message) return { error: "Write the post first." };
  if (message.length > SOCIAL_MESSAGE_MAX_CHARS) {
    return { error: `Keep it under ${SOCIAL_MESSAGE_MAX_CHARS.toLocaleString()} characters.` };
  }
  const link = normalizeUrl(input.link, "The link");
  if ("error" in link) return { error: link.error };
  const image = normalizeUrl(input.imageUrl, "The image address");
  if ("error" in image) return { error: image.error };

  let scheduledFor: string | null = null;
  if (input.scheduledFor) {
    const when = new Date(input.scheduledFor);
    if (Number.isNaN(when.getTime())) return { error: "Pick a date and time." };
    scheduledFor = when.toISOString();
  }
  if (input.status === "scheduled") {
    if (!scheduledFor) return { error: "Pick when it should go out." };
    if (new Date(scheduledFor).getTime() <= Date.now()) {
      return { error: "That time has passed. Pick a later one, or use Publish now." };
    }
  }

  const fields = {
    message,
    link: link.value,
    image_url: image.value,
    pillar: input.pillar ?? null,
    status: input.status,
    scheduled_for: scheduledFor,
    error: null,
    updated_at: new Date().toISOString(),
  };

  try {
    const admin = createServiceRoleClient();
    if (input.id) {
      const { data: before } = await admin
        .from("social_posts")
        .select("image_url")
        .eq("id", input.id)
        .maybeSingle();
      const { data, error } = await admin
        .from("social_posts")
        .update(fields)
        .eq("id", input.id)
        .in("status", ["draft", "scheduled", "failed"])
        .select(SOCIAL_POST_COLUMNS)
        .maybeSingle();
      if (error) return { error: error.message };
      if (!data) return { error: "This post has already gone out, so it can't be edited." };
      if (before?.image_url && before.image_url !== image.value) {
        await removeUnusedSocialImages(admin, [before.image_url]);
      }
      return { post: mapSocialPostRow(data) };
    }
    const { data, error } = await admin
      .from("social_posts")
      .insert({ ...fields, created_by: auth.userId })
      .select(SOCIAL_POST_COLUMNS)
      .single();
    if (error) return { error: error.message };
    return { post: mapSocialPostRow(data) };
  } catch (e) {
    return { error: errorMessage(e, "Couldn't save the post.") };
  }
}

/** Removes it from the queue. A published post stays on Facebook. */
export async function deleteSocialPost(id: string): Promise<{ error?: string }> {
  const auth = await requireAdminUser();
  if (!auth.ok) return { error: auth.error };
  try {
    const admin = createServiceRoleClient();
    const { data, error } = await admin
      .from("social_posts")
      .delete()
      .eq("id", id)
      .neq("status", "publishing")
      .select("image_url");
    if (error) return { error: error.message };
    // A published post's photo is safe to drop too: Facebook keeps its own copy.
    await removeUnusedSocialImages(admin, (data ?? []).map((row) => row.image_url));
    return {};
  } catch (e) {
    return { error: errorMessage(e, "Couldn't delete the post.") };
  }
}

/**
 * A one-time address the composer uploads a photo to, straight to Storage, so the
 * file never passes through a server action (and its 1 MB body limit).
 */
export async function createSocialImageUpload(file: {
  type: string;
  size: number;
}): Promise<{ upload?: { path: string; token: string; publicUrl: string }; error?: string }> {
  const auth = await requireAdminUser();
  if (!auth.ok) return { error: auth.error };
  const invalid = validateSocialImageFile(file);
  if (invalid || !isSocialImageMime(file.type)) return { error: invalid ?? "Use a JPEG, PNG or GIF image." };
  try {
    const bucket = createServiceRoleClient().storage.from(SOCIAL_IMAGE_BUCKET);
    const { data, error } = await bucket.createSignedUploadUrl(socialImageObjectPath(file.type));
    if (error || !data) return { error: error?.message ?? "Couldn't start the upload." };
    const { publicUrl } = bucket.getPublicUrl(data.path).data;
    return { upload: { path: data.path, token: data.token, publicUrl } };
  } catch (e) {
    return { error: errorMessage(e, "Couldn't start the upload.") };
  }
}

/** Drops photos the composer uploaded but no post kept (replaced, removed, or the dialog was cancelled). */
export async function discardSocialImages(urls: string[]): Promise<{ error?: string }> {
  const auth = await requireAdminUser();
  if (!auth.ok) return { error: auth.error };
  try {
    await removeUnusedSocialImages(createServiceRoleClient(), urls);
    return {};
  } catch (e) {
    return { error: errorMessage(e, "Couldn't remove the images.") };
  }
}

/** Removes our uploads among `urls` that no post still uses. Outside links are ignored. */
async function removeUnusedSocialImages(
  admin: ReturnType<typeof createServiceRoleClient>,
  urls: (string | null | undefined)[],
): Promise<void> {
  const candidates = [...new Set(urls.filter((u): u is string => Boolean(socialImagePathFromUrl(u))))];
  if (candidates.length === 0) return;
  const { data: inUse } = await admin.from("social_posts").select("image_url").in("image_url", candidates);
  const used = new Set((inUse ?? []).map((row) => row.image_url as string));
  const paths = candidates
    .filter((u) => !used.has(u))
    .map((u) => socialImagePathFromUrl(u))
    .filter((p): p is string => Boolean(p));
  if (paths.length > 0) await admin.storage.from(SOCIAL_IMAGE_BUCKET).remove(paths);
}

export async function publishSocialPostNow(id: string): Promise<{ post?: SocialPost; error?: string }> {
  const auth = await requireAdminUser();
  if (!auth.ok) return { error: auth.error };
  if (!getFacebookConfig()) return { error: `Connect Facebook first: set ${META_ENV.pageId} and ${META_ENV.token}.` };
  try {
    const result = await publishSocialPost(createServiceRoleClient(), id, ["draft", "scheduled", "failed"]);
    return result.ok ? { post: result.post } : { error: result.error };
  } catch (e) {
    return { error: errorMessage(e, "Couldn't publish the post.") };
  }
}

/** A few fresh post drafts for one content pillar, written only from the product fact sheet. */
export async function draftSocialPostsWithAi(input: {
  pillar: string;
  notes?: string;
}): Promise<{ drafts: string[]; error?: string }> {
  const auth = await requireAdminUser();
  if (!auth.ok) return { drafts: [], error: auth.error };
  if (!isAiConfigured()) return { drafts: [], error: "AI isn't configured. Add AI_GATEWAY_API_KEY to use it." };

  const pillar = SOCIAL_POST_PILLARS.find((p) => p.id === input.pillar) ?? SOCIAL_POST_PILLARS[0];
  const notes = input.notes?.trim().slice(0, SOCIAL_AI_NOTES_MAX_CHARS) || "None.";

  try {
    const plans = await getSubscriptionPlans();
    const facts = buildProductFacts({
      pro: plans.pro ?? SUBSCRIPTION_PLAN_FALLBACK,
      premium: plans.premium ?? SUBSCRIPTION_PREMIUM_FALLBACK,
    });
    const { ymd } = getLocalDateTimeInTimeZone(new Date(), SOCIAL_TIME_ZONE);

    const { text } = await generateText({
      model: resolveChatModelId(),
      instructions: `You write Facebook posts for the ${PRODUCT_NAME} Page. ${PRODUCT_NAME} is a personal finance app for people in the Philippines.

Rules:
- Use only the facts below. Never invent features, prices, discounts, dates, statistics or testimonials.
- Everyday money habits only (budgeting, paying bills on time, saving). No investment, loan or tax-filing advice.
- Each post is 30 to 90 words of plain text in short lines, with at most two emojis, no hashtags and no markdown.
- English with a light Filipino touch (sweldo, kinsenas, katapusan) suits the audience, unless the notes ask for another language.
- End with a soft call to action. Don't write a web address: the link is attached separately.
- Write ${SOCIAL_AI_DRAFT_COUNT} posts that differ in angle. Put a line containing only ${SOCIAL_AI_DRAFT_SEPARATOR} between them. Output only the posts.

Facts about ${PRODUCT_NAME}:
${facts}`,
      prompt: `Theme: ${pillar.label}. ${pillar.description}
Today's date in Manila: ${ymd}.
Notes from the team: ${notes}`,
      maxOutputTokens: SOCIAL_AI_MAX_OUTPUT_TOKENS,
      temperature: 0.8,
    });

    const drafts = text
      .split(new RegExp(`^\\s*${SOCIAL_AI_DRAFT_SEPARATOR}\\s*$`, "m"))
      .map((d) => d.trim())
      .filter(Boolean)
      .slice(0, SOCIAL_AI_DRAFT_COUNT);
    if (drafts.length === 0) return { drafts: [], error: "The AI came back empty. Try again." };
    return { drafts };
  } catch (e) {
    return { drafts: [], error: errorMessage(e, "Couldn't write drafts.") };
  }
}
