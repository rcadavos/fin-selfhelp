/**
 * Post photos in the `social-post-images` bucket. Pure, so the composer and the
 * server actions check files the same way.
 */

import {
  SOCIAL_IMAGE_BUCKET,
  SOCIAL_IMAGE_EXTENSIONS,
  SOCIAL_IMAGE_MAX_BYTES,
  SOCIAL_IMAGE_MIME_TYPES,
} from "@/lib/constants/social";

type SocialImageMime = (typeof SOCIAL_IMAGE_MIME_TYPES)[number];

export function isSocialImageMime(type: string): type is SocialImageMime {
  return (SOCIAL_IMAGE_MIME_TYPES as readonly string[]).includes(type);
}

/** Why the file can't be used, or null when it can. */
export function validateSocialImageFile(file: { type: string; size: number }): string | null {
  if (!file.size) return "That file is empty.";
  if (!isSocialImageMime(file.type)) return "Use a JPEG, PNG or GIF image.";
  if (file.size > SOCIAL_IMAGE_MAX_BYTES) {
    return `Images can be up to ${Math.round(SOCIAL_IMAGE_MAX_BYTES / (1024 * 1024))} MB.`;
  }
  return null;
}

/** Where a new upload goes: one folder per month, a random name. */
export function socialImageObjectPath(type: SocialImageMime, now = new Date()): string {
  const month = `${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
  return `${month}/${crypto.randomUUID()}.${SOCIAL_IMAGE_EXTENSIONS[type]}`;
}

function publicPrefix(): string | null {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim().replace(/\/+$/, "");
  return base ? `${base}/storage/v1/object/public/${SOCIAL_IMAGE_BUCKET}/` : null;
}

/** The object's path when `url` is one of our uploads, else null (an older post's outside link, say). */
export function socialImagePathFromUrl(url: string | null | undefined): string | null {
  const prefix = publicPrefix();
  if (!url || !prefix || !url.startsWith(prefix)) return null;
  const path = decodeURIComponent(url.slice(prefix.length).split("?")[0]);
  return path && !path.includes("..") ? path : null;
}
