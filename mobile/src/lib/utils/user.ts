import type { User } from "@supabase/supabase-js";

function metaString(user: User, key: string): string {
  const value = (user.user_metadata as Record<string, unknown> | undefined)?.[key];
  return typeof value === "string" ? value.trim() : "";
}

/** Full name from the profile metadata, else the email's local part. */
export function getDisplayName(user: User | null): string {
  if (!user) return "";
  return metaString(user, "full_name") || metaString(user, "name") || (user.email ?? "").split("@")[0];
}

export function getFirstName(user: User | null): string {
  return getDisplayName(user).split(/\s+/)[0] ?? "";
}

/** Same precedence as the web: the app's own avatar first, then the OAuth provider's. */
export function getAvatarUrl(user: User | null): string | null {
  if (!user) return null;
  return (
    metaString(user, "app_avatar_url") ||
    metaString(user, "avatar_url") ||
    metaString(user, "picture") ||
    null
  );
}

export function getGreeting(date = new Date()): string {
  const hour = date.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}
