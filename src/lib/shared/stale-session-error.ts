/**
 * Structural on purpose: the web and mobile apps each install their own
 * `@supabase/supabase-js`, so importing its `AuthError` class here would only match one.
 */
type AuthErrorLike = { message?: string; code?: string | number };

/** True when cookies/session reference a refresh token GoTrue no longer accepts. */
export function isStaleRefreshTokenError(
  error: AuthErrorLike | null | undefined
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
