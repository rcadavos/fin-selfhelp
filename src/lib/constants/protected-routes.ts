/**
 * Which route trees require a signed-in user.
 *
 * Single source of truth for `src/middleware.ts`. The gate lives in middleware
 * rather than in each layout because only middleware sees the pathname, which is
 * what makes both the `?next=` round-trip and the public exemptions below
 * expressible at all.
 *
 * This covers GET navigation only. Server Actions are resolved from the
 * `Next-Action` header against the build manifest rather than from the URL, so
 * they are NOT protected by anything here — every action that touches user data
 * must still check the session itself.
 */

/** Route prefixes that require a session. */
export const PROTECTED_ROUTE_PREFIXES = ["/dashboard", "/account", "/admin", "/setup"] as const;

/**
 * Paths inside a protected prefix that are nonetheless public.
 *
 * These are addressed by an unguessable single-use token and are sent to people
 * who may have no account at all, so bouncing them to /login breaks the flow
 * they were invited into. The token is the credential.
 */
export const PUBLIC_ROUTE_EXEMPTIONS = ["/dashboard/receivables/invite"] as const;

function matchesPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

/** True when `pathname` needs a signed-in user. */
export function isProtectedRoute(pathname: string): boolean {
  if (PUBLIC_ROUTE_EXEMPTIONS.some((p) => matchesPrefix(pathname, p))) return false;
  return PROTECTED_ROUTE_PREFIXES.some((p) => matchesPrefix(pathname, p));
}
