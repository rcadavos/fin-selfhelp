import type { AuthError } from "@supabase/supabase-js";

/** True when cookies/session reference a refresh token GoTrue no longer accepts. */
export function isStaleRefreshTokenError(
  error: AuthError | null | undefined
): boolean {
  if (!error) return false;
  const msg = error.message?.toLowerCase() ?? "";
  const code = String(error.code ?? "").toLowerCase();
  return (
    msg.includes("refresh token") ||
    msg.includes("invalid jwt") ||
    code === "refresh_token_not_found" ||
    code === "invalid_grant"
  );
}
