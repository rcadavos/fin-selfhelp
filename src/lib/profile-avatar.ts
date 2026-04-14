export const AVATAR_BUCKET = "avatars";

export const MAX_AVATAR_BYTES = 2 * 1024 * 1024;

export const ALLOWED_AVATAR_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

export function avatarObjectPath(userId: string): string {
  return `${userId}/avatar`;
}

export function validateAvatarFile(file: File): string | null {
  if (!file.size) return "Choose an image file.";
  if (file.size > MAX_AVATAR_BYTES) return "Image must be 2MB or smaller.";
  if (!ALLOWED_AVATAR_MIME_TYPES.includes(file.type as (typeof ALLOWED_AVATAR_MIME_TYPES)[number])) {
    return "Use a JPEG, PNG, or WebP image.";
  }
  return null;
}
